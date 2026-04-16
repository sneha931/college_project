-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placementEmail" TEXT NOT NULL,
    "profilePic" TEXT NOT NULL,
    "marks10" DOUBLE PRECISION NOT NULL,
    "marks12" DOUBLE PRECISION,
    "diplomaMarks" DOUBLE PRECISION,
    "btechCGPA" DOUBLE PRECISION NOT NULL,
    "resumeUrl" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience" TEXT NOT NULL DEFAULT '0 years',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JobMatching" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "matchedSkills" TEXT[],
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatching_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "public"."StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_placementEmail_key" ON "public"."StudentProfile"("placementEmail");

-- CreateIndex
CREATE INDEX "JobMatching_jobId_idx" ON "public"."JobMatching"("jobId");

-- CreateIndex
CREATE INDEX "JobMatching_studentId_idx" ON "public"."JobMatching"("studentId");

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobMatching" ADD CONSTRAINT "JobMatching_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."JobPosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobMatching" ADD CONSTRAINT "JobMatching_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
