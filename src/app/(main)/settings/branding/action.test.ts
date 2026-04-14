import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase auth
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock data layer
const mockSaveBranding = vi.fn();
const mockUpdateLogoPath = vi.fn();
const mockResetBrandingDb = vi.fn();
vi.mock("@/lib/data/branding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/branding")>();
  return {
    ...actual,
    saveBranding: (...args: unknown[]) => mockSaveBranding(...args),
    updateLogoPath: (...args: unknown[]) => mockUpdateLogoPath(...args),
    resetBranding: () => mockResetBrandingDb(),
  };
});

// Mock storage
const mockUploadBrandingLogo = vi.fn();
const mockDeleteBrandingLogo = vi.fn();
const mockGetBrandingLogoSignedUrl = vi.fn();
vi.mock("@/lib/supabase/storage", () => ({
  uploadBrandingLogo: (...args: unknown[]) => mockUploadBrandingLogo(...args),
  deleteBrandingLogo: () => mockDeleteBrandingLogo(),
  getBrandingLogoSignedUrl: (...args: unknown[]) => mockGetBrandingLogoSignedUrl(...args),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateBranding, updateLogo, removeLogo, resetBranding } from "./action";

describe("updateBranding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "#ff0000");
    const result = await updateBranding(fd);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(mockSaveBranding).not.toHaveBeenCalled();
  });

  it("saves branding when authenticated with valid input", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockSaveBranding.mockResolvedValue({
      companyName: "Test", tagline: "Tag", logoPath: null, primaryColor: "#ff0000",
    });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "#ff0000");
    const result = await updateBranding(fd);
    expect(result).toEqual({ success: true });
    expect(mockSaveBranding).toHaveBeenCalledWith({
      companyName: "Test", tagline: "Tag", primaryColor: "#ff0000",
    });
  });

  it("returns validation error for invalid color", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const fd = new FormData();
    fd.set("companyName", "Test");
    fd.set("tagline", "Tag");
    fd.set("primaryColor", "not-a-color");
    const result = await updateBranding(fd);
    expect(result.success).toBe(false);
    expect(mockSaveBranding).not.toHaveBeenCalled();
  });
});

describe("updateLogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when no file provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    const fd = new FormData();
    const result = await updateLogo(fd);
    expect(result).toEqual({ success: false, error: "No file selected." });
  });

  it("calls uploadBrandingLogo and updateLogoPath on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockUploadBrandingLogo.mockResolvedValue({ path: "logo.png" });
    mockGetBrandingLogoSignedUrl.mockResolvedValue({ url: "https://example.com/logo.png" });
    const fd = new FormData();
    fd.set("logo", new File(["data"], "logo.png", { type: "image/png" }));
    const result = await updateLogo(fd);
    expect(result).toEqual({ success: true, logoUrl: "https://example.com/logo.png" });
    expect(mockUpdateLogoPath).toHaveBeenCalledWith("logo.png");
  });
});

describe("removeLogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes logo and sets path to null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockDeleteBrandingLogo.mockResolvedValue({ error: null });
    const result = await removeLogo();
    expect(result).toEqual({ success: true });
    expect(mockUpdateLogoPath).toHaveBeenCalledWith(null);
  });
});

describe("resetBranding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes logo and resets DB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } } });
    mockDeleteBrandingLogo.mockResolvedValue({ error: null });
    const result = await resetBranding();
    expect(result).toEqual({ success: true });
    expect(mockDeleteBrandingLogo).toHaveBeenCalled();
    expect(mockResetBrandingDb).toHaveBeenCalled();
  });
});
