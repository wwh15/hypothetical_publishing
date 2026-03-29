-- KENP must be a positive integer (whole number >= 1) for KINDLE_UNLIMITED
ALTER TABLE "sales" DROP CONSTRAINT "sales_kenp_format_check";

ALTER TABLE "sales" ADD CONSTRAINT "sales_kenp_format_check"
  CHECK (
    ("format" = 'KINDLE_UNLIMITED' AND "kenp" IS NOT NULL AND "kenp" >= 1 AND "kenp" = TRUNC("kenp"))
    OR ("format" != 'KINDLE_UNLIMITED' AND "kenp" IS NULL)
  );
