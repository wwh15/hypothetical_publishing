"use client";

import { useState, useRef } from "react";
import { type Branding, BRANDING_DEFAULTS } from "@/lib/data/branding";
import { deriveBrandColors } from "@/lib/branding-colors";
import { updateBranding, updateLogo, removeLogo, resetBranding } from "./action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface BrandingFormProps {
  branding: Branding;
  logoUrl: string | null;
}

export default function BrandingForm({ branding, logoUrl }: BrandingFormProps) {
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewColors = deriveBrandColors(
    /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("tagline", tagline);
    formData.set("primaryColor", primaryColor);

    const result = await updateBranding(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("logo", file);

    const result = await updateLogo(formData);
    if (!result.success) {
      setError(result.error);
    } else {
      // Update logo URL client-side — no page reload needed
      setCurrentLogoUrl(result.logoUrl);
    }
    setLogoUploading(false);
  }

  async function handleLogoRemove() {
    setLogoUploading(true);
    setError(null);

    const result = await removeLogo();
    if (!result.success) {
      setError(result.error);
    } else {
      setCurrentLogoUrl(null);
    }
    setLogoUploading(false);
  }

  async function handleReset() {
    if (!confirm("Reset all branding to defaults? This cannot be undone.")) return;

    setSaving(true);
    setError(null);

    const result = await resetBranding();
    if (!result.success) {
      setError(result.error);
    } else {
      setCompanyName(BRANDING_DEFAULTS.companyName);
      setTagline(BRANDING_DEFAULTS.tagline);
      setPrimaryColor(BRANDING_DEFAULTS.primaryColor);
      setCurrentLogoUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  }

  return (
    <div className="flex flex-col gap-7">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
          Branding updated successfully.
        </div>
      )}

      {/* Company Name */}
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
          className="mt-1.5"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Appears in the navbar, login page, and PDF reports.
        </p>
      </div>

      {/* Tagline */}
      <div>
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          className="mt-1.5"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Shown below the company name on the login page.
        </p>
      </div>

      {/* Logo Upload */}
      <div>
        <Label>Logo</Label>

        {currentLogoUrl ? (
          <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mt-1.5">
            <img
              src={currentLogoUrl}
              alt="Current logo"
              className="h-12 max-w-[200px] object-contain"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogoRemove}
                disabled={logoUploading}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload logo"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors mt-1.5"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {logoUploading ? "Uploading..." : "Drop an image here or click to upload"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPG, or WebP. Max 2MB.
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-label="Upload logo file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoUpload(file);
            e.target.value = "";
          }}
        />

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Displayed in the navbar and login page. Falls back to company name if not set.
        </p>
      </div>

      {/* Primary Color */}
      <div>
        <Label htmlFor="primaryColor">Primary Color</Label>
        <div className="flex items-center gap-3 flex-wrap mt-1.5">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600 cursor-pointer p-0.5"
          />
          <Input
            id="primaryColor"
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            maxLength={7}
            className="w-28 font-mono"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Used for buttons, links, and active states. Hover and text colors are derived automatically.
        </p>

        {/* Live preview */}
        <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" aria-label="Color preview">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Preview
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <span
              style={{
                background: previewColors["--brand-primary"],
                color: previewColors["--brand-primary-text"],
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
            >
              Primary Button
            </span>
            <span
              style={{ color: previewColors["--brand-primary"] }}
              className="text-xs underline"
            >
              Link text
            </span>
            <span
              style={{
                background: previewColors["--brand-primary-light"],
                color: previewColors["--brand-primary"],
              }}
              className="px-2 py-0.5 rounded text-xs"
            >
              Badge
            </span>
            <span className="sr-only">
              Preview of selected brand color {primaryColor}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={saving}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
