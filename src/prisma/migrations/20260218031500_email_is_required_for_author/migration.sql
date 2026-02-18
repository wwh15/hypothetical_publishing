/*
  Warnings:

  - Made the column `email` on table `authors` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "authors" ALTER COLUMN "email" SET NOT NULL;
