import { Router } from 'express';
import {
  importExternalJobs,
  getPendingJobs,
  approveJob,
  rejectJob,
  getApprovedJobs,
  previewExternalJobs,
} from '../controllers/externaljobs/externalJobs.controller.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { authorizeRole } from '../middlewares/roleMiddleware.js';

const router = Router();

// All routes are admin-only
router.use(verifyToken, authorizeRole('admin'));

// Preview external jobs before importing
router.get('/preview', previewExternalJobs);

// Import external jobs from third-party API
router.post('/import', importExternalJobs);

// Get pending external jobs (awaiting approval)
router.get('/pending', getPendingJobs);

// Get approved external jobs
router.get('/approved', getApprovedJobs);

// Approve external job
router.post('/:id/approve', approveJob);

// Reject external job
router.delete('/:id/reject', rejectJob);

export default router;
