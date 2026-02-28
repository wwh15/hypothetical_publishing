-- AlterTable
ALTER TABLE "books" ADD COLUMN     "series_id" INTEGER,
ADD COLUMN     "series_order" INTEGER,
ALTER COLUMN "author_royalty_rate" SET DEFAULT 0.5;

-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "series_name_idx" ON "series"("name");

-- CreateIndex
CREATE INDEX "books_series_id_idx" ON "books"("series_id");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
