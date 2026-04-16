-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "driveCompletedAt" TIMESTAMP(3),
ADD COLUMN     "feedbackRequestsSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."StudentProfile" ADD COLUMN     "placedCompany" TEXT;

-- CreateTable
CREATE TABLE "public"."EventFeedback" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "interviewReview" TEXT,
    "preparationTopics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventFeedback_eventId_idx" ON "public"."EventFeedback"("eventId");

-- CreateIndex
CREATE INDEX "EventFeedback_studentId_idx" ON "public"."EventFeedback"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventFeedback_eventId_studentId_key" ON "public"."EventFeedback"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "public"."EventFeedback" ADD CONSTRAINT "EventFeedback_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventFeedback" ADD CONSTRAINT "EventFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
