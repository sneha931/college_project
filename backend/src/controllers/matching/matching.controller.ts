import type { Request, Response } from "express";
import Logger from "../../logger.js";
import {
  runMatchingEngine,
  getJobMatches,
  getStudentMatches,
  getStudentJobMatch,
} from "../../service/matching.service.js";
import prisma from "../../config/prismaconfig.js";

/**
 * Manually trigger matching engine for a specific job (admin only)
 * POST /matching/run/:jobId
 */
export const triggerMatching = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    // Verify job exists
    const job = await prisma.jobPosts.findUnique({
      where: { id: jobId },
      select: { id: true, jobrole: true, companyname: true },
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    Logger.info("Manual matching engine triggered", { jobId, admin: req.user.id });

    const result = await runMatchingEngine(jobId);

    return res.status(200).json({
      message: "Matching engine completed successfully",
      result,
    });
  } catch (error) {
    Logger.error("Error triggering matching engine", { error });
    return res.status(500).json({
      message: "Failed to run matching engine",
    });
  }
};

/**
 * Get all matches for a job (admin view)
 * GET /matching/job/:jobId
 */
export const getMatchesForJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const matches = await getJobMatches(jobId);

    return res.status(200).json({
      message: "Job matches retrieved successfully",
      count: matches.length,
      matches,
    });
  } catch (error) {
    Logger.error("Error fetching job matches", { error });
    return res.status(500).json({
      message: "Failed to fetch job matches",
    });
  }
};

/**
 * Get all matches for current student
 * GET /matching/my-matches
 */
export const getMyMatches = async (req: Request, res: Response) => {
  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const matches = await getStudentMatches(studentProfile.id);

    return res.status(200).json({
      message: "Your job matches retrieved successfully",
      count: matches.length,
      matches,
    });
  } catch (error) {
    Logger.error("Error fetching student matches", { error });
    return res.status(500).json({
      message: "Failed to fetch your matches",
    });
  }
};

/**
 * Get match details for a specific job (student view)
 * GET /matching/job/:jobId/me
 */
export const getMyJobMatch = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID is required" });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const match = await getStudentJobMatch(studentProfile.id, jobId);

    if (!match) {
      return res.status(404).json({
        message: "No match found for this job",
      });
    }

    return res.status(200).json({
      message: "Match details retrieved successfully",
      match,
    });
  } catch (error) {
    Logger.error("Error fetching job match", { error });
    return res.status(500).json({
      message: "Failed to fetch match details",
    });
  }
};
