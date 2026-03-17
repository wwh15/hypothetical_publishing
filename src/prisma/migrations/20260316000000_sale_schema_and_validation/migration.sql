-- Sale schema update: new enums, fields, and validation constraints
-- See spec: sale source, distributor, format, quantity/kenp, currency, paid, no royalty override
-- No backfill: existing sales data is cleared.

-- CreateEnum
CREATE TYPE "Distributor" AS ENUM ('INGRAM_SPARK', 'AMAZON', 'OTHER');
CREATE TYPE "SaleFormat" AS ENUM ('PRINT', 'EBOOK', 'KINDLE_UNLIMITED');

-- Clear existing sales so we can add NOT NULL columns without backfill
DELETE FROM "sales";

-- Add new columns
ALTER TABLE "sales" ADD COLUMN "distributor" "Distributor",
  ADD COLUMN "format" "SaleFormat" NOT NULL,
  ADD COLUMN "kenp" DECIMAL(12,2);

-- Make quantity nullable
ALTER TABLE "sales" ALTER COLUMN "quantity" DROP NOT NULL;

-- Currency default for new rows
ALTER TABLE "sales" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- Drop royalty_overridden
ALTER TABLE "sales" DROP COLUMN IF EXISTS "royalty_overridden";

-- CHECK: distributor required when source = DISTRIBUTOR, null when HAND_SOLD
ALTER TABLE "sales" ADD CONSTRAINT "sales_source_distributor_check"
  CHECK (
    ("source" = 'DISTRIBUTOR' AND "distributor" IS NOT NULL)
    OR ("source" = 'HAND_SOLD' AND "distributor" IS NULL)
  );

-- CHECK: quantity vs format — PRINT/EBOOK require quantity > 0; KINDLE_UNLIMITED requires quantity IS NULL
ALTER TABLE "sales" ADD CONSTRAINT "sales_quantity_format_check"
  CHECK (
    ("format" IN ('PRINT', 'EBOOK') AND "quantity" IS NOT NULL AND "quantity" > 0)
    OR ("format" = 'KINDLE_UNLIMITED' AND "quantity" IS NULL)
  );

-- CHECK: KENP only for KINDLE_UNLIMITED (required, non-negative)
ALTER TABLE "sales" ADD CONSTRAINT "sales_kenp_format_check"
  CHECK (
    ("format" = 'KINDLE_UNLIMITED' AND "kenp" IS NOT NULL AND "kenp" >= 0)
    OR ("format" != 'KINDLE_UNLIMITED' AND "kenp" IS NULL)
  );

-- CHECK: handsold must use USD
ALTER TABLE "sales" ADD CONSTRAINT "sales_handsold_currency_check"
  CHECK ("source" != 'HAND_SOLD' OR "currency" = 'USD');

-- CHECK: format vs distributor/source (Ingram Spark -> print only; Amazon -> print/ebook/kindle; Other -> print/ebook; Handsold -> print)
ALTER TABLE "sales" ADD CONSTRAINT "sales_format_source_distributor_check"
  CHECK (
    ("source" = 'HAND_SOLD' AND "format" = 'PRINT')
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'INGRAM_SPARK' AND "format" = 'PRINT')
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'AMAZON' AND "format" IN ('PRINT', 'EBOOK', 'KINDLE_UNLIMITED'))
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'OTHER' AND "format" IN ('PRINT', 'EBOOK'))
  );

-- CHECK: publisher revenue and author royalty non-negative
ALTER TABLE "sales" ADD CONSTRAINT "sales_revenue_royalty_non_negative"
  CHECK (
    "publisher_revenue_original" >= 0
    AND "publisher_revenue_USD" >= 0
    AND "author_royalty" >= 0
  );
