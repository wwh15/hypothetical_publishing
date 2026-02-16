/*
  Warnings:

  - You are about to alter the column `publisher_revenue` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `author_royalty` on the `sales` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "publisher_revenue" SET DEFAULT 0,
ALTER COLUMN "publisher_revenue" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "author_royalty" SET DEFAULT 0,
ALTER COLUMN "author_royalty" SET DATA TYPE DECIMAL(65,30);
