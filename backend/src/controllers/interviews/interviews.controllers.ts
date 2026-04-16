import type { Request, Response } from 'express';
import prisma from '../../config/prismaconfig.js';
import Logger from '../../logger.js';
import OpenAI from 'openai';

const ai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = process.env.OPENROUTER_MODEL_ID ?? 'x-ai/grok-3-mini';
const TOTAL_QUESTIONS = 5;
const PASS_THRESHOLD = 50;

const FALLBACK_QUESTION_BANK = [
  'What is the difference between an abstract class and an interface? When would you use each?',
  'Explain the concept of polymorphism with a real-world example.',
  'What is the difference between stack memory and heap memory?',
  'How does indexing improve database query performance?',
  'What is the difference between synchronous and asynchronous programming?',
  'How do you handle errors and exceptions in your application?',
  'What is a race condition and how can you prevent it?',
  'How does authentication differ from authorization?',
  'What is normalization in databases and why is it used?',
  'Explain time complexity with an example of O(n log n).',
];

// ---------------------------------------------------------------------------
// AI helpers
// ---------------------------------------------------------------------------
async function generateInterviewQuestion(
  jobRole: string,
  skills: string[],
  previousQuestions: string[],
): Promise<string> {
  const prev =
    previousQuestions.length > 0
      ? `Previously asked questions (do NOT repeat):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : 'This is the first question.';

  const prompt = `You are a strict technical interviewer for the role of "${jobRole}".
Required skills: ${skills.join(', ') || jobRole + ' core concepts'}.
${prev}

Generate ONE concise technical interview question SPECIFICALLY about "${jobRole}" technologies or the listed skills.
Do NOT ask about unrelated languages or frameworks.
Return ONLY the question text — no numbering, no preamble.`;

  try {
    const completion = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.8,
    });

    const aiQuestion = (completion.choices[0]?.message?.content ?? '').trim();
    if (aiQuestion.length > 0) {
      return aiQuestion;
    }
  } catch (error) {
    Logger.warn('AI question generation failed, using fallback question', {
      error,
      jobRole,
    });
  }

  // Fallback keeps the interview usable even when AI provider is unavailable.
  const used = new Set(previousQuestions.map((q) => q.toLowerCase()));
  const skillHint = skills.find((s) => s && s.trim().length > 0);
  const roleQuestion = `For a ${jobRole} role, explain one practical use-case of ${skillHint ?? 'a core technical skill'} and how you would implement it.`;
  if (!used.has(roleQuestion.toLowerCase())) {
    return roleQuestion;
  }

  const nextGeneric = FALLBACK_QUESTION_BANK.find(
    (q) => !used.has(q.toLowerCase()),
  );
  return (
    nextGeneric ??
    'Describe a challenging technical problem you solved and how you approached it.'
  );
}

async function evaluateAnswer(
  jobRole: string,
  question: string,
  answer: string,
): Promise<{ score: number; feedback: string }> {
  const prompt = `You are a technical interviewer evaluating an answer for the role of "${jobRole}".

Question: ${question}
Candidate's Answer: ${answer}

Respond in this EXACT JSON format only (no markdown, no extra text):
{"score": <integer 0-10>, "feedback": "<one sentence feedback>"}

Score guide: 0-3 wrong, 4-6 partial, 7-8 good, 9-10 excellent.`;

  try {
    const completion = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    });

    const raw = (completion.choices[0]?.message?.content ?? '').trim();
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw) as {
        score: unknown;
        feedback: unknown;
      };
      return {
        score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
        feedback: String(parsed.feedback ?? 'No feedback provided.'),
      };
    } catch {
      Logger.warn(
        'Failed to parse AI evaluation JSON, defaulting to heuristic score',
      );
    }
  } catch (error) {
    Logger.warn('AI answer evaluation failed, defaulting to heuristic score', {
      error,
      jobRole,
    });
  }

  // Simple deterministic fallback scoring to keep interview progress unblocked.
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const lower = answer.toLowerCase();
  const signals = [
    'because',
    'example',
    'implement',
    'tradeoff',
    'performance',
    'complexity',
  ];
  const signalHits = signals.reduce(
    (acc, token) => (lower.includes(token) ? acc + 1 : acc),
    0,
  );
  const base = Math.min(7, Math.floor(wordCount / 20));
  const score = Math.max(3, Math.min(9, base + signalHits));

  return {
    score,
    feedback:
      score >= 7
        ? 'Good attempt with relevant points. Add more concrete examples for stronger impact.'
        : 'Your answer is partially correct. Add more technical depth and a practical example.',
  };
}

// ---------------------------------------------------------------------------
// GET /interviews/all
// ---------------------------------------------------------------------------
export const getAllInterviews = async (_req: Request, res: Response) => {
  try {
    const interviews = await prisma.interview.findMany({
      include: {
        StudentProfile: {
          select: { name: true, placementEmail: true, btechCGPA: true },
        },
        JobPosts: { select: { jobrole: true, companyname: true } },
        InterviewAnswer: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      message: 'Interviews fetched',
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    Logger.error('getAllInterviews error', { error });
    return res.status(500).json({ message: 'Error fetching interviews' });
  }
};

// ---------------------------------------------------------------------------
// GET /interviews/job/:jobId
// ---------------------------------------------------------------------------
export const getJobInterviews = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const interviews = await prisma.interview.findMany({
      where: { jobId },
      include: {
        StudentProfile: {
          select: { name: true, placementEmail: true, btechCGPA: true },
        },
        JobPosts: { select: { jobrole: true, companyname: true } },
        InterviewAnswer: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      message: 'Interviews fetched',
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    Logger.error('getJobInterviews error', { error });
    return res.status(500).json({ message: 'Error fetching interviews' });
  }
};

// ---------------------------------------------------------------------------
// GET /interviews/my-interviews  — student: ALL my interviews
// ---------------------------------------------------------------------------
export const getMyInterviews = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      return res.status(404).json({ message: 'Student profile not found' });

    const interviews = await prisma.interview.findMany({
      where: { studentId: profile.id },
      include: {
        JobPosts: {
          select: { jobrole: true, companyname: true, skills: true },
        },
        InterviewAnswer: { select: { score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      message: 'Interviews fetched',
      count: interviews.length,
      interviews,
    });
  } catch (error) {
    Logger.error('getMyInterviews error', { error });
    return res.status(500).json({ message: 'Error fetching interviews' });
  }
};

// ---------------------------------------------------------------------------
// GET /interviews/my-interview/:jobId  — student
// ---------------------------------------------------------------------------
export const getMyInterview = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      return res.status(404).json({ message: 'Student profile not found' });

    const interview = await prisma.interview.findFirst({
      where: { jobId, studentId: profile.id },
      include: {
        JobPosts: { select: { jobrole: true, companyname: true } },
        InterviewAnswer: { orderBy: { createdAt: 'asc' } },
      },
    });

    return res.json({
      message: 'Interview fetched',
      interview: interview ?? null,
    });
  } catch (error) {
    Logger.error('getMyInterview error', { error });
    return res.status(500).json({ message: 'Error fetching interview' });
  }
};

// ---------------------------------------------------------------------------
// GET /interviews/:id
// ---------------------------------------------------------------------------
export const getInterview = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        JobPosts: {
          select: { jobrole: true, companyname: true, skills: true },
        },
        StudentProfile: {
          select: { name: true, placementEmail: true, btechCGPA: true },
        },
        InterviewAnswer: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!interview)
      return res.status(404).json({ message: 'Interview not found' });
    return res.json({ message: 'Interview fetched', interview });
  } catch (error) {
    Logger.error('getInterview error', { error });
    return res.status(500).json({ message: 'Error fetching interview' });
  }
};

// ---------------------------------------------------------------------------
// POST /interviews/:id/start
// ---------------------------------------------------------------------------
export const startInterview = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        JobPosts: {
          select: { jobrole: true, companyname: true, skills: true },
        },
      },
    });

    if (!interview)
      return res.status(404).json({ message: 'Interview not found' });
    if (interview.status === 'COMPLETED' || interview.status === 'TERMINATED') {
      return res.status(400).json({ message: 'Interview is already finished' });
    }
    if (interview.status === 'IN_PROGRESS') {
      return res.json({ message: 'Interview already in progress', interview });
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        JobPosts: {
          select: { jobrole: true, companyname: true, skills: true },
        },
      },
    });

    Logger.info('Interview started', { interviewId: id });
    return res.json({ message: 'Interview started', interview: updated });
  } catch (error) {
    Logger.error('startInterview error', { error });
    return res.status(500).json({ message: 'Error starting interview' });
  }
};

// ---------------------------------------------------------------------------
// GET /interviews/:id/question
// ---------------------------------------------------------------------------
export const getNextQuestion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        JobPosts: { select: { jobrole: true, skills: true } },
        InterviewAnswer: {
          select: { question: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!interview)
      return res.status(404).json({ message: 'Interview not found' });
    if (interview.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Interview is not in progress' });
    }

    const answeredCount = interview.InterviewAnswer.length;
    if (answeredCount >= TOTAL_QUESTIONS) {
      return res.json({
        done: true,
        questionNumber: answeredCount,
        totalQuestions: TOTAL_QUESTIONS,
      });
    }

    const previousQuestions = interview.InterviewAnswer.map((a) => a.question);
    const question = await generateInterviewQuestion(
      interview.JobPosts.jobrole,
      interview.JobPosts.skills,
      previousQuestions,
    );

    return res.json({
      done: false,
      questionNumber: answeredCount + 1,
      totalQuestions: TOTAL_QUESTIONS,
      question,
    });
  } catch (error) {
    Logger.error('getNextQuestion error', { error });
    return res.status(500).json({ message: 'Error generating question' });
  }
};

// ---------------------------------------------------------------------------
// POST /interviews/answer
// ---------------------------------------------------------------------------
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { interviewId, question, transcript, score: preScore, feedback: preFeedback } = req.body as {
      interviewId?: string;
      question?: string;
      transcript?: string;
      score?: number;
      feedback?: string;
    };

    if (!interviewId || !question || !transcript) {
      return res
        .status(400)
        .json({
          message: 'interviewId, question, and transcript are required',
        });
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        JobPosts: { select: { jobrole: true } },
        InterviewAnswer: { select: { id: true } },
      },
    });

    if (!interview)
      return res.status(404).json({ message: 'Interview not found' });
    if (interview.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Interview is not in progress' });
    }
    if (interview.InterviewAnswer.length >= TOTAL_QUESTIONS) {
      return res
        .status(400)
        .json({ message: 'All questions already answered' });
    }

    let score: number;
    let feedback: string;

    if (preScore !== undefined && preFeedback !== undefined) {
      // Score pre-evaluated by OpenRouter in the AI interview frontend
      score = Math.min(10, Math.max(0, Number(preScore) || 0));
      feedback = String(preFeedback);
    } else {
      // Fallback: evaluate on the backend (text-based interview flow)
      const evaluated = await evaluateAnswer(interview.JobPosts.jobrole, question, transcript);
      score = evaluated.score;
      feedback = evaluated.feedback;
    }

    const answerId = `ans_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const answer = await prisma.interviewAnswer.create({
      data: {
        id: answerId,
        interviewId,
        question,
        transcript,
        score,
        feedback,
      },
    });

    Logger.info('Answer submitted', { interviewId, score });
    return res.status(201).json({
      message: 'Answer submitted',
      score,
      feedback,
      answerId: answer.id,
      answeredCount: interview.InterviewAnswer.length + 1,
      totalQuestions: TOTAL_QUESTIONS,
    });
  } catch (error) {
    Logger.error('submitAnswer error', { error });
    return res.status(500).json({ message: 'Error submitting answer' });
  }
};

// ---------------------------------------------------------------------------
// POST /interviews/:id/complete
// ---------------------------------------------------------------------------
export const completeInterview = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { InterviewAnswer: { select: { score: true } } },
    });

    if (!interview)
      return res.status(404).json({ message: 'Interview not found' });
    if (interview.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Interview already completed' });
    }
    if (interview.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Interview is not in progress' });
    }
    if (interview.InterviewAnswer.length === 0) {
      return res.status(400).json({ message: 'No answers submitted yet' });
    }

    // Calculate final score: average of per-question scores (0-10) scaled to 0-100
    const totalAnswers = interview.InterviewAnswer.length;
    const avgRaw =
      interview.InterviewAnswer.reduce(
        (sum: number, a: { score: number }) => sum + a.score,
        0,
      ) / totalAnswers;
    const aiScore = Math.round(avgRaw * 10); // 0-100
    const isShortlisted = aiScore >= PASS_THRESHOLD;
    const verdict = isShortlisted ? 'Cleared 1st Round' : 'Not Cleared';

    // Update Interview record with final score, verdict, and shortlist status
    const updated = await prisma.interview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        aiScore,
        finalScore: aiScore,
        verdict,
        isShortlisted,
        updatedAt: new Date(),
      },
      include: {
        StudentProfile: { select: { name: true, placementEmail: true } },
        JobPosts: { select: { jobrole: true, companyname: true } },
        InterviewAnswer: { orderBy: { createdAt: 'asc' } },
      },
    });

    Logger.info('Interview completed', {
      interviewId: id,
      aiScore,
      verdict,
      answersCount: totalAnswers,
    });
    return res.json({
      message: 'Interview completed',
      aiScore,
      verdict,
      isShortlisted,
      interview: updated,
    });
  } catch (error) {
    Logger.error('completeInterview error', { error });
    return res.status(500).json({ message: 'Error completing interview' });
  }
};
