-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_book_id_fkey";

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
