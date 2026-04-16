/*
  Warnings:

  - You are about to drop the column `stipend` on the `JobPosts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."JobPosts" DROP COLUMN "stipend",
ADD COLUMN     "salary" INTEGER NOT NULL DEFAULT 0;
