-- Kickstarter sale source: no distributor; format limited to print or ebook.

ALTER TYPE "SaleSource" ADD VALUE 'KICKSTARTER';

ALTER TABLE "sales" DROP CONSTRAINT "sales_source_distributor_check";
ALTER TABLE "sales" DROP CONSTRAINT "sales_format_source_distributor_check";

ALTER TABLE "sales" ADD CONSTRAINT "sales_source_distributor_check"
  CHECK (
    ("source" = 'DISTRIBUTOR' AND "distributor" IS NOT NULL)
    OR ("source" = 'HAND_SOLD' AND "distributor" IS NULL)
    OR ("source" = 'KICKSTARTER' AND "distributor" IS NULL)
  );

ALTER TABLE "sales" ADD CONSTRAINT "sales_format_source_distributor_check"
  CHECK (
    ("source" = 'HAND_SOLD' AND "format" = 'PRINT')
    OR ("source" = 'KICKSTARTER' AND "format" IN ('PRINT', 'EBOOK'))
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'INGRAM_SPARK' AND "format" = 'PRINT')
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'AMAZON' AND "format" IN ('PRINT', 'EBOOK', 'KINDLE_UNLIMITED'))
    OR ("source" = 'DISTRIBUTOR' AND "distributor" = 'OTHER' AND "format" IN ('PRINT', 'EBOOK'))
  );
