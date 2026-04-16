/*
  Warnings:

  - Changed the type of `type` on the `Violation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ViolationType" AS ENUM ('TAB_SWITCH', 'NO_FACE', 'MULTIPLE_FACE', 'LOOK_AWAY', 'BACKGROUND_VOICE');

-- AlterTable
ALTER TABLE "public"."Violation" DROP COLUMN "type",
ADD COLUMN     "type" "public"."ViolationType" NOT NULL;
