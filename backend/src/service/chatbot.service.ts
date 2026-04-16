import axios from 'axios';
import prisma from '../config/prismaconfig.js';
import Logger from '../logger.js';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface StudentContextSnapshot {
  contextText: string;
  hasProfile: boolean;
  studentName: string;
  resumeUploaded: boolean;
  cgpa: number | null;
  experienceMonths: number | null;
  isPlaced: boolean;
  placedCompany: string | null;
  topSkills: string[];
  shortlistCount: number;
  visibleJobsCount: number;
  topShortlistedJobs: Array<{
    companyname: string;
    jobrole: string;
    score: number;
  }>;
  upcomingEvents: Array<{
    companyName: string;
    venue: string;
    startTime: string;
  }>;
}

const MAX_QUESTION_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 10;

const buildWebsiteKnowledge = () => {
  return [
    'Campus Placement Portal key sections:',
    '- Student Dashboard: personal stats, shortlisted jobs, upcoming events, recommendations.',
    '- Jobs page: browse eligible jobs, filters, job details.',
    '- Profile page: update marks, CGPA, skills, experience, upload resume and profile picture.',
    '- Events page: view placement drives and submit feedback for completed drives.',
    '- Student Analysis: placement readiness, skill demand, matching insights.',
    '- Admin manages jobs/events/students and approves external jobs before they appear in main jobs.',
    '- External jobs are imported from third-party feeds and require admin approval before main management.',
    '- Student chatbot can help with profile completion, better matching score, event flow, and job navigation.',
    'Guidelines for responses:',
    '- Be concise, practical, and website-specific.',
    '- Use simple numbered steps for navigation-based questions.',
    '- Mention exact portal page names when possible.',
    '- If asked about actions, provide clear step-by-step navigation in the portal.',
    '- If uncertain, suggest where in the portal the student can verify details.',
  ].join('\n');
};

const sanitizeText = (value: string, maxLength: number) =>
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength);

const sanitizeHistory = (history: ChatHistoryMessage[]) =>
  history
    .slice(-MAX_HISTORY_ITEMS)
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .map((item) => ({
      role: item.role,
      content: sanitizeText(item.content || '', 1000),
    }))
    .filter((item) => item.content.length > 0);

const buildStudentContext = async (
  userId: string,
): Promise<StudentContextSnapshot> => {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      skills: true,
      btechCGPA: true,
      experience: true,
      isPlaced: true,
      placedCompany: true,
      resumeUrl: true,
    },
  });

  if (!profile) {
    return {
      contextText: 'Student context: profile not yet created.',
      hasProfile: false,
      studentName: 'Student',
      resumeUploaded: false,
      cgpa: null,
      experienceMonths: null,
      isPlaced: false,
      placedCompany: null,
      topSkills: [],
      shortlistCount: 0,
      visibleJobsCount: 0,
      topShortlistedJobs: [],
      upcomingEvents: [],
    };
  }

  const [shortlistCount, upcomingEvents, visibleJobsCount, topShortlistedJobs] =
    await Promise.all([
      prisma.jobMatching.count({
        where: {
          studentId: profile.id,
          job: {
            OR: [{ isExternal: false }, { isExternal: true, isApproved: true }],
          },
        },
      }),
      prisma.event.findMany({
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: 'asc' },
        take: 3,
        select: {
          companyName: true,
          startTime: true,
          venue: true,
        },
      }),
      prisma.jobPosts.count({
        where: {
          OR: [{ isExternal: false }, { isExternal: true, isApproved: true }],
        },
      }),
      prisma.jobMatching.findMany({
        where: {
          studentId: profile.id,
          job: {
            OR: [{ isExternal: false }, { isExternal: true, isApproved: true }],
          },
        },
        orderBy: { score: 'desc' },
        take: 3,
        include: {
          job: {
            select: {
              companyname: true,
              jobrole: true,
            },
          },
        },
      }),
    ]);

  const normalizedUpcomingEvents = upcomingEvents.map((event) => ({
    companyName: event.companyName,
    venue: event.venue,
    startTime: event.startTime.toISOString(),
  }));

  const normalizedTopShortlistedJobs = topShortlistedJobs.map((entry) => ({
    companyname: entry.job.companyname,
    jobrole: entry.job.jobrole,
    score: entry.score,
  }));

  const eventLine =
    upcomingEvents.length > 0
      ? upcomingEvents
          .map(
            (event) =>
              `${event.companyName} at ${event.venue} on ${event.startTime.toISOString()}`,
          )
          .join(' | ')
      : 'No upcoming events.';

  const shortlistedJobsLine =
    topShortlistedJobs.length > 0
      ? topShortlistedJobs
          .map(
            (entry) =>
              `${entry.job.jobrole} at ${entry.job.companyname} (${entry.score}%)`,
          )
          .join(' | ')
      : 'No shortlisted jobs yet.';

  const contextText = [
    `Student name: ${profile.name}`,
    `Placed: ${profile.isPlaced ? 'Yes' : 'No'}`,
    `Placed company: ${profile.placedCompany || 'N/A'}`,
    `Resume uploaded: ${profile.resumeUrl ? 'Yes' : 'No'}`,
    `CGPA: ${profile.btechCGPA}`,
    `Experience (months): ${profile.experience}`,
    `Top skills: ${profile.skills.slice(0, 8).join(', ') || 'N/A'}`,
    `Shortlisted jobs count: ${shortlistCount}`,
    `Top shortlisted jobs: ${shortlistedJobsLine}`,
    `Visible jobs count: ${visibleJobsCount}`,
    `Upcoming events: ${eventLine}`,
  ].join('\n');

  return {
    contextText,
    hasProfile: true,
    studentName: profile.name,
    resumeUploaded: Boolean(profile.resumeUrl),
    cgpa: profile.btechCGPA,
    experienceMonths: profile.experience,
    isPlaced: profile.isPlaced,
    placedCompany: profile.placedCompany || null,
    topSkills: profile.skills.slice(0, 8),
    shortlistCount,
    visibleJobsCount,
    topShortlistedJobs: normalizedTopShortlistedJobs,
    upcomingEvents: normalizedUpcomingEvents,
  };
};

const isStudentDataQuestion = (question: string) => {
  const q = question.toLowerCase();

  return [
    'my profile',
    'my cgpa',
    'my experience',
    'my skills',
    'am i placed',
    'placed company',
    'resume uploaded',
    'how many shortlisted',
    'shortlisted jobs',
    'upcoming event',
    'how many jobs can i see',
    'visible jobs',
  ].some((key) => q.includes(key));
};

const buildStudentDataReply = (
  question: string,
  context: StudentContextSnapshot,
) => {
  const q = question.toLowerCase();

  if (!context.hasProfile) {
    return 'Your student profile is not created yet. Go to Profile, complete details, and upload your resume to enable matching and shortlist insights.';
  }

  if (isShortlistCountQuestion(question)) {
    return buildShortlistCountReply(context.shortlistCount);
  }

  if (q.includes('upcoming event')) {
    if (context.upcomingEvents.length === 0) {
      return 'You currently have no upcoming events.';
    }

    const eventLines = context.upcomingEvents
      .slice(0, 3)
      .map(
        (event, index) =>
          `${index + 1}) ${event.companyName} at ${event.venue} on ${new Date(event.startTime).toLocaleString()}`,
      )
      .join('\n');

    return [`Your upcoming events:`, eventLines].join('\n');
  }

  if (q.includes('my skills')) {
    const skills = context.topSkills.length
      ? context.topSkills.join(', ')
      : 'No skills found in your profile yet.';
    return `Your top profile skills are: ${skills}`;
  }

  if (
    q.includes('my profile') ||
    q.includes('my cgpa') ||
    q.includes('my experience') ||
    q.includes('resume uploaded') ||
    q.includes('am i placed') ||
    q.includes('placed company')
  ) {
    return [
      `Student: ${context.studentName}`,
      `Placed: ${context.isPlaced ? 'Yes' : 'No'}`,
      `Placed company: ${context.placedCompany || 'N/A'}`,
      `Resume uploaded: ${context.resumeUploaded ? 'Yes' : 'No'}`,
      `CGPA: ${context.cgpa ?? 'N/A'}`,
      `Experience (months): ${context.experienceMonths ?? 'N/A'}`,
      `Shortlisted jobs: ${context.shortlistCount}`,
      `Visible jobs: ${context.visibleJobsCount}`,
    ].join('\n');
  }

  if (q.includes('visible jobs') || q.includes('how many jobs can i see')) {
    return `You can currently see ${context.visibleJobsCount} jobs in student views.`;
  }

  if (q.includes('shortlisted jobs')) {
    if (context.topShortlistedJobs.length === 0) {
      return 'You are not shortlisted in any visible job right now.';
    }
    const topJobs = context.topShortlistedJobs
      .slice(0, 3)
      .map(
        (item, index) =>
          `${index + 1}) ${item.jobrole} at ${item.companyname} (${item.score}%)`,
      )
      .join('\n');
    return [
      `You are shortlisted in ${context.shortlistCount} job(s).`,
      topJobs,
    ].join('\n');
  }

  return null;
};

const isShortlistCountQuestion = (question: string) => {
  const q = question.toLowerCase();
  const mentionsShortlist =
    q.includes('shortlist') ||
    q.includes('shortlisted') ||
    q.includes('short list');
  const asksCount =
    q.includes('how many') ||
    q.includes('count') ||
    q.includes('number') ||
    q.includes('total');
  return mentionsShortlist && asksCount;
};

const buildShortlistCountReply = (count: number) => {
  if (count <= 0) {
    return 'You are currently shortlisted in 0 jobs. Complete your Profile (skills, CGPA, experience, resume) and then check Student Dashboard again after matching refreshes.';
  }

  return `You are currently shortlisted in ${count} job${count === 1 ? '' : 's'}. Open Student Dashboard to see all shortlisted roles.`;
};

const buildFallbackReply = (question: string) => {
  const q = question.toLowerCase();

  if (q.includes('profile') || q.includes('resume')) {
    return 'Go to Profile from the navbar, update your marks/skills/experience, then upload your resume. After upload, refresh your dashboard to see updated matching results.';
  }

  if (q.includes('job') || q.includes('apply') || q.includes('shortlist')) {
    return 'Open the Dashboard or Student Dashboard to browse jobs. Your shortlist is generated from profile-job matching, and shortlisted jobs are shown in your student views.';
  }

  if (
    q.includes('event') ||
    q.includes('interview') ||
    q.includes('feedback')
  ) {
    return 'Use the Events page to view upcoming drives. For completed drives, submit feedback when prompted so your experience helps analytics and preparation insights.';
  }

  return 'I can help with profile updates, jobs, shortlisting, events, interviews, and placement analytics. Ask a specific portal question and I will guide you step by step.';
};

const buildDeterministicReply = (question: string) => {
  const q = question.toLowerCase();

  if (
    q.includes('match score') ||
    q.includes('improve') ||
    q.includes('readiness')
  ) {
    return [
      'To improve your matching score quickly:',
      '1) Open Profile and update CGPA, experience, and all relevant skills.',
      '2) Upload your latest resume so parsing updates your profile data.',
      '3) Check Student Analysis for skill demand and close top skill gaps.',
      '4) Revisit Dashboard/Student Dashboard to track shortlist improvements.',
    ].join('\n');
  }

  if (
    q.includes('how to use') ||
    q.includes('where') ||
    q.includes('navigate')
  ) {
    return [
      'Portal navigation quick guide:',
      '- Dashboard: browse jobs and filters.',
      '- Student Dashboard: shortlist and interview status snapshot.',
      '- Profile: update details and upload resume.',
      '- Events: upcoming drives and feedback submission.',
      '- Student Analysis: readiness, demand trends, and recommendations.',
    ].join('\n');
  }

  return buildFallbackReply(question);
};

export const generateStudentChatbotReply = async (
  userId: string,
  question: string,
  history: ChatHistoryMessage[] = [],
) => {
  const trimmedQuestion = sanitizeText(question || '', MAX_QUESTION_LENGTH);
  if (!trimmedQuestion) {
    throw new Error('Question is required');
  }

  const studentContext = await buildStudentContext(userId);

  if (isStudentDataQuestion(trimmedQuestion)) {
    const studentDataReply = buildStudentDataReply(
      trimmedQuestion,
      studentContext,
    );
    if (studentDataReply) {
      return studentDataReply;
    }
  }

  if (isShortlistCountQuestion(trimmedQuestion)) {
    return buildShortlistCountReply(studentContext.shortlistCount);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    Logger.warn('Chatbot provider fallback: GEMINI_API_KEY missing');
    return buildDeterministicReply(trimmedQuestion);
  }

  const websiteKnowledge = buildWebsiteKnowledge();

  const sanitizedHistory = sanitizeHistory(history);

  const modelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
  const systemInstruction = [
    'You are a helpful student assistant for a campus placement portal.',
    'Answer only portal-related questions and keep responses concise and actionable.',
    'If a user asks unrelated questions, politely redirect to placement portal support topics.',
    '',
    `Website context:\n${websiteKnowledge}`,
    '',
    `Current student context:\n${studentContext.contextText}`,
  ].join('\n');

  const contents = [
    ...sanitizedHistory.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })),
    {
      role: 'user',
      parts: [{ text: trimmedQuestion }],
    },
  ];

  try {
    const response = await axios.post<GeminiGenerateContentResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
      {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 420,
        },
      },
      {
        params: { key: apiKey },
      },
    );

    const reply = response.data?.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      ?.map((part) => part.text || '')
      ?.join(' ')
      ?.trim();

    Logger.info('Chatbot provider used: Gemini', { modelId });

    return reply || buildDeterministicReply(trimmedQuestion);
  } catch (error) {
    Logger.error('Chatbot Gemini request failed, using fallback reply', {
      modelId,
      error,
    });
    if (isStudentDataQuestion(trimmedQuestion)) {
      const studentDataReply = buildStudentDataReply(
        trimmedQuestion,
        studentContext,
      );
      if (studentDataReply) {
        return studentDataReply;
      }
    }
    if (isShortlistCountQuestion(trimmedQuestion)) {
      return buildShortlistCountReply(studentContext.shortlistCount);
    }
    return buildDeterministicReply(trimmedQuestion);
  }
};
