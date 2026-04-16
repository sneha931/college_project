import axios from 'axios';
import { randomUUID } from 'crypto';
import prisma from '../config/prismaconfig.js';
import Logger from '../logger.js';

// Interface for external job data (generic format)
interface ExternalJobData {
  id: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string | number;
  skills?: string[];
  url?: string;
  posted_at?: string;
  deadline?: string;
}

// Third-party API configurations
const EXTERNAL_APIS = {
  theirstack: {
    url: 'https://api.theirstack.com/v1/jobs/search',
    enabled: true,
  },
  // Example: RemoteOK-like API
  remoteok: {
    url: 'https://remoteok.com/api',
    enabled: false, // Set to true when you have actual API
  },
  // Mock API for demonstration
  mockapi: {
    url: 'https://jsonplaceholder.typicode.com/posts', // Placeholder for demo
    enabled: true,
  },
};

const THEIRSTACK_PAGE_SIZE = 25;
const THEIRSTACK_MAX_PAGES = 5;
const THEIRSTACK_TARGET_FILTERED_JOBS = 40;

const getEnvNumber = (key: string, fallback: number): number => {
  const rawValue = process.env[key];
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FRESHER_INCLUDE_KEYWORDS = [
  'fresher',
  'freshers',
  'entry level',
  'junior',
  'new grad',
  'graduate',
  'intern',
  'trainee',
  'no experience',
  '0-1',
  '0 to 1',
  '0 year',
  '1 year',
];

const FRESHER_EXCLUDE_KEYWORDS = [
  'senior',
  'lead',
  'principal',
  'architect',
  'manager',
  'staff engineer',
  'director',
  'head of',
  'vp',
  '5+ years',
  '3+ years',
  '4+ years',
  'minimum 2 years',
];

const getSearchText = (externalJob: any) =>
  [
    externalJob.job_title,
    externalJob.title,
    externalJob.role,
    externalJob.description,
    externalJob.summary,
    externalJob.requirements,
    externalJob.experience,
    externalJob.experience_level,
    Array.isArray(externalJob.skills)
      ? externalJob.skills.join(' ')
      : externalJob.skills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const extractMaxExperienceYears = (externalJob: any): number | null => {
  const candidates = [
    externalJob.experience_max,
    externalJob.experience_max_years,
    externalJob.max_experience,
    externalJob.max_experience_years,
    externalJob.years_of_experience_max,
    externalJob.required_experience_years,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const match = candidate.match(/\d+(?:\.\d+)?/);
      if (match) {
        return Number(match[0]);
      }
    }
  }

  return null;
};

const isFresherFriendlyJob = (externalJob: any): boolean => {
  const text = getSearchText(externalJob);
  const maxExperience = extractMaxExperienceYears(externalJob);

  if (typeof maxExperience === 'number') {
    return maxExperience <= 1;
  }

  if (hasAnyKeyword(text, FRESHER_EXCLUDE_KEYWORDS)) {
    return false;
  }

  if (hasAnyKeyword(text, FRESHER_INCLUDE_KEYWORDS)) {
    return true;
  }

  return true;
};

const extractTheirStackJobs = (responseData: any): any[] => {
  if (Array.isArray(responseData)) {
    return responseData;
  }
  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }
  if (Array.isArray(responseData?.jobs)) {
    return responseData.jobs;
  }
  if (Array.isArray(responseData?.results)) {
    return responseData.results;
  }
  return [];
};

/**
 * Normalize salary string to LPA (Lakhs Per Annum)
 * Examples: "$80k", "80000 USD", "60-80k" -> 60 LPA (approx)
 */
const normalizeSalaryToLPA = (
  salary: string | number | undefined,
): number | null => {
  if (!salary) return null;

  const salaryStr = String(salary).toLowerCase();

  // Extract numbers from salary string
  const matches = salaryStr.match(/(\d+(?:,\d+)?(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) return null;

  // Take the first number (or minimum if range)
  const amount = parseFloat(matches[0].replace(/,/g, ''));

  // Convert to annual if needed
  let annual = amount;

  // If amount is likely monthly (e.g., $5000/month)
  if (salaryStr.includes('month') || salaryStr.includes('/mo')) {
    annual = amount * 12;
  }

  // If amount is in thousands (k)
  if (salaryStr.includes('k')) {
    annual = amount * 1000;
  }

  // Convert USD to INR (approximate: 1 USD = 83 INR)
  if (salaryStr.includes('$') || salaryStr.includes('usd')) {
    annual = annual * 83;
  }

  // Convert to LPA (Lakhs per annum)
  const lpa = annual / 100000;

  return Math.round(lpa * 10) / 10; // Round to 1 decimal
};

/**
 * Extract skills from job description using common tech keywords
 */
const extractSkillsFromDescription = (description: string): string[] => {
  const commonSkills = [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'C#',
    'Ruby',
    'PHP',
    'Go',
    'Rust',
    'React',
    'Angular',
    'Vue',
    'Node.js',
    'Express',
    'Django',
    'Flask',
    'Spring Boot',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'Redis',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'GCP',
    'Git',
    'CI/CD',
    'REST API',
    'GraphQL',
    'Microservices',
    'Machine Learning',
    'AI',
    'Data Structures',
    'Algorithms',
    'System Design',
    'Agile',
    'Scrum',
  ];

  const foundSkills: string[] = [];
  const descLower = description.toLowerCase();

  commonSkills.forEach((skill) => {
    if (descLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return foundSkills.length > 0 ? foundSkills : ['General'];
};

/**
 * Normalize external job data to JobPosts format
 */
const normalizeJobData = (externalJob: any, source: string): Partial<any> => {
  // Handle different API response formats
  let normalized: any = {};

  if (source === 'mockapi') {
    // Mock format from JSONPlaceholder (for demo)
    normalized = {
      jobrole: externalJob.title || 'Software Engineer',
      companyname: `External Corp ${externalJob.id}`,
      description:
        externalJob.body || 'Join our team for exciting opportunities.',
      salary:
        Math.random() > 0.5 ? Math.floor(Math.random() * 2000000) + 500000 : 0,
      skills: extractSkillsFromDescription(externalJob.body || ''),
      externalJobId: String(externalJob.id),
    };
  } else if (source === 'remoteok') {
    // RemoteOK format
    const normalizedSalary = normalizeSalaryToLPA(externalJob.salary);
    normalized = {
      jobrole: externalJob.position || externalJob.title,
      companyname: externalJob.company,
      description: externalJob.description || '',
      salary: normalizedSalary ? Math.round(normalizedSalary * 100000) : 0,
      skills:
        externalJob.tags ||
        extractSkillsFromDescription(externalJob.description || ''),
      externalJobId: externalJob.id,
    };
  } else if (source === 'theirstack') {
    const description = externalJob.description || externalJob.summary || '';
    const company =
      externalJob.company_name ||
      externalJob.company?.name ||
      externalJob.organization?.name ||
      'Unknown Company';
    const role =
      externalJob.job_title ||
      externalJob.title ||
      externalJob.role ||
      'Software Engineer';
    const externalId =
      externalJob.id || externalJob.job_id || externalJob.external_id;
    const salaryRaw =
      externalJob.salary_string ||
      externalJob.salary_text ||
      externalJob.salary;
    const normalizedSalary = normalizeSalaryToLPA(salaryRaw);
    const providedSkills = Array.isArray(externalJob.skills)
      ? externalJob.skills.map((skill: any) => String(skill))
      : [];

    normalized = {
      jobrole: role,
      companyname: company,
      description,
      salary: normalizedSalary ? Math.round(normalizedSalary * 100000) : 0,
      skills:
        providedSkills.length > 0
          ? providedSkills
          : extractSkillsFromDescription(description),
      externalJobId: externalId ? String(externalId) : undefined,
    };
  }

  return normalized;
};

/**
 * Fetch jobs from external API
 */
export const fetchExternalJobs = async (
  source: keyof typeof EXTERNAL_APIS = 'mockapi',
): Promise<any[]> => {
  try {
    const apiConfig = EXTERNAL_APIS[source];

    if (!apiConfig.enabled) {
      Logger.warn(`External API ${source} is disabled`);
      return [];
    }

    Logger.info(`Fetching jobs from ${source}...`);

    let jobs: any[] = [];

    if (source === 'theirstack') {
      const apiKey = process.env.THEIRSTACK_API_KEY;

      if (!apiKey) {
        Logger.warn(
          'THEIRSTACK_API_KEY is not set. Skipping TheirStack import.',
        );
        return [];
      }

      const pageSize = getEnvNumber(
        'THEIRSTACK_PAGE_SIZE',
        THEIRSTACK_PAGE_SIZE,
      );
      const maxPages = getEnvNumber(
        'THEIRSTACK_MAX_PAGES',
        THEIRSTACK_MAX_PAGES,
      );
      const targetFilteredJobs = getEnvNumber(
        'THEIRSTACK_TARGET_FILTERED_JOBS',
        THEIRSTACK_TARGET_FILTERED_JOBS,
      );

      const allFetchedJobs: any[] = [];

      for (let page = 0; page < maxPages; page++) {
        const payload = {
          page,
          limit: pageSize,
          job_country_code_or: ['IN'],
          posted_at_max_age_days: 7,
        };

        const response = await axios.post(apiConfig.url, payload, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'College-Placement-System/1.0',
          },
        });

        const pageJobs = extractTheirStackJobs(response.data);
        if (pageJobs.length === 0) {
          break;
        }

        allFetchedJobs.push(...pageJobs);

        if (pageJobs.length < pageSize) {
          break;
        }
      }

      const beforeFilterCount = allFetchedJobs.length;
      jobs = allFetchedJobs.filter((externalJob) =>
        isFresherFriendlyJob(externalJob),
      );

      const seenIds = new Set<string>();
      jobs = jobs.filter((job) => {
        const externalId = String(
          job.id || job.job_id || job.external_id || '',
        );
        if (!externalId) {
          return true;
        }
        if (seenIds.has(externalId)) {
          return false;
        }
        seenIds.add(externalId);
        return true;
      });

      if (jobs.length > targetFilteredJobs) {
        jobs = jobs.slice(0, targetFilteredJobs);
      }

      Logger.info(
        `Filtered TheirStack jobs for fresher roles: ${jobs.length}/${beforeFilterCount} retained`,
      );
    } else {
      const response = await axios.get(apiConfig.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'College-Placement-System/1.0',
        },
      });

      jobs = source === 'mockapi' ? response.data.slice(0, 10) : response.data;
    }

    Logger.info(`Fetched ${jobs.length} jobs from ${source}`);
    return jobs;
  } catch (error) {
    Logger.error(`Error fetching jobs from ${source}:`, error);
    return [];
  }
};

/**
 * Save external jobs to database
 * Returns count of saved jobs
 */
export const saveExternalJobs = async (
  source: keyof typeof EXTERNAL_APIS = 'theirstack'
): Promise<{ saved: number; skipped: number; errors: number }> => {
  try {

    const externalJobs = await fetchExternalJobs(source);

    if (externalJobs.length === 0) {
      return { saved: 0, skipped: 0, errors: 0 };
    }

    let saved = 0;
    let skipped = 0;
    let errors = 0;

    const normalizedJobs = externalJobs.map((externalJob) =>
      normalizeJobData(externalJob, source),
    );
    const candidateExternalIds = normalizedJobs
      .map((job) => job.externalJobId)
      .filter((jobId): jobId is string => Boolean(jobId));

    const existingJobs =
      candidateExternalIds.length > 0
        ? await prisma.jobPosts.findMany({
            where: {
              externalSource: source,
              externalJobId: { in: candidateExternalIds },
            },
            select: { externalJobId: true },
          })
        : [];

    const existingExternalIds = new Set(
      existingJobs
        .map((job) => job.externalJobId)
        .filter((jobId): jobId is string => Boolean(jobId)),
    );

    const seenExternalIds = new Set<string>();

    const jobsToCreate = normalizedJobs.reduce<any[]>(
      (accumulator, normalized) => {
        if (!normalized.companyname || !normalized.jobrole) {
          errors++;
          return accumulator;
        }

        const externalJobId = normalized.externalJobId as string | undefined;

        if (externalJobId) {
          if (
            existingExternalIds.has(externalJobId) ||
            seenExternalIds.has(externalJobId)
          ) {
            skipped++;
            return accumulator;
          }
          seenExternalIds.add(externalJobId);
        }

        accumulator.push({
          id: `ext_${randomUUID()}`,
          companyname: normalized.companyname,
          jobrole: normalized.jobrole,
          description: normalized.description || '',
          salary: normalized.salary || 0,
          skills: normalized.skills || [],
          minCGPA: 6.0,
          minExperience: 0,
          minMarks10: 50,
          minMarks12: null,
          shortlistReady: false,
          interviewScheduled: false,
          isExternal: true,
          isApproved: false,
          externalSource: source,
          externalJobId,
          updatedAt: new Date(),
        });

        return accumulator;
      },
      [],
    );

    if (jobsToCreate.length > 0) {
      const createResult = await prisma.jobPosts.createMany({
        data: jobsToCreate,
      });
      saved = createResult.count;
      if (saved < jobsToCreate.length) {
        errors += jobsToCreate.length - saved;
      }
    }

    Logger.info(
      `External jobs import complete: ${saved} saved, ${skipped} skipped, ${errors} errors`,
    );

    return { saved, skipped, errors };
  } catch (error) {
    Logger.error('Error in saveExternalJobs:', error);
    throw error;
  }
};

/**
 * Get all pending external jobs (for admin review)
 */
export const getPendingExternalJobs = async () => {
  return await prisma.jobPosts.findMany({
    where: {
      isExternal: true,
      isApproved: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

/**
 * Approve external job
 */
export const approveExternalJob = async (jobId: string) => {
  const job = await prisma.jobPosts.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (!job.isExternal) {
    throw new Error('This is not an external job');
  }

  if (job.isApproved) {
    throw new Error('Job is already approved');
  }

  return await prisma.jobPosts.update({
    where: { id: jobId },
    data: {
      isApproved: true,
      shortlistReady: false, // Will be ready after admin reviews
    },
  });
};

/**
 * Reject and delete external job
 */
export const rejectExternalJob = async (jobId: string) => {
  const job = await prisma.jobPosts.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (!job.isExternal) {
    throw new Error('This is not an external job');
  }

  // Delete the rejected job
  return await prisma.jobPosts.delete({
    where: { id: jobId },
  });
};

/**
 * Get all approved external jobs
 */
export const getApprovedExternalJobs = async () => {
  return await prisma.jobPosts.findMany({
    where: {
      isExternal: true,
      isApproved: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};
