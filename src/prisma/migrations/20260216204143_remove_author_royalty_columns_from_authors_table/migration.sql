/*
  Warnings:

  - You are about to drop the column `paid_author_royalty` on the `authors` table. All the data in the column will be lost.
  - You are about to drop the column `total_author_royalty` on the `authors` table. All the data in the column will be lost.
  - You are about to drop the column `unpaid_author_royalty` on the `authors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "authors" DROP COLUMN "paid_author_royalty",
DROP COLUMN "total_author_royalty",
DROP COLUMN "unpaid_author_royalty";
