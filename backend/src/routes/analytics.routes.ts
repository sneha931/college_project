import { Router } from 'express';
import { getDashboardAnalytics, getYears } from '../controllers/analytics/analytics.controller.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = Router();

// Admin only routes
router.get('/dashboard', verifyToken, authorizeRole('admin'), getDashboardAnalytics);
router.get('/years', verifyToken, authorizeRole('admin'), getYears);

export default router;
