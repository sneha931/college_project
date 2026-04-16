/*
  Warnings:

  - You are about to drop the column `role` on the `JobPosts` table. All the data in the column will be lost.
  - Added the required column `jobrole` to the `JobPosts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."JobPosts" DROP COLUMN "role",
ADD COLUMN     "jobrole" TEXT NOT NULL;
