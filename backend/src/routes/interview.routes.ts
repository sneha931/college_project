import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';
import {
  getAllInterviews,
  getJobInterviews,
  getMyInterview,
  getMyInterviews,
  getInterview,
  startInterview,
  getNextQuestion,
  submitAnswer,
  completeInterview,
} from '../controllers/interviews/interviews.controllers.js';

const router = Router();

// All routes require JWT
router.use(verifyToken);

// Admin only
router.get('/all', authorizeRole('admin'), getAllInterviews);
router.get('/job/:jobId', authorizeRole('admin'), getJobInterviews);

// Student only
router.get('/my-interviews', authorizeRole('student'), getMyInterviews);
router.get('/my-interview/:jobId', authorizeRole('student'), getMyInterview);
router.post('/:id/start', authorizeRole('student'), startInterview);
router.get('/:id/question', authorizeRole('student'), getNextQuestion);
router.post('/answer', authorizeRole('student'), submitAnswer);
router.post('/:id/complete', authorizeRole('student'), completeInterview);

// Shared (admin can view any interview)
router.get('/:id', getInterview);

export default router;
