-- Revert author_paid back to paid (keep column name as paid)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'author_paid'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "author_paid" TO "paid";
  END IF;
END $$;
