import type { Request, Response } from 'express';
import prisma from '../../config/prismaconfig.js';
import Logger from '../../logger.js';

const normalize = (value: string) => value.trim().toLowerCase();
const JOB_LINK_PREFIX = '__JOB_ID__:';

const extractLinkedJobId = (processOfDay: string) => {
  const firstLine = processOfDay
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine || !firstLine.startsWith(JOB_LINK_PREFIX)) {
    return null;
  }

  const linkedJobId = firstLine.slice(JOB_LINK_PREFIX.length).trim();
  return linkedJobId.length > 0 ? linkedJobId : null;
};

const getEligibleStudentIdsForJob = async (jobId: string) => {
  const shortlistRows = await prisma.jobMatching.findMany({
    where: {
      jobId,
    },
    select: {
      studentId: true,
    },
    distinct: ['studentId'],
  });

  return shortlistRows.map((row) => row.studentId);
};

const getEligibleStudentIdsForCompany = async (companyName: string) => {
  const shortlistRows = await prisma.jobMatching.findMany({
    where: {
      job: {
        companyname: {
          equals: companyName,
          mode: 'insensitive',
        },
      },
    },
    select: {
      studentId: true,
    },
    distinct: ['studentId'],
  });

  return shortlistRows.map((row) => row.studentId);
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { venue, companyName, startTime, processOfDay } = req.body;

    const extractedJobId =
      typeof processOfDay === 'string'
        ? extractLinkedJobId(processOfDay)
        : null;
    const linkedJob = extractedJobId
      ? await prisma.jobPosts.findUnique({
          where: { id: extractedJobId },
          select: {
            id: true,
            companyname: true,
          },
        })
      : null;

    if (extractedJobId && !linkedJob) {
      return res.status(404).json({ message: 'Linked job post not found' });
    }

    const normalizedCompanyName =
      linkedJob?.companyname ?? String(companyName).trim();

    // Validation
    if (!venue || !normalizedCompanyName || !startTime || !processOfDay) {
      return res.status(400).json({
        message:
          'All fields are required: venue, companyName, startTime, processOfDay',
      });
    }

    // Validate startTime is a valid date
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return res.status(400).json({
        message: 'Invalid startTime format. Please provide a valid date/time.',
      });
    }

    const newEvent = await prisma.event.create({
      data: {
        venue: String(venue).trim(),
        companyName: normalizedCompanyName,
        startTime: startTimeDate,
        processOfDay: String(processOfDay).trim(),
      },
    });

    Logger.info('Event created successfully', { id: newEvent.id });
    return res.status(201).json({
      message: 'Event created successfully',
      event: newEvent,
    });
  } catch (error) {
    Logger.error('Error creating event', { error });
    return res.status(500).json({ message: 'Failed to create event' });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        startTime: 'asc',
      },
    });

    Logger.info('Events fetched successfully', { count: events.length });
    return res.status(200).json({
      message: 'Events fetched successfully',
      count: events.length,
      events,
    });
  } catch (error) {
    Logger.error('Error fetching events', { error });
    return res.status(500).json({ message: 'Failed to fetch events' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      Logger.warn('Event not found', { id });
      return res.status(404).json({ message: 'Event not found' });
    }

    Logger.info('Event fetched successfully', { id });
    return res.status(200).json({
      message: 'Event fetched successfully',
      event,
    });
  } catch (error) {
    Logger.error('Error fetching event', { error });
    return res.status(500).json({ message: 'Failed to fetch event' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { venue, companyName, startTime, processOfDay } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Prepare update data
    const updateData: {
      venue?: string;
      companyName?: string;
      startTime?: Date;
      processOfDay?: string;
    } = {};

    if (venue !== undefined) updateData.venue = String(venue).trim();
    if (companyName !== undefined)
      updateData.companyName = String(companyName).trim();
    if (processOfDay !== undefined)
      updateData.processOfDay = String(processOfDay).trim();

    if (startTime !== undefined) {
      const startTimeDate = new Date(startTime);
      if (isNaN(startTimeDate.getTime())) {
        return res.status(400).json({
          message:
            'Invalid startTime format. Please provide a valid date/time.',
        });
      }
      updateData.startTime = startTimeDate;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: id },
      data: updateData,
    });

    Logger.info('Event updated successfully', { id });
    return res.status(200).json({
      message: 'Event updated successfully',
      event: updatedEvent,
    });
  } catch (error) {
    Logger.error('Error updating event', { error });
    return res.status(500).json({ message: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await prisma.event.delete({
      where: { id: id },
    });

    Logger.info('Event deleted successfully', { id });
    return res.status(200).json({
      message: 'Event deleted successfully',
    });
  } catch (error) {
    Logger.error('Error deleting event', { error });
    return res.status(500).json({ message: 'Failed to delete event' });
  }
};

export const completeEventDrive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const linkedJobId = extractLinkedJobId(event.processOfDay);
    const eligibleStudentIds = linkedJobId
      ? await getEligibleStudentIdsForJob(linkedJobId)
      : await getEligibleStudentIdsForCompany(event.companyName);

    const now = new Date();
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        driveCompletedAt: now,
        feedbackRequestsSentAt: now,
      },
    });

    Logger.info('Event drive completed and feedback requests prepared', {
      eventId: id,
      jobId: linkedJobId,
      companyName: event.companyName,
      notifiedCount: eligibleStudentIds.length,
      adminId: req.user.id,
    });

    return res.status(200).json({
      message:
        'Event drive completed and feedback form sent to shortlisted students',
      event: updatedEvent,
      notifiedCount: eligibleStudentIds.length,
    });
  } catch (error) {
    Logger.error('Error completing event drive', {
      error,
      adminId: req.user?.id,
    });
    return res.status(500).json({
      message: 'Failed to complete event drive',
    });
  }
};

export const getMyPendingFeedbackForms = async (
  req: Request,
  res: Response,
) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        jobMatchings: {
          select: {
            jobId: true,
            job: {
              select: {
                companyname: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const shortlistedCompanies = new Set(
      profile.jobMatchings.map((matching) => normalize(matching.job.companyname)),
    );
    const shortlistedJobIds = new Set(
      profile.jobMatchings.map((matching) => matching.jobId),
    );

    if (shortlistedCompanies.size === 0 && shortlistedJobIds.size === 0) {
      return res.status(200).json({
        message: 'Pending feedback forms fetched successfully',
        count: 0,
        events: [],
      });
    }

    const completedEvents = await prisma.event.findMany({
      where: {
        driveCompletedAt: {
          not: null,
        },
      },
      orderBy: {
        driveCompletedAt: 'desc',
      },
    });

    const feedbacks = await prisma.eventFeedback.findMany({
      where: {
        studentId: profile.id,
      },
      select: {
        eventId: true,
      },
    });

    const submittedEventIds = new Set(feedbacks.map((f) => f.eventId));
    const pendingEvents = completedEvents.filter((event) => {
      const linkedJobId = extractLinkedJobId(event.processOfDay);
      const isEligible = linkedJobId
        ? shortlistedJobIds.has(linkedJobId)
        : shortlistedCompanies.has(normalize(event.companyName));

      return isEligible && !submittedEventIds.has(event.id);
    });

    return res.status(200).json({
      message: 'Pending feedback forms fetched successfully',
      count: pendingEvents.length,
      events: pendingEvents,
    });
  } catch (error) {
    Logger.error('Error fetching pending feedback forms', {
      error,
      studentId: req.user?.id,
    });
    return res.status(500).json({
      message: 'Failed to fetch pending feedback forms',
    });
  }
};

export const submitEventFeedback = async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { rating, interviewReview, preparationTopics } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5',
      });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        jobMatchings: {
          select: {
            jobId: true,
            job: {
              select: {
                companyname: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.driveCompletedAt) {
      return res.status(400).json({
        message: 'Feedback form is not available until drive completion',
      });
    }

    const shortlistedCompanies = new Set(
      profile.jobMatchings.map((matching) => normalize(matching.job.companyname)),
    );
    const shortlistedJobIds = new Set(
      profile.jobMatchings.map((matching) => matching.jobId),
    );

    const linkedJobId = extractLinkedJobId(event.processOfDay);
    const isEligibleForEvent = linkedJobId
      ? shortlistedJobIds.has(linkedJobId)
      : shortlistedCompanies.has(normalize(event.companyName));

    if (!isEligibleForEvent) {
      return res.status(403).json({
        message: "You are not shortlisted for this company's drive",
      });
    }

    const existingFeedback = await prisma.eventFeedback.findUnique({
      where: {
        eventId_studentId: {
          eventId,
          studentId: profile.id,
        },
      },
      select: { id: true },
    });

    if (existingFeedback) {
      return res.status(409).json({
        message: 'Feedback already submitted for this event',
      });
    }

    const feedback = await prisma.eventFeedback.create({
      data: {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        studentId: profile.id,
        rating: Number(rating),
        interviewReview:
          typeof interviewReview === 'string' &&
          interviewReview.trim().length > 0
            ? interviewReview.trim()
            : null,
        preparationTopics:
          typeof preparationTopics === 'string' &&
          preparationTopics.trim().length > 0
            ? preparationTopics.trim()
            : null,
        updatedAt: new Date(),
      },
    });

    Logger.info('Event feedback submitted', {
      eventId,
      studentId: profile.id,
    });

    return res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (error) {
    Logger.error('Error submitting event feedback', {
      error,
      studentId: req.user?.id,
    });
    return res.status(500).json({
      message: 'Failed to submit event feedback',
    });
  }
};
