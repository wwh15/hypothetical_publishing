-- Use timestamptz for Sale date and timestamps so filtering is timezone-safe (recommended by Postgres).
-- Existing values are treated as UTC so the stored instant does not change.

ALTER TABLE "sales"
  ALTER COLUMN "date" TYPE TIMESTAMPTZ USING "date" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC';
