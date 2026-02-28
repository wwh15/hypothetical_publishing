-- Unify month/year storage as DateTime (first day of month). No backfill; existing data not preserved.

-- Books: replace publication_month (text) + publication_year (int) with publication_date (timestamp)
ALTER TABLE "books" DROP COLUMN IF EXISTS "publication_month";
ALTER TABLE "books" DROP COLUMN IF EXISTS "publication_year";
ALTER TABLE "books" ADD COLUMN "publication_date" TIMESTAMP(3);

-- Sales: replace date (text MM-YYYY) with date (timestamp, first day of month)
ALTER TABLE "sales" DROP COLUMN "date";
ALTER TABLE "sales" ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000';
