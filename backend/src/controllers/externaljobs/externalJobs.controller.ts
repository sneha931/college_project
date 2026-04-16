import type { Request, Response } from 'express';
import {
  fetchExternalJobs,
  saveExternalJobs,
  getPendingExternalJobs,
  approveExternalJob,
  rejectExternalJob,
  getApprovedExternalJobs,
} from '../../service/externalJobs.service.js';
import Logger from '../../logger.js';

/**
 * Fetch and import external jobs (Admin only)
 */
export const importExternalJobs = async (req: Request, res: Response) => {
  try {
    const { source = 'theirstack' } = req.body;
    Logger.info(
      `Admin ${req.user?.id} initiating external job import from ${source}`,
    );

    const result = await saveExternalJobs(source);

    res.status(200).json({
      success: true,
      message: `Import complete: ${result.saved} jobs saved, ${result.skipped} skipped, ${result.errors} errors`,
      data: result,
    });
  } catch (error) {
    Logger.error('Error in importExternalJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import external jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all pending external jobs (Admin only)
 */
export const getPendingJobs = async (req: Request, res: Response) => {
  try {
    const pendingJobs = await getPendingExternalJobs();

    res.status(200).json({
      success: true,
      count: pendingJobs.length,
      jobs: pendingJobs,
    });
  } catch (error) {
    Logger.error('Error in getPendingJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Approve external job (Admin only)
 */
export const approveJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Job ID is required' });
    }

    Logger.info(`Admin ${req.user?.id} approving external job ${id}`);

    const approvedJob = await approveExternalJob(id);

    res.status(200).json({
      success: true,
      message: 'External job approved successfully',
      job: approvedJob,
    });
  } catch (error) {
    Logger.error('Error in approveJob:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to approve job',
    });
  }
};

/**
 * Reject external job (Admin only)
 */
export const rejectJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: 'Job ID is required' });
    }

    Logger.info(`Admin ${req.user?.id} rejecting external job ${id}`);

    await rejectExternalJob(id);

    res.status(200).json({
      success: true,
      message: 'External job rejected and deleted successfully',
    });
  } catch (error) {
    Logger.error('Error in rejectJob:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reject job',
    });
  }
};

/**
 * Get all approved external jobs (Admin only)
 */
export const getApprovedJobs = async (req: Request, res: Response) => {
  try {
    const approvedJobs = await getApprovedExternalJobs();

    res.status(200).json({
      success: true,
      count: approvedJobs.length,
      jobs: approvedJobs,
    });
  } catch (error) {
    Logger.error('Error in getApprovedJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Preview external jobs without saving (Admin only)
 */
export const previewExternalJobs = async (req: Request, res: Response) => {
  try {
    const { source = 'theirstack' } = req.query;

    Logger.info(
      `Admin ${req.user?.id} previewing external jobs from ${source}`,
    );

    const jobs = await fetchExternalJobs(source as any);

    res.status(200).json({
      success: true,
      count: jobs.length,
      source,
      jobs: jobs.slice(0, 5), // Return only first 5 for preview
    });
  } catch (error) {
    Logger.error('Error in previewExternalJobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview external jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
