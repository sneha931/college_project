-- CreateEnum
CREATE TYPE "public"."InterviewStatus" AS ENUM ('NOT_SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED');

-- CreateTable
CREATE TABLE "public"."Interview" (
    "id" TEXT NOT NULL,
    "jobMatchingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."InterviewStatus" NOT NULL DEFAULT 'NOT_SCHEDULED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "aiScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "verdict" TEXT,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Violation" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InterviewAnswer" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interview_jobMatchingId_key" ON "public"."Interview"("jobMatchingId");

-- CreateIndex
CREATE INDEX "Violation_interviewId_idx" ON "public"."Violation"("interviewId");

-- AddForeignKey
ALTER TABLE "public"."Interview" ADD CONSTRAINT "Interview_jobMatchingId_fkey" FOREIGN KEY ("jobMatchingId") REFERENCES "public"."JobMatching"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interview" ADD CONSTRAINT "Interview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interview" ADD CONSTRAINT "Interview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Violation" ADD CONSTRAINT "Violation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "public"."Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "public"."Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
