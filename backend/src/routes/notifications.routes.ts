import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';
import { getMyNotifications } from '../controllers/notifications/notifications.controller.js';

const router = Router();

router.get('/', verifyToken, authorizeRole('student'), getMyNotifications);

export default router;
