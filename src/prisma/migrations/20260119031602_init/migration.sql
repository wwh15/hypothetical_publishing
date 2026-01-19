/*
  Warnings:

  - You are about to drop the column `author` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `sales` table. All the data in the column will be lost.
  - The `paid` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `book_id` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sales" DROP COLUMN "author",
DROP COLUMN "title",
ADD COLUMN     "book_id" INTEGER NOT NULL,
ADD COLUMN     "royalty_overridden" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "paid",
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author_id" INTEGER NOT NULL,
    "isbn13" TEXT,
    "isbn10" TEXT,
    "author_royalty_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authors_name_key" ON "authors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "authors_email_key" ON "authors"("email");

-- CreateIndex
CREATE INDEX "authors_name_idx" ON "authors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn13_key" ON "books"("isbn13");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn10_key" ON "books"("isbn10");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_isbn13_idx" ON "books"("isbn13");

-- CreateIndex
CREATE INDEX "books_isbn10_idx" ON "books"("isbn10");

-- CreateIndex
CREATE INDEX "books_author_id_idx" ON "books"("author_id");

-- CreateIndex
CREATE INDEX "sales_book_id_idx" ON "sales"("book_id");

-- CreateIndex
CREATE INDEX "sales_paid_idx" ON "sales"("paid");

-- CreateIndex
CREATE INDEX "sales_date_idx" ON "sales"("date");

-- CreateIndex
CREATE INDEX "sales_book_id_date_idx" ON "sales"("book_id", "date");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
