-- Existing rows were nullable; treat as released until marked pre-release.
UPDATE "books" SET "released" = true WHERE "released" IS NULL;

-- AlterTable
ALTER TABLE "books" ALTER COLUMN "released" SET NOT NULL,
ALTER COLUMN "released" SET DEFAULT true;
