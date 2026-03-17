-- AlterTable
ALTER TABLE "books" ADD COLUMN "asin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_asin_key" ON "books"("asin");
