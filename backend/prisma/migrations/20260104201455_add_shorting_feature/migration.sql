/*
  Warnings:

  - You are about to drop the column `eligibility` on the `JobPosts` table. All the data in the column will be lost.
  - The `experience` column on the `StudentProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."JobPosts" DROP COLUMN "eligibility",
ADD COLUMN     "minCGPA" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
ADD COLUMN     "minExperience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "minMarks10" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "minMarks12" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."StudentProfile" DROP COLUMN "experience",
ADD COLUMN     "experience" INTEGER NOT NULL DEFAULT 0;
