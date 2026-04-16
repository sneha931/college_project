import prisma from "../config/prismaconfig.js";
import Logger from "../logger.js";

export interface MatchResult {
  studentId: string;
  studentName: string;
  matchedSkills: string[];
  matchScore: number;
  autoApplied: boolean;
}

export interface MatchingEngineResult {
  jobId: string;
  totalStudents: number;
  matchedStudents: number;
  autoAppliedCount: number;
  matches: MatchResult[];
}

const AUTO_APPLY_THRESHOLD = 70;

/**
 * Calculate skill match percentage
 * Formula: (matchedSkills / totalRequiredSkills) * 100
 */
const calculateMatchScore = (
  studentSkills: string[],
  requiredSkills: string[],
): { matchedSkills: string[]; score: number } => {
  if (requiredSkills.length === 0) {
    return { matchedSkills: [], score: 0 };
  }

  // Case-insensitive skill matching
  const normalizedStudentSkills = studentSkills.map((s) =>
    s.toLowerCase().trim(),
  );
  const normalizedRequiredSkills = requiredSkills.map((s) =>
    s.toLowerCase().trim(),
  );

  const matchedSkills = requiredSkills.filter((reqSkill) =>
    normalizedStudentSkills.includes(reqSkill.toLowerCase().trim()),
  );

  const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return { matchedSkills, score };
};

/**
 * Send notification to student
 */
const sendNotification = async (
  userId: string,
  title: string,
  message: string,
) => {
  try {
    // Check if notification model exists in Prisma client
    if ("notification" in prisma) {
      await (prisma as any).notification.create({
        data: {
          userId,
          title,
          message,
          isRead: false,
        },
      });
      Logger.info("Notification sent", { userId, title });
    } else {
      Logger.warn("Notification model not available, skipping notification", {
        userId,
        title,
      });
    }
  } catch (error) {
    Logger.error("Failed to send notification", { userId, error });
  }
};

/**
 * Run matching engine for a specific job
 * - Calculate match scores for all students
 * - Auto-apply if score >= 70
 * - Create Application entries (future: when Application model exists)
 * - Send notifications
 */
export const runMatchingEngine = async (
  jobId: string,
): Promise<MatchingEngineResult> => {
  Logger.info("Running matching engine", { jobId });

  // Fetch job details (currently using JobPosts schema)
  const job = await prisma.jobPosts.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      jobrole: true,
      companyname: true,
      skills: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Fetch all student profiles
  const students = await prisma.studentProfile.findMany({
    select: {
      id: true,
      userId: true,
      name: true,
      skills: true,
    },
  });

  Logger.info("Students fetched for matching", {
    jobId,
    totalStudents: students.length,
  });

  const matches: MatchResult[] = [];
  let autoAppliedCount = 0;

  // Clear existing matches for this job
  await prisma.jobMatching.deleteMany({ where: { jobId } });

  for (const student of students) {
    const { matchedSkills, score } = calculateMatchScore(
      student.skills,
      job.skills,
    );

    // Skip if no skills match
    if (matchedSkills.length === 0) {
      continue;
    }

    // Save JobMatching record
    await prisma.jobMatching.create({
      data: {
        jobId,
        studentId: student.id,
        matchedSkills,
        score,
      },
    });

    let autoApplied = false;

    // Auto-apply if score >= threshold
    if (score >= AUTO_APPLY_THRESHOLD) {
      // Send notification about auto-match
      await sendNotification(
        student.userId,
        "Job Match Found",
        `You have been automatically matched (${score}%) with ${job.companyname} - ${job.jobrole}. Check the job board!`,
      );

      autoApplied = true;
      autoAppliedCount++;

      Logger.info("Student auto-matched", {
        studentId: student.id,
        jobId,
        score,
      });
    }

    matches.push({
      studentId: student.id,
      studentName: student.name,
      matchedSkills,
      matchScore: score,
      autoApplied,
    });
  }

  Logger.info("Matching engine completed", {
    jobId,
    totalStudents: students.length,
    matchedStudents: matches.length,
    autoAppliedCount,
  });

  return {
    jobId,
    totalStudents: students.length,
    matchedStudents: matches.length,
    autoAppliedCount,
    matches,
  };
};

/**
 * Get match details for a specific student-job pair
 */
export const getStudentJobMatch = async (studentId: string, jobId: string) => {
  const match = await prisma.jobMatching.findFirst({
    where: {
      jobId,
      studentId,
    },
    include: {
      job: {
        select: {
          jobrole: true,
          companyname: true,
          skills: true,
        },
      },
      student: {
        select: {
          name: true,
          skills: true,
        },
      },
    },
  });

  return match;
};

/**
 * Get all matches for a job (for admin view)
 */
export const getJobMatches = async (jobId: string) => {
  const matches = await prisma.jobMatching.findMany({
    where: { jobId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          placementEmail: true,
          skills: true,
        },
      },
    },
    orderBy: {
      score: "desc",
    },
  });

  return matches;
};

/**
 * Get all matches for a student (for student view)
 */
export const getStudentMatches = async (studentId: string) => {
  const matches = await prisma.jobMatching.findMany({
    where: { studentId },
    include: {
      job: {
        select: {
          id: true,
          jobrole: true,
          companyname: true,
          skills: true,
        },
      },
    },
    orderBy: {
      score: "desc",
    },
  });

  return matches;
};
