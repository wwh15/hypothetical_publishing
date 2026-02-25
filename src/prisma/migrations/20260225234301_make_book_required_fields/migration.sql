/*
  Warnings:

  - Made the column `isbn13` on table `books` required. This step will fail if there are existing NULL values in that column.
  - Made the column `publication_date` on table `books` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cover_price` on table `books` required. This step will fail if there are existing NULL values in that column.
  - Made the column `print_cost` on table `books` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "books" ALTER COLUMN "isbn13" SET NOT NULL,
ALTER COLUMN "publication_date" SET NOT NULL,
ALTER COLUMN "cover_price" SET NOT NULL,
ALTER COLUMN "print_cost" SET NOT NULL;
