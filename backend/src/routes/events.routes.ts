import { Router } from 'express';
import { verifytoken } from '../middlewares/authMiddleware.js';
import { authorizedrole } from '../middlewares/roleMiddleware.js';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  completeEventDrive,
  getMyPendingFeedbackForms,
  submitEventFeedback,
} from '../controllers/eventsection/events.controllers.js';

const router = Router();

// Create event (admin only)
router.post('/create', verifytoken, authorizedrole('admin'), createEvent);

// Get all events (authenticated users)
router.get('/', verifytoken, getAllEvents);

// Student feedback form APIs
router.get(
  '/feedback/pending',
  verifytoken,
  authorizedrole('student'),
  getMyPendingFeedbackForms,
);
router.post(
  '/:id/feedback',
  verifytoken,
  authorizedrole('student'),
  submitEventFeedback,
);

// Get event by ID (authenticated users)
router.get('/:id', verifytoken, getEventById);

// Update event (admin only)
router.put('/update/:id', verifytoken, authorizedrole('admin'), updateEvent);

// Delete event (admin only)
router.delete('/delete/:id', verifytoken, authorizedrole('admin'), deleteEvent);

// Complete drive and trigger feedback form availability (admin only)
router.post(
  '/:id/complete-drive',
  verifytoken,
  authorizedrole('admin'),
  completeEventDrive,
);

export default router;
