/*
  Warnings:

  - A unique constraint covering the columns `[canonicalName]` on the table `authors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `canonicalName` to the `authors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "canonicalName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "authors_canonicalName_key" ON "authors"("canonicalName");
