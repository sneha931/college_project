-- AlterTable
ALTER TABLE "public"."JobPosts" ADD COLUMN     "excelUrl" TEXT,
ADD COLUMN     "shortlistReady" BOOLEAN NOT NULL DEFAULT false;
