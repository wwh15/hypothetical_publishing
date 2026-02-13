/*
  Warnings:

  - You are about to drop the `_AuthorToBook` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `authorId` to the `books` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_AuthorToBook" DROP CONSTRAINT "_AuthorToBook_A_fkey";

-- DropForeignKey
ALTER TABLE "_AuthorToBook" DROP CONSTRAINT "_AuthorToBook_B_fkey";

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "authorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "date" DROP DEFAULT;

-- DropTable
DROP TABLE "_AuthorToBook";

-- CreateIndex
CREATE INDEX "sales_date_idx" ON "sales"("date");

-- CreateIndex
CREATE INDEX "sales_book_id_date_idx" ON "sales"("book_id", "date");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
