import type { Request, Response } from 'express';
import prisma from '../../config/prismaconfig.js';
import Logger from '../../logger.js';
import { generateshortlistexcel } from '../../service/shortlist.service.js';
import { runMatchingEngine } from '../../service/matching.service.js';
import { getCompanyAnalysisData } from '../../service/companyAnalysis.service.js';

export const createjobpost = async (req: Request, res: Response) => {
  const {
    companyname,
    jobrole,
    minMarks10,
    minMarks12,
    minCGPA,
    minExperience,
    skills,
    salary,
    description,
  } = req.body;
  try {
    const newjobpost = await prisma.jobPosts.create({
      data: {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        companyname,
        jobrole,
        minMarks10,
        minMarks12,
        minCGPA,
        minExperience,
        skills,
        salary,
        description,
        shortlistReady: false,
        updatedAt: new Date(),
      },
    });

    Logger.info('Job post created successfully, triggering matching engine', {
      id: newjobpost.id,
    });

    // Trigger matching engine asynchronously
    setImmediate(async () => {
      try {
        Logger.info('Starting matching engine for job', {
          jobId: newjobpost.id,
        });
        const matchResult = await runMatchingEngine(newjobpost.id);
        Logger.info('Matching engine completed', {
          jobId: newjobpost.id,
          matchedStudents: matchResult.matchedStudents,
          autoAppliedCount: matchResult.autoAppliedCount,
        });

        // Also generate Excel for backward compatibility
        await generateshortlistexcel(newjobpost.id);
      } catch (error) {
        Logger.error('Error in matching engine', {
          jobId: newjobpost.id,
          error,
        });
      }
    });

    return res.status(201).json({
      message: 'Job post created successfully',
      jobpost: newjobpost,
    });
  } catch (error) {
    Logger.error('Error creating job post', { error });
    return res.status(500).json({ message: 'Failed to create job post' });
  }
};

export const alljobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.jobPosts.findMany({
      where: {
        OR: [{ isExternal: false }, { isExternal: true, isApproved: true }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { jobMatchings: true },
        },
      },
    });

    // For students: get job IDs where they're shortlisted (auto-applied)
    let shortlistedJobIds: Set<string> = new Set();
    if (req.user?.role === 'student') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (studentProfile) {
        const matchings = await prisma.jobMatching.findMany({
          where: { studentId: studentProfile.id },
          select: { jobId: true },
        });
        shortlistedJobIds = new Set(matchings.map((m) => m.jobId));
      }
    }

    // Transform to include shortlistCount and isShortlisted (for students)
    const jobsWithCount = jobs.map((job) => ({
      ...job,
      shortlistCount: job._count.jobMatchings,
      isShortlisted: shortlistedJobIds.has(job.id),
      _count: undefined, // Remove the _count field
    }));

    Logger.info('Fetched all job posts', { count: jobs.length });
    return res.status(200).json({
      message: 'All job posts fetched successfully',
      count: jobs.length,
      jobs: jobsWithCount,
    });
  } catch (error) {
    Logger.error('Error fetching job posts', { error });
    return res.status(500).json({ message: 'Failed to fetch job posts' });
  }
};

export const getjobbyid = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Job ID is required' });
  }
  try {
    const job = await prisma.jobPosts.findUnique({
      where: { id },
    });
    if (!job || (job.isExternal && !job.isApproved)) {
      Logger.warn('Job post not found', { id });
      return res.status(404).json({ message: 'Job post not found' });
    }
    // For students: check if they're shortlisted (auto-applied) for this job
    let isShortlisted = false;
    if (req.user?.role === 'student') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (studentProfile) {
        const matching = await prisma.jobMatching.findFirst({
          where: {
            jobId: id,
            studentId: studentProfile.id,
          },
        });
        isShortlisted = !!matching;
      }
    }
    Logger.info('Fetched job post by ID', { id });
    return res.status(200).json({
      message: 'Job post fetched successfully',
      job: { ...job, isShortlisted },
    });
  } catch (error) {
    Logger.error('Error fetching job post by ID', { error });
    return res.status(500).json({ message: 'Failed to fetch job post' });
  }
};

export const updatejobpost = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    Logger.warn('Job ID is required for update');
    return res.status(400).json({ message: 'Job ID is required' });
  }
  const {
    companyname,
    jobrole,
    minMarks10,
    minMarks12,
    minCGPA,
    minExperience,
    skills,
    salary,
    description,
  } = req.body;
  try {
    const job = await prisma.jobPosts.findUnique({
      where: { id },
    });
    if (!job) {
      Logger.warn('Job post not found for update', { id });
      return res.status(404).json({ message: 'Job post not found' });
    }
    const updatejob = await prisma.jobPosts.update({
      where: { id },
      data: {
        companyname,
        jobrole,
        minMarks10,
        minMarks12,
        minCGPA,
        minExperience,
        skills,
        salary,
        description,
        shortlistReady: false, // Mark as not ready since criteria changed
        excelUrl: null, // Clear old excel
      },
    });

    // Regenerate matching with updated criteria
    Logger.info('Job post updated, triggering matching engine', {
      id: updatejob.id,
    });
    setImmediate(async () => {
      try {
        Logger.info('Starting matching engine for updated job', {
          jobId: updatejob.id,
        });
        const matchResult = await runMatchingEngine(updatejob.id);
        Logger.info('Matching engine completed', {
          jobId: updatejob.id,
          matchedStudents: matchResult.matchedStudents,
          autoAppliedCount: matchResult.autoAppliedCount,
        });

        // Also generate Excel for backward compatibility
        await generateshortlistexcel(updatejob.id);
      } catch (error) {
        Logger.error('Error in matching engine regeneration', {
          jobId: updatejob.id,
          error,
        });
      }
    });

    Logger.info('Job post updated successfully', { id: updatejob.id });
    return res.status(200).json({
      message: 'Job post updated successfully',
      jobpost: updatejob,
    });
  } catch (error) {
    Logger.error('Error updating job post', { error });
    return res.status(500).json({ message: 'Failed to update job post' });
  }
};

export const deletejobpost = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    Logger.warn('Job ID is required for deletion');
    return res.status(400).json({ message: 'Job ID is required' });
  }
  try {
    const deljob = await prisma.jobPosts.findUnique({
      where: { id },
    });
    if (!deljob) {
      Logger.warn('Job post not found for deletion', { id });
      return res.status(404).json({ message: 'Job post not found' });
    }
    await prisma.jobPosts.delete({
      where: { id },
    });
    Logger.info('Job post deleted successfully', { id });
    return res.status(200).json({
      message: 'Job post deleted successfully',
    });
  } catch (error) {
    Logger.error('Error deleting job post', { error });
    return res.status(500).json({ message: 'Failed to delete job post' });
  }
};

export const getShortlist = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Job ID is required' });
  }
  try {
    const job = await prisma.jobPosts.findUnique({
      where: { id },
      select: {
        id: true,
        companyname: true,
        jobrole: true,
        shortlistReady: true,
        excelUrl: true,
      },
    });

    if (!job) {
      Logger.warn('Job post not found for shortlist', { id });
      return res.status(404).json({ message: 'Job post not found' });
    }

    if (!job.shortlistReady) {
      return res.status(200).json({
        message: 'Shortlist is being generated. Please wait.',
        shortlistReady: false,
        job: job,
      });
    }

    // Get matched students — exclude those who completed AI interview and were NOT shortlisted.
    // Students with no interview scheduled (Interview is null) are always kept.
    const matchedStudents = await prisma.jobMatching.findMany({
      where: {
        jobId: id,
        NOT: {
          Interview: {
            status: 'COMPLETED',
            isShortlisted: false,
          },
        },
      },
      include: {
        student: {
          select: {
            name: true,
            placementEmail: true,
            marks10: true,
            marks12: true,
            diplomaMarks: true,
            btechCGPA: true,
            experience: true,
          },
        },
        Interview: {
          select: { status: true, isShortlisted: true, aiScore: true, verdict: true },
        },
      },
      orderBy: { score: 'desc' },
    });

    if (matchedStudents.length === 0) {
      return res.status(200).json({
        message: 'No eligible students found for this job.',
        shortlistReady: true,
        eligibleCount: 0,
        students: [],
        excelUrl: job.excelUrl,
        job: job,
      });
    }

    // Format the student data for frontend display
    const students = matchedStudents.map((match) => ({
      name: match.student.name,
      email: match.student.placementEmail,
      marks10: match.student.marks10,
      marks12: match.student.marks12,
      diplomaMarks: match.student.diplomaMarks,
      btechCGPA: match.student.btechCGPA,
      experience: match.student.experience,
      matchedSkills: match.matchedSkills,
      score: match.score,
      // AI interview result (null if interview not scheduled yet)
      interviewStatus: match.Interview?.status ?? null,
      interviewScore: match.Interview?.aiScore ?? null,
      interviewVerdict: match.Interview?.verdict ?? null,
    }));

    Logger.info('Shortlist fetched successfully', {
      id,
      matchCount: students.length,
    });
    return res.status(200).json({
      message: 'Shortlist fetched successfully',
      shortlistReady: true,
      eligibleCount: students.length,
      students: students,
      excelUrl: job.excelUrl,
      job: job,
    });
  } catch (error) {
    Logger.error('Error fetching shortlist', { error });
    return res.status(500).json({ message: 'Failed to fetch shortlist' });
  }
};

export const generateAllShortlists = async (req: Request, res: Response) => {
  try {
    // Find all jobs without shortlists
    const jobs = await prisma.jobPosts.findMany({
      where: {
        OR: [{ shortlistReady: false }, { excelUrl: null }],
      },
    });

    if (jobs.length === 0) {
      return res.status(200).json({
        message: 'All jobs already have shortlists generated.',
        count: 0,
      });
    }

    Logger.info('Generating shortlists for all jobs', { count: jobs.length });

    // Trigger generation for each job
    for (const job of jobs) {
      setImmediate(async () => {
        try {
          await generateshortlistexcel(job.id);
          Logger.info('Shortlist generated for job', {
            jobId: job.id,
            jobrole: job.jobrole,
          });
        } catch (error) {
          Logger.error('Error generating shortlist for job', {
            jobId: job.id,
            error,
          });
        }
      });
    }

    return res.status(200).json({
      message: `Shortlist generation started for ${jobs.length} jobs.`,
      count: jobs.length,
      jobIds: jobs.map((j) => j.id),
    });
  } catch (error) {
    Logger.error('Error generating all shortlists', { error });
    return res.status(500).json({ message: 'Failed to generate shortlists' });
  }
};

// Student-only: get job IDs the current student is shortlisted for (auto application)
export const getMyShortlistedJobs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return res.status(200).json({
        message: 'Shortlisted jobs fetched successfully',
        jobIds: [],
      });
    }

    const matchings = await prisma.jobMatching.findMany({
      where: { studentId: profile.id },
      select: { jobId: true },
    });

    const jobIds = matchings.map((m) => m.jobId);

    Logger.info('Student shortlisted jobs fetched', {
      userId,
      count: jobIds.length,
    });
    return res.status(200).json({
      message: 'Shortlisted jobs fetched successfully',
      jobIds,
    });
  } catch (error) {
    Logger.error('Error fetching student shortlisted jobs', { error });
    return res
      .status(500)
      .json({ message: 'Failed to fetch shortlisted jobs' });
  }
};

export const regenerateShortlist = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'Job ID is required' });
  }
  try {
    const job = await prisma.jobPosts.findUnique({
      where: { id },
    });

    if (!job) {
      Logger.warn('Job post not found for regeneration', { id });
      return res.status(404).json({ message: 'Job post not found' });
    }

    // Mark as not ready and trigger regeneration
    await prisma.jobPosts.update({
      where: { id },
      data: { shortlistReady: false, excelUrl: null },
    });

    // Trigger regeneration
    setImmediate(async () => {
      try {
        Logger.info('Starting manual shortlist regeneration', { jobId: id });
        await generateshortlistexcel(id);
        Logger.info('Manual shortlist regeneration completed', { jobId: id });
      } catch (error) {
        Logger.error('Error in manual shortlist regeneration', {
          jobId: id,
          error,
        });
      }
    });

    Logger.info('Shortlist regeneration triggered', { id });
    return res.status(200).json({
      message: 'Shortlist regeneration started. Please check back in a moment.',
      shortlistReady: false,
    });
  } catch (error) {
    Logger.error('Error regenerating shortlist', { error });
    return res.status(500).json({ message: 'Failed to regenerate shortlist' });
  }
};

export const scheduleInterviews = async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  const { studentEmails } = req.body;

  if (
    !jobId ||
    !studentEmails ||
    !Array.isArray(studentEmails) ||
    studentEmails.length === 0
  ) {
    return res.status(400).json({
      message: 'jobId and non-empty studentEmails array are required',
    });
  }

  try {
    const job = await prisma.jobPosts.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Generate interview scheduled time (current time + 7 days)
    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + 7);

    let successCount = 0;
    let failedCount = 0;

    // Schedule interviews for each student
    for (const email of studentEmails) {
      try {
        // Find student by email
        const student = await prisma.studentProfile.findUnique({
          where: { placementEmail: email },
        });

        if (!student) {
          failedCount++;
          continue;
        }

        // Find the job matching
        const jobMatching = await prisma.jobMatching.findFirst({
          where: {
            jobId,
            studentId: student.id,
          },
        });

        if (!jobMatching) {
          failedCount++;
          continue;
        }

        // Create interview record
        await prisma.interview.create({
          data: {
            id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            jobMatchingId: jobMatching.id,
            studentId: student.id,
            jobId,
            status: 'SCHEDULED',
            isShortlisted: true,
            startedAt: scheduledTime,
            updatedAt: new Date(),
          },
        });

        successCount++;
        Logger.info('Interview scheduled', { studentEmail: email, jobId });
      } catch (error) {
        Logger.error('Error scheduling interview for student', {
          email,
          error,
        });
        failedCount++;
      }
    }

    // Update job to mark interviews as scheduled
    await prisma.jobPosts.update({
      where: { id: jobId },
      data: { interviewScheduled: true },
    });

    return res.status(201).json({
      message: `Successfully scheduled ${successCount} interview${successCount !== 1 ? 's' : ''}`,
      scheduledCount: successCount,
      failedCount,
      scheduledTime: scheduledTime.toISOString(),
    });
  } catch (error) {
    Logger.error('Error in scheduleInterviews', { error });
    return res.status(500).json({
      message: 'Failed to schedule interviews',
    });
  }
};

export const getCompanyAnalysis = async (req: Request, res: Response) => {
  try {
    const analysis = await getCompanyAnalysisData(2);

    Logger.info('Company analysis fetched successfully', {
      count: analysis.totalCompanies,
      since: analysis.since,
    });

    return res.status(200).json({
      message: 'Company analysis fetched successfully',
      since: analysis.since,
      totalCompanies: analysis.totalCompanies,
      companies: analysis.companies,
    });
  } catch (error) {
    Logger.error('Error fetching company analysis', { error });
    return res.status(500).json({
      message: 'Failed to fetch company analysis',
    });
  }
};
