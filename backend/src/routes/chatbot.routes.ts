import { Router } from 'express';
import { askStudentChatbot } from '../controllers/chatbot/chatbot.controller.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = Router();

router.post('/ask', verifyToken, authorizeRole('student'), askStudentChatbot);

export default router;
