/*
  Warnings:

  - You are about to drop the column `author_royalty_rate` on the `books` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('DISTRIBUTOR', 'HAND_SOLD');

-- AlterTable
ALTER TABLE "books" DROP COLUMN "author_royalty_rate",
ADD COLUMN     "cover_price" DECIMAL(65,30),
ADD COLUMN     "dist_author_royalty_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "hand_sold_author_royalty_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
ADD COLUMN     "print_cost" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "source" "SaleSource" NOT NULL DEFAULT 'DISTRIBUTOR';
