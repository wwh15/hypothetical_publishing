/*
  Warnings:

  - You are about to drop the column `author_id` on the `books` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_AuthorToBook" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AuthorToBook_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AuthorToBook_B_index" ON "_AuthorToBook"("B");

-- AddForeignKey
ALTER TABLE "_AuthorToBook" ADD CONSTRAINT "_AuthorToBook_A_fkey" FOREIGN KEY ("A") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuthorToBook" ADD CONSTRAINT "_AuthorToBook_B_fkey" FOREIGN KEY ("B") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: copy existing book-author links before dropping author_id
INSERT INTO "_AuthorToBook" ("A", "B") SELECT "author_id", "id" FROM "books";

-- DropForeignKey
ALTER TABLE "books" DROP CONSTRAINT "books_author_id_fkey";

-- DropIndex
DROP INDEX "books_author_id_idx";

-- AlterTable
ALTER TABLE "books" DROP COLUMN "author_id";
