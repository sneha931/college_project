import type { Request, Response } from 'express';
import prisma from '../../config/prismaconfig.js';
import Logger from '../../logger.js';

// ---------------------------------------------------------------------------
// GET /notifications  — student: returns notifications derived from DB data
// ---------------------------------------------------------------------------
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Fetch interviews, upcoming events, recent jobs, and recent events in parallel
    const now = new Date();
    const in48h = new Date(now.getTime() + 1000 * 60 * 60 * 48);
    const sevenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);

    const [interviews, upcomingEvents, recentJobs, recentEvents] = await Promise.all([
      prisma.interview.findMany({
        where: { studentId: profile.id },
        include: {
          JobPosts: { select: { jobrole: true, companyname: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.event.findMany({
        where: {
          startTime: { gte: now, lte: in48h },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.jobPosts.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, jobrole: true, companyname: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, companyName: true, venue: true, startTime: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const notifications: {
      id: string;
      type: string;
      title: string;
      body: string;
      link?: string;
      createdAt: string;
    }[] = [];

    // Interview notifications
    for (const iv of interviews) {
      if (iv.status === 'SCHEDULED' || iv.status === 'IN_PROGRESS') {
        notifications.push({
          id: `iv_pending_${iv.id}`,
          type: 'interview_scheduled',
          title: 'Interview Ready',
          body: `${iv.JobPosts.companyname} — ${iv.JobPosts.jobrole}. Your interview is ready to begin.`,
          link: `/interview/${iv.id}`,
          createdAt: iv.updatedAt.toISOString(),
        });
      } else if (iv.status === 'COMPLETED') {
        const cleared = iv.isShortlisted;
        notifications.push({
          id: `iv_done_${iv.id}`,
          type: 'interview_result',
          title: cleared ? 'You Cleared 1st Round!' : 'Interview Result',
          body: cleared
            ? `Congratulations! You scored ${iv.aiScore}/100 for ${iv.JobPosts.companyname}. You are shortlisted.`
            : `You scored ${iv.aiScore}/100 for ${iv.JobPosts.companyname}. Keep improving!`,
          link: `/interview/${iv.id}`,
          createdAt: (iv.completedAt ?? iv.updatedAt).toISOString(),
        });
      }
    }

    // Event reminders (upcoming within 48h)
    for (const ev of upcomingEvents) {
      notifications.push({
        id: `ev_reminder_${ev.id}`,
        type: 'event_reminder',
        title: 'Upcoming Event',
        body: `${ev.companyName} placement drive at ${ev.venue} is coming up soon.`,
        createdAt: ev.startTime.toISOString(),
      });
    }

    // New jobs posted in last 7 days
    for (const job of recentJobs) {
      notifications.push({
        id: `new_job_${job.id}`,
        type: 'new_job',
        title: 'New Job Posted',
        body: `${job.companyname} is hiring for ${job.jobrole}. Check it out!`,
        link: `/jobs/${job.id}`,
        createdAt: job.createdAt.toISOString(),
      });
    }

    // New events added in last 7 days (skip those already shown as upcoming reminders)
    const upcomingEventIds = new Set(upcomingEvents.map((e) => e.id));
    for (const ev of recentEvents) {
      if (upcomingEventIds.has(ev.id)) continue;
      notifications.push({
        id: `new_event_${ev.id}`,
        type: 'new_event',
        title: 'New Event Added',
        body: `${ev.companyName} placement drive at ${ev.venue} on ${ev.startTime.toLocaleDateString()}.`,
        createdAt: ev.createdAt.toISOString(),
      });
    }

    // Sort newest first
    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.json({
      message: 'Notifications fetched',
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    Logger.error('getMyNotifications error', { error });
    return res.status(500).json({ message: 'Error fetching notifications' });
  }
};
