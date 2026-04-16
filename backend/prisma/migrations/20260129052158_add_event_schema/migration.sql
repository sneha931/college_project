-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "processOfDay" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
