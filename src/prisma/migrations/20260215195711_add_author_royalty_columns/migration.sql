-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "paid_author_royalty" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "total_author_royalty" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "unpaid_author_royalty" DECIMAL(65,30) NOT NULL DEFAULT 0;
