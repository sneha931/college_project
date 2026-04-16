import prisma from '../config/prismaconfig.js';

export type CompanyRoleStat = {
  role: string;
  openings: number;
};

export type CompanyReviewSummary = {
  interviewsAnalyzed: number;
  feedbackCount: number;
  averageFinalScore: number | null;
  averageAiScore: number | null;
  commonOutcome: string;
  recentReviews: string[];
};

export type CompanyTopicStat = {
  topic: string;
  frequency: number;
};

export type CompanyAnalytics = {
  companyname: string;
  totalOpenings: number;
  totalRoles: CompanyRoleStat[];
  topHiringRoles: CompanyRoleStat[];
  placementSummary: {
    placedStudents: number;
  };
  reviewSummary: CompanyReviewSummary;
  preparationTopics: CompanyTopicStat[];
};

type CompanyAccumulator = {
  companyname: string;
  totalOpenings: number;
  roleCounts: Map<string, number>;
  placedStudents: number;
  interviewsAnalyzed: number;
  finalTotal: number;
  finalCount: number;
  aiTotal: number;
  aiCount: number;
  positive: number;
  negative: number;
  neutral: number;
  recentReviews: string[];
  reviewSet: Set<string>;
  feedbackCount: number;
  topicCounts: Map<string, { topic: string; frequency: number }>;
};

const normalizeKey = (value: string) => value.trim().toLowerCase();

const normalizeTopicKey = (question: string) =>
  question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasPositiveVerdict = (verdict: string | null) => {
  if (!verdict) {
    return false;
  }

  const normalized = verdict.toLowerCase();
  return (
    normalized.includes('selected') ||
    normalized.includes('pass') ||
    normalized.includes('hired') ||
    normalized.includes('clear')
  );
};

const getOrCreateAccumulator = (
  map: Map<string, CompanyAccumulator>,
  companyname: string,
): CompanyAccumulator => {
  const key = normalizeKey(companyname);
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const created: CompanyAccumulator = {
    companyname,
    totalOpenings: 0,
    roleCounts: new Map(),
    placedStudents: 0,
    interviewsAnalyzed: 0,
    finalTotal: 0,
    finalCount: 0,
    aiTotal: 0,
    aiCount: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    recentReviews: [],
    reviewSet: new Set(),
    feedbackCount: 0,
    topicCounts: new Map(),
  };

  map.set(key, created);
  return created;
};

const toCompanyAnalytics = (acc: CompanyAccumulator): CompanyAnalytics => {
  const totalRoles = [...acc.roleCounts.entries()].map(([role, openings]) => ({
    role,
    openings,
  }));

  totalRoles.sort((a, b) => b.openings - a.openings);

  let commonOutcome = 'Neutral';
  if (acc.positive > Math.max(acc.negative, acc.neutral)) {
    commonOutcome = 'Mostly positive outcomes';
  } else if (acc.negative > Math.max(acc.positive, acc.neutral)) {
    commonOutcome = 'Mostly improvement needed';
  }

  const preparationTopics = [...acc.topicCounts.values()]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8)
    .map((topic) => ({
      topic: topic.topic,
      frequency: topic.frequency,
    }));

  return {
    companyname: acc.companyname,
    totalOpenings: acc.totalOpenings,
    totalRoles,
    topHiringRoles: totalRoles.slice(0, 5),
    placementSummary: {
      placedStudents: acc.placedStudents,
    },
    reviewSummary: {
      interviewsAnalyzed: acc.interviewsAnalyzed,
      feedbackCount: acc.feedbackCount,
      averageFinalScore:
        acc.finalCount > 0
          ? Number((acc.finalTotal / acc.finalCount).toFixed(2))
          : null,
      averageAiScore:
        acc.aiCount > 0 ? Number((acc.aiTotal / acc.aiCount).toFixed(2)) : null,
      commonOutcome,
      recentReviews: acc.recentReviews,
    },
    preparationTopics,
  };
};

export const getCompanyAnalysisData = async (years = 2) => {
  const since = new Date();
  since.setFullYear(since.getFullYear() - years);

  const [jobs, interviews, placedStudents, eventFeedbacks] = await Promise.all([
    prisma.jobPosts.findMany({
      where: { createdAt: { gte: since } },
      select: {
        companyname: true,
        jobrole: true,
      },
    }),
    prisma.interview.findMany({
      where: { createdAt: { gte: since } },
      select: {
        verdict: true,
        finalScore: true,
        aiScore: true,
        JobPosts: {
          select: {
            companyname: true,
          },
        },
        InterviewAnswer: {
          select: {
            question: true,
            feedback: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      where: {
        isPlaced: true,
      },
      select: {
        id: true,
        placedCompany: true,
        Interview: {
          where: {
            createdAt: { gte: since },
          },
          select: {
            createdAt: true,
            JobPosts: {
              select: {
                companyname: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    }),
    prisma.eventFeedback.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        interviewReview: true,
        preparationTopics: true,
        Event: {
          select: {
            companyName: true,
          },
        },
      },
    }),
  ]);

  const companyAccumulators = new Map<string, CompanyAccumulator>();

  for (const job of jobs) {
    const company = getOrCreateAccumulator(
      companyAccumulators,
      job.companyname,
    );

    company.totalOpenings += 1;
    company.roleCounts.set(
      job.jobrole,
      (company.roleCounts.get(job.jobrole) ?? 0) + 1,
    );
  }

  for (const interview of interviews) {
    const company = getOrCreateAccumulator(
      companyAccumulators,
      interview.JobPosts.companyname,
    );

    company.interviewsAnalyzed += 1;

    if (typeof interview.finalScore === 'number') {
      company.finalTotal += interview.finalScore;
      company.finalCount += 1;
    }

    if (typeof interview.aiScore === 'number') {
      company.aiTotal += interview.aiScore;
      company.aiCount += 1;
    }

    if (hasPositiveVerdict(interview.verdict)) {
      company.positive += 1;
    } else if (interview.verdict) {
      company.negative += 1;
    } else {
      company.neutral += 1;
    }

    for (const answer of interview.InterviewAnswer) {
      const feedbackText = answer.feedback?.trim();
      if (
        feedbackText &&
        company.recentReviews.length < 5 &&
        !company.reviewSet.has(feedbackText)
      ) {
        company.reviewSet.add(feedbackText);
        company.recentReviews.push(feedbackText);
      }

      const normalizedTopic = normalizeTopicKey(answer.question);
      if (!normalizedTopic) {
        continue;
      }

      const existingTopic = company.topicCounts.get(normalizedTopic);
      if (existingTopic) {
        existingTopic.frequency += 1;
      } else {
        company.topicCounts.set(normalizedTopic, {
          topic: answer.question.trim(),
          frequency: 1,
        });
      }
    }
  }

  for (const student of placedStudents) {
    const placedCompanyName = student.placedCompany?.trim();
    const latestInterviewCompany = student.Interview[0]?.JobPosts.companyname;
    const companyName =
      placedCompanyName && placedCompanyName.length > 0
        ? placedCompanyName
        : latestInterviewCompany;

    if (!companyName) {
      continue;
    }

    const company = getOrCreateAccumulator(companyAccumulators, companyName);
    company.placedStudents += 1;
  }

  for (const feedback of eventFeedbacks) {
    const company = getOrCreateAccumulator(
      companyAccumulators,
      feedback.Event.companyName,
    );

    company.feedbackCount += 1;

    const reviewText = feedback.interviewReview?.trim();
    if (
      reviewText &&
      company.recentReviews.length < 5 &&
      !company.reviewSet.has(reviewText)
    ) {
      company.reviewSet.add(reviewText);
      company.recentReviews.push(reviewText);
    }

    const topicsText = feedback.preparationTopics?.trim();
    if (!topicsText) {
      continue;
    }

    const parsedTopics = topicsText
      .split(/\n|,|\|/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    for (const topic of parsedTopics) {
      const normalizedTopic = normalizeTopicKey(topic);
      if (!normalizedTopic) {
        continue;
      }

      const existingTopic = company.topicCounts.get(normalizedTopic);
      if (existingTopic) {
        existingTopic.frequency += 1;
      } else {
        company.topicCounts.set(normalizedTopic, {
          topic,
          frequency: 1,
        });
      }
    }
  }

  const companies = [...companyAccumulators.values()]
    .map(toCompanyAnalytics)
    .sort((a, b) => b.totalOpenings - a.totalOpenings);

  return {
    since: since.toISOString(),
    totalCompanies: companies.length,
    companies,
  };
};
