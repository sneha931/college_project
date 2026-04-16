import { Router } from "express";
import { verifytoken } from "../middlewares/authMiddleware.js";
import { authorizedrole } from "../middlewares/roleMiddleware.js";
import {
  triggerMatching,
  getMatchesForJob,
  getMyMatches,
  getMyJobMatch,
} from "../controllers/matching/matching.controller.js";

const router = Router();

// Admin: manually trigger matching for a job
router.post(
  "/run/:jobId",
  verifytoken,
  authorizedrole("admin"),
  triggerMatching,
);

// Admin: get all matches for a specific job
router.get(
  "/job/:jobId",
  verifytoken,
  authorizedrole("admin"),
  getMatchesForJob,
);

// Student: get all their matches
router.get("/my-matches", verifytoken, authorizedrole("student"), getMyMatches);

// Student: get match details for a specific job
router.get(
  "/job/:jobId/me",
  verifytoken,
  authorizedrole("student"),
  getMyJobMatch,
);

export default router;
