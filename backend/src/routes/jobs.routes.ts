import { Router } from 'express';
const router = Router();
import { verifytoken } from '../middlewares/authMiddleware.js';
import { authorizedrole } from '../middlewares/roleMiddleware.js';
import {
  createjobpost,
  alljobs,
  getjobbyid,
  updatejobpost,
  deletejobpost,
  getShortlist,
  regenerateShortlist,
  generateAllShortlists,
  getMyShortlistedJobs,
  scheduleInterviews,
  getCompanyAnalysis,
} from '../controllers/jobssection/jobposts.controllers.js';

router.post('/create', verifytoken, authorizedrole('admin'), createjobpost);
router.get('/', verifytoken, alljobs);
router.get(
  '/my-shortlisted',
  verifytoken,
  authorizedrole('student'),
  getMyShortlistedJobs,
);
router.get(
  '/analysis/companies',
  verifytoken,
  authorizedrole('student'),
  getCompanyAnalysis,
);
router.get('/:id', verifytoken, getjobbyid);
router.put('/update/:id', verifytoken, authorizedrole('admin'), updatejobpost);
router.delete(
  '/delete/:id',
  verifytoken,
  authorizedrole('admin'),
  deletejobpost,
);

// Shortlist endpoints (admin only)
router.post(
  '/shortlists/generate-all',
  verifytoken,
  authorizedrole('admin'),
  generateAllShortlists,
);
router.get(
  '/:id/shortlist',
  verifytoken,
  authorizedrole('admin'),
  getShortlist,
);
router.post(
  '/:id/shortlist/regenerate',
  verifytoken,
  authorizedrole('admin'),
  regenerateShortlist,
);

// Schedule interviews endpoint (admin only)
router.post(
  '/:id/schedule-interviews',
  verifytoken,
  authorizedrole('admin'),
  scheduleInterviews,
);

export default router;
