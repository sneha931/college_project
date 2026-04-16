-- CreateTable
CREATE TABLE "public"."JobPosts" (
    "id" TEXT NOT NULL,
    "companyname" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stipend" TEXT NOT NULL DEFAULT 'unpaid',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosts_pkey" PRIMARY KEY ("id")
);
