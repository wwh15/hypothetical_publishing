import { Author, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { Decimal } from "decimal.js";
import { normalizeEmail, normalizeString, validateEmail, validateRequiredString } from "../validation";
import { normalize } from "node:path";

export interface AuthorListItem {
  id: number;
  name: string;
  email: string;
  authoredBooks: number;
  totalAuthorRoyalty: number;
  paidAuthorRoyalty: number;
  unpaidAuthorRoyalty: number;
}

export interface AuthorBookItem {
  id: number;
  title: string;
  seriesId?: number;
  seriesOrder?: number;
  ISBN13: number;
  publicationMonth: string;
  publicationYear: string;
  authorRoyaltyRate: number;
  totalSales: number;
  totalAuthorRoyalty: number;
  unpaidAuthorRoyalty: number;
  paidAuthorRoyalty: number;
}

export interface GetAuthorDataParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface GetAuthorsDataResult {
  items: AuthorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAuthorRequest {
  name: string;
  email: string;
}

interface CreateAuthorResponse {
  success: boolean;
  data: Author | null; // Changed from undefined to null for consistency
  error: string | null;
}

export interface UpdateAuthorRequest {
  authorId: number;
  name?: string;
  email?: string;
}

export type NewAuthorInput = Omit<Prisma.AuthorUncheckedCreateInput, 'canonicalName'>;

export type UpdateAuthorResponse =
  | { success: true; data: Author | null; error: null }
  | { success: false; data: null; error: string };

export type DeleteAuthorResponse =
  | { success: true; error: null }
  | { success: false; error: string };

export type GetAuthorByIdResponse =
  | { success: true; data: Author | null; error: null }
  | { success: false; data: null; error: string };

export type GetAuthorBooksResponse =
  | { success: true; data: AuthorBookItem[]; error: null }
  | { success: false; data: null; error: string };

// 1. Define the SQL Column Map
// We use the actual DB column names (snake_case) defined in your @map attributes
const SQL_SORT_MAP: Record<string, string> = {
  id: "a.id",
  name: "a.name",
  email: "a.email",
  authoredBooks: '"authoredBooks"',
  totalAuthorRoyalty: '"totalAuthorRoyalty"',
  paidAuthorRoyalty: '"paidAuthorRoyalty"',
  unpaidAuthorRoyalty: '"unpaidAuthorRoyalty"',
};

// 2. Define the Raw Query Result Shape
interface RawAuthorResult {
  id: number;
  name: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  authoredBooks: number;
  totalAuthorRoyalty: string | number | Prisma.Decimal;
  paidAuthorRoyalty: string | number | Prisma.Decimal;
  unpaidAuthorRoyalty: string | number | Prisma.Decimal;
}

// 3. The Mapping Helper
export function toAuthorListItem(author: RawAuthorResult): AuthorListItem {
  const formatSafe = (val: string | number | Prisma.Decimal): number => {
    if (val === null || val === undefined) return 0;
    // Using decimal.js constructor is the safest way to avoid precision loss
    // before converting to a JS number for the UI.
    // 1. If it's already a Decimal object, it has the .toNumber method
    if (typeof val === "object" && "toNumber" in val) {
      return (val as Prisma.Decimal).toNumber();
    }

    // 2. If it's a string or number, the constructor handles it without 'any'
    return new Decimal(val).toNumber();
  };

  return {
    id: author.id,
    name: author.name,
    email: author.email ?? "",
    authoredBooks: author.authoredBooks,
    totalAuthorRoyalty: formatSafe(author.totalAuthorRoyalty),
    paidAuthorRoyalty: formatSafe(author.paidAuthorRoyalty),
    unpaidAuthorRoyalty: formatSafe(author.unpaidAuthorRoyalty),
  };
}

// 4. The Main Query Function
export async function asyncGetAuthorsData({
  search,
  page = 1,
  pageSize = 20,
  sortBy = "name",
  sortDir = "asc",
}: GetAuthorDataParams): Promise<GetAuthorsDataResult> {
  const currentPage = Math.max(1, page);
  const limit = Math.max(1, Math.min(pageSize, 100));
  const offset = (currentPage - 1) * limit;

  const searchPattern = search ? `%${search}%` : "%";
  const sortColumn = SQL_SORT_MAP[sortBy] || "a.name";
  const direction =
    sortDir.toLowerCase() === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  /**
   * IMPORTANT: We use database-level names here:
   * - Tables: "authors", "books", "sales"
   * - Columns: "author_id", "book_id", "author_royalty", "created_at"
   */
  const authors = await prisma.$queryRaw<RawAuthorResult[]>`
    SELECT 
      a.id, 
      a.name, 
      a.email,
      a.created_at AS "createdAt",
      a.updated_at AS "updatedAt",
      COUNT(DISTINCT b.id)::int AS "authoredBooks",
      SUM(COALESCE(s.author_royalty, 0)) AS "totalAuthorRoyalty",
      SUM(CASE WHEN s.paid = true THEN COALESCE(s.author_royalty, 0) ELSE 0 END) AS "paidAuthorRoyalty",
      SUM(CASE WHEN s.paid = false THEN COALESCE(s.author_royalty, 0) ELSE 0 END) AS "unpaidAuthorRoyalty"
    FROM authors a
    LEFT JOIN books b ON b."authorId" = a.id
    LEFT JOIN sales s ON s.book_id = b.id
    WHERE a.name ILIKE ${searchPattern} OR a.email ILIKE ${searchPattern}
    GROUP BY a.id, a.name, a.email, a.created_at, a.updated_at
    ORDER BY ${Prisma.raw(sortColumn)} ${direction}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalCount = await prisma.author.count({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
  });

  return {
    items: authors.map(toAuthorListItem),
    total: totalCount,
    page: currentPage,
    pageSize: limit,
  };
}

export async function asyncGetAllAuthors(): Promise<Author[]> {
  const authors = await prisma.author.findMany({
    orderBy: { name: "asc" },
  });
  return authors;
}

export async function asyncGetAuthorById(
  id: number
): Promise<GetAuthorByIdResponse> {
  try {
    const author = await prisma.author.findUnique({
      where: { id: id },
    });

    // If author is null, it's still a "successful" DB query, just no result
    return { success: true, data: author, error: null };
  } catch (err) {
    // If it hits the catch block, a real DB error happened
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch author",
    };
  }
}

export async function asyncGetAuthorBooks(
  id: number
): Promise<GetAuthorBooksResponse> {
  try {
    // 1. Fetch books with their sales records included
    const books = await prisma.book.findMany({
      where: { authorId: id },
      include: {
        sales: true,
      },
      orderBy: [
        { title: "asc" },
        { seriesId: "asc" },
        { seriesOrder: "asc" },
        { publicationDate: "asc" },
      ],
    });

    // 2. Map and Calculate totals for each book
    const data: AuthorBookItem[] = books.map((book) => {
      // Calculate sums from the sales array
      const totalSales = book.sales.reduce((sum, s) => sum + s.quantity, 0);

      const totalAuthorRoyalty = book.sales.reduce(
        (sum, s) => sum.plus(new Decimal(s.authorRoyalty.toString())),
        new Decimal(0)
      );

      const totalPaid = book.sales
        .filter((s) => s.paid)
        .reduce(
          (sum, s) => sum.plus(new Decimal(s.authorRoyalty.toString())),
          new Decimal(0)
        );

      const totalUnpaid = totalAuthorRoyalty.minus(totalPaid);

      return {
        id: book.id,
        title: book.title,
        seriesId: book.seriesId ?? undefined,
        seriesOrder: book.seriesOrder ?? undefined,
        ISBN13: Number(book.isbn13) || 0, // Ensure numeric for your interface
        publicationMonth: book.publicationDate.toLocaleString("default", { month: "long" }),
        publicationYear: book.publicationDate.getFullYear().toString(),
        authorRoyaltyRate: Number(book.distAuthorRoyaltyRate) * 100, // Display as %
        totalSales,
        totalAuthorRoyalty: totalAuthorRoyalty.toNumber(),
        paidAuthorRoyalty: totalPaid.toNumber(),
        unpaidAuthorRoyalty: totalUnpaid.toNumber(),
      };
    });

    return { success: true, data, error: null };
  } catch (err) {
    return {
      success: false,
      data: null,
      error:
        err instanceof Error ? err.message : "Failed to fetch author books",
    };
  }
}

/**
 * Generates a unique "fingerprint" for authors.
 * Constraint: Assumes "First Last" format for all inputs.
 * Handles: "Dr. Bob Smith", "Alice, Bob, and Charlie", "Sanderson; Jordan".
 */
export function getCanonicalAuthorKey(input: string | null | undefined): string {
  if (!input) return "";

  // 1. SPLIT: Divide on any common author list separator.
  // Splits on: ; | & | and | comma (with optional space).
  const parts = input.split(/;| & | &|\band\b|,/i);

  const cleanAuthors = parts
    .map((rawName) => {
      let name = rawName.toLowerCase();

      // 2. HONORIFICS: Strip titles and academic suffixes (dr., phd, etc.)
      name = name.replace(/\b(phd|dr|md|jr|sr|iii|ii|mfa|prof|mr|ms|mrs)\b\.?/g, "");

      // 3. PUNCTUATION: Remove all non-alphanumeric characters (including commas now)
      name = name.replace(/[^a-z0-9\s]/g, "");

      // 4. NORMALIZE: Trim edges and collapse internal double-spaces
      return name.trim().replace(/\s+/g, " ");
    })
    // 5. FILTER: Remove empty strings from the list
    .filter((name) => name.length > 0)
    // 6. SORT: Alphabetize so "Bob|Alice" and "Alice|Bob" are identical
    .sort();

  // 7. JOIN: Create a unique pipe-delimited string
  return cleanAuthors.join("|");
}

export async function asyncAddAuthor(
  rawData: NewAuthorInput
): Promise<CreateAuthorResponse> {
  // 1. NORMALIZE: Clean strings before any logic or database hits
  const cleanEmail = normalizeEmail(rawData.email);
  const cleanName = normalizeString(rawData.name); // Basic cleanup for display
  const fingerprint = getCanonicalAuthorKey(rawData.name); // The unique search key
  console.log(fingerprint)

  // 2. VALIDATE: Check the standardized strings
  const validatedEmail = validateEmail(cleanEmail);
  if (!validatedEmail.success) {
    return {
      success: false,
      error: validatedEmail.error,
      data: null,
    };
  }

  const validatedName = validateRequiredString(cleanName, "Author Name");
  if (!validatedName.success) {
    return {
      success: false,
      error: validatedName.error,
      data: null,
    };
  }

  // 3. EXISTENCE CHECK: Use the canonical fingerprint
  // This catches "Smith, Jane" vs "Jane Smith" and prevents duplicates
  try {
    const existingAuthor = await prisma.author.findUnique({
      where: {
        canonicalName: fingerprint,
      },
    });

    if (existingAuthor) {
      return {
        success: false,
        error: `An author record for "${cleanName}" already exists as "${existingAuthor.name}".`,
        data: null,
      };
    }

    // 4. CREATE: Store normalized values and the fingerprint
    const newAuthor = await prisma.author.create({
      data: {
        ...rawData,
        name: cleanName,
        email: cleanEmail,
        canonicalName: fingerprint,
      },
    });

    return { success: true, data: newAuthor, error: null };
  } catch (err) {
    console.error("Database error in asyncAddAuthor:", err);
    return {
      success: false,
      data: null,
      error: "Failed to create author in database.",
    };
  }
}

export async function asyncUpdateAuthor(
  request: UpdateAuthorRequest
): Promise<UpdateAuthorResponse> {
  const { authorId, name, email } = request;
  const updateData: Prisma.AuthorUpdateInput = {};

  // 1. Handle Email Update (Just normalize and save)
  if (email) {
    const cleanEmail = normalizeEmail(email);
    const validatedEmail = validateEmail(cleanEmail);
    
    if (!validatedEmail.success) {
      return { success: false, error: validatedEmail.error, data: null };
    }

    updateData.email = cleanEmail;
  }

  // 2. Handle Name Update (Still needs the fingerprint sync)
  if (name) {
    const cleanName = normalizeString(name);
    const validatedName = validateRequiredString(cleanName, "Author Name");
    
    if (!validatedName.success) {
      return { success: false, error: validatedName.error, data: null };
    }

    const newFingerprint = getCanonicalAuthorKey(cleanName);

    // Check for name collisions because canonicalName is @unique
    const collision = await prisma.author.findFirst({
      where: {
        canonicalName: newFingerprint,
        id: { not: authorId },
      },
    });

    if (collision) {
      return { 
        success: false, 
        error: "This author name (or a variation of it) already exists.", 
        data: null 
      };
    }

    updateData.name = cleanName;
    updateData.canonicalName = newFingerprint;
  }

  // 3. Prevent empty updates
  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No changes provided.", data: null };
  }

  try {
    const updatedAuthor = await prisma.author.update({
      where: { id: authorId },
      data: updateData,
    });
    return { success: true, data: updatedAuthor, error: null };
  } catch (err) {
    console.error("Update Error:", err);
    return { success: false, data: null, error: "Failed to update author." };
  }
}

export async function asyncDeleteAuthor(
  id: number
): Promise<DeleteAuthorResponse> {
  try {
    /**
     * NOTE: If your database has foreign key constraints,
     * this will fail if the author has associated books/sales.
     * You may need to delete associated records first or ensure
     * 'ON DELETE CASCADE' is set in your Prisma schema.
     */
    await prisma.author.delete({
      where: { id: id },
    });

    return { success: true, error: null };
  } catch (err) {
    // Check for Prisma's P2025 (Record not found) error
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { success: false, error: "Author not found." };
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete author.",
    };
  }
}
