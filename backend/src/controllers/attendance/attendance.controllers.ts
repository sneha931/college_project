import type { Request, Response } from 'express';
import prisma from '../../config/prismaconfig.js';
import Logger from '../../logger.js';
import { randomUUID } from 'crypto';

type AttendancePrismaCompat = typeof prisma & {
  attendanceSession: any;
  attendance: any;
};

const attendancePrisma = prisma as AttendancePrismaCompat;

/**
 * Create a new attendance session
 * POST /attendance/create-session
 * Body: { eventId: string }
 * Returns: { sessionId: string, message: string }
 */
export const createSession = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;

    // Validation
    if (!eventId) {
      return res.status(400).json({
        message: 'eventId is required',
      });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Generate unique session ID
    const sessionId = randomUUID();

    // Create attendance session in database
    const attendanceSession = await attendancePrisma.attendanceSession.create({
      data: {
        sessionId,
        eventId,
      },
    });

    Logger.info('Attendance session created', {
      sessionId,
      eventId,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      sessionId: attendanceSession.sessionId,
      message: 'Attendance session created successfully',
    });
  } catch (error) {
    Logger.error('Error creating attendance session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      message: 'Error creating attendance session',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Mark attendance for a student
 * POST /attendance/mark-attendance
 * Body: { studentId: string, sessionId: string }
 * Returns: { success: boolean, message: string }
 */
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, sessionId } = req.body;

    // Validation
    if (!studentId || !sessionId) {
      return res.status(400).json({
        message: 'studentId and sessionId are required',
      });
    }

    // Check if student exists
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    // Check if attendance session exists
    const attendanceSession =
      await attendancePrisma.attendanceSession.findUnique({
        where: { sessionId },
      });

    if (!attendanceSession) {
      return res.status(404).json({
        message: 'Attendance session not found',
      });
    }

    // Use the AttendanceSession primary key (id) for the FK — NOT the sessionId UUID
    const sessionPK = attendanceSession.id;

    // Check if student already marked attendance for this session
    const existingAttendance = await attendancePrisma.attendance.findUnique({
      where: {
        studentId_sessionId: {
          studentId,
          sessionId: sessionPK,
        },
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Student has already marked attendance for this session',
      });
    }

    // Create attendance record using the AttendanceSession PK as FK
    const attendance = await attendancePrisma.attendance.create({
      data: {
        studentId,
        sessionId: sessionPK,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            placementEmail: true,
          },
        },
      },
    });

    Logger.info('Attendance marked', {
      studentId,
      sessionId,
      timestamp: attendance.timestamp.toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        studentId: attendance.studentId,
        studentName: attendance.student.name,
        sessionId: attendance.sessionId,
        timestamp: attendance.timestamp,
      },
    });
  } catch (error) {
    Logger.error('Error marking attendance', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get attendance records for a session
 * GET /attendance/session-attendance/:sessionId
 * Returns: { success: boolean, data: Attendance[] }
 */
export const getSessionAttendance = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validation
    if (!sessionId) {
      return res.status(400).json({
        message: 'sessionId is required',
      });
    }

    // Check if attendance session exists
    const attendanceSession =
      await attendancePrisma.attendanceSession.findUnique({
        where: { sessionId },
        include: {
          event: {
            select: {
              id: true,
              companyName: true,
              venue: true,
              createdAt: true,
            },
          },
        },
      });

    if (!attendanceSession) {
      return res.status(404).json({
        message: 'Attendance session not found',
      });
    }

    // Get all attendance records for this session using the PK (id), not sessionId UUID
    const attendanceRecords = await attendancePrisma.attendance.findMany({
      where: { sessionId: attendanceSession.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            placementEmail: true,
            btechCGPA: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    Logger.info('Session attendance retrieved', {
      sessionId,
      count: attendanceRecords.length,
    });

    return res.status(200).json({
      success: true,
      sessionInfo: {
        sessionId: attendanceSession.sessionId,
        eventName: attendanceSession.event.companyName,
        venue: attendanceSession.event.venue,
        createdAt: attendanceSession.createdAt,
      },
      attendanceCount: attendanceRecords.length,
      students: attendanceRecords.map((record: any) => ({
        studentId: record.student.id,
        studentName: record.student.name,
        email: record.student.placementEmail,
        cgpa: record.student.btechCGPA,
        attendanceTime: record.timestamp,
      })),
    });
  } catch (error) {
    Logger.error('Error retrieving session attendance', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      message: 'Error retrieving session attendance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all attendance sessions for an event
 * GET /attendance/event-sessions/:eventId
 * Returns: { success: boolean, data: AttendanceSession[] }
 */
export const getEventSessions = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Validation
    if (!eventId) {
      return res.status(400).json({
        message: 'eventId is required',
      });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        message: 'Event not found',
      });
    }

    // Get all attendance sessions for this event
    const sessions = await attendancePrisma.attendanceSession.findMany({
      where: { eventId },
      include: {
        _count: {
          select: { attendance: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    Logger.info('Event attendance sessions retrieved', {
      eventId,
      sessionCount: sessions.length,
    });

    return res.status(200).json({
      success: true,
      eventInfo: {
        eventId: event.id,
        companyName: event.companyName,
        venue: event.venue,
      },
      sessions: sessions.map((session: any) => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        attendanceCount: session._count.attendance,
      })),
    });
  } catch (error) {
    Logger.error('Error retrieving event attendance sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      message: 'Error retrieving event attendance sessions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
