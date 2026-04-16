import { Router } from 'express';
import { verifytoken } from '../middlewares/authMiddleware.js';
import { authorizedrole } from '../middlewares/roleMiddleware.js';
import {
  createSession,
  markAttendance,
  getSessionAttendance,
  getEventSessions,
} from '../controllers/attendance/attendance.controllers.js';

const router = Router();

// Create attendance session (admin only)
router.post(
  '/create-session',
  verifytoken,
  authorizedrole('admin'),
  createSession,
);

// Mark attendance (students can mark their own attendance)
router.post('/mark-attendance', verifytoken, markAttendance);

// Get attendance records for a specific session (admin only)
router.get(
  '/session-attendance/:sessionId',
  verifytoken,
  authorizedrole('admin'),
  getSessionAttendance,
);

// Get all attendance sessions for an event (admin only)
router.get(
  '/event-sessions/:eventId',
  verifytoken,
  authorizedrole('admin'),
  getEventSessions,
);

export default router;
