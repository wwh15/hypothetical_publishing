-- Repair: ensure publication_date exists on books and date exists on sales (DateTime).
-- Safe to run even if columns already exist (e.g. after unify migration).

-- Books: add publication_date if missing
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "publication_date" TIMESTAMP(3);

-- Sales: ensure date column exists as TIMESTAMP(3)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'date'
  ) THEN
    ALTER TABLE "sales" ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'date'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "sales" DROP COLUMN "date";
    ALTER TABLE "sales" ADD COLUMN "date" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00.000';
  END IF;
END $$;
