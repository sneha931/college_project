-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "public"."JobPosts" ADD COLUMN     "externalJobId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."AttendanceSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_sessionId_key" ON "public"."AttendanceSession"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceSession_eventId_idx" ON "public"."AttendanceSession"("eventId");

-- CreateIndex
CREATE INDEX "Attendance_sessionId_idx" ON "public"."Attendance"("sessionId");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "public"."Attendance"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_sessionId_key" ON "public"."Attendance"("studentId", "sessionId");

-- CreateIndex
CREATE INDEX "Event_jobId_idx" ON "public"."Event"("jobId");

-- CreateIndex
CREATE INDEX "JobPosts_isExternal_idx" ON "public"."JobPosts"("isExternal");

-- CreateIndex
CREATE INDEX "JobPosts_isApproved_idx" ON "public"."JobPosts"("isApproved");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSession" ADD CONSTRAINT "AttendanceSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
