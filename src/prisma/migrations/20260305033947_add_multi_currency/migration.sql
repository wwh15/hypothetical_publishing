/*
  Warnings:

  - You are about to drop the column `publisher_revenue` on the `sales` table. All the data in the column will be lost.
  - Added the required column `currency` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sales" DROP COLUMN "publisher_revenue",
ADD COLUMN     "currency" VARCHAR(3) NOT NULL,
ADD COLUMN     "publisher_revenue_USD" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "publisher_revenue_original" DECIMAL(65,30) NOT NULL DEFAULT 0;
