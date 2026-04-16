import * as cron from 'node-cron';
import { saveExternalJobs } from './externalJobs.service';
import Logger from '../logger';

/**
 * Cron scheduler for external job imports
 * 
 * Schedule formats:
 * - '0 0 * * *'     = Every day at midnight
 * - '0 0/6 * * *'   = Every 6 hours
 * - '0 9 * * 1'     = Every Monday at 9 AM
 * - '0 0 1 * *'     = First day of every month at midnight
 */

let isSchedulerRunning = false;
let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Start automatic external job fetching
 */
export const startExternalJobScheduler = (schedule: string = '0 0 * * *') => {
  if (isSchedulerRunning) {
    Logger.warn('External job scheduler is already running');
    return;
  }

  // Validate cron expression
  if (!cron.validate(schedule)) {
    Logger.error(`Invalid cron schedule: ${schedule}`);
    return;
  }

  Logger.info(`Starting external job scheduler with schedule: ${schedule}`);

  scheduledTask = cron.schedule(schedule, async () => {
    Logger.info('Running scheduled external job import...');
    
    try {
      const result = await saveExternalJobs('mockapi');
      Logger.info(
        `Scheduled import complete: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`
      );
    } catch (error) {
      Logger.error('Error in scheduled external job import:', error);
    }
  });

  isSchedulerRunning = true;
  Logger.info('External job scheduler started successfully');
};

/**
 * Stop the scheduler
 */
export const stopExternalJobScheduler = () => {
  if (!isSchedulerRunning || !scheduledTask) {
    Logger.warn('External job scheduler is not running');
    return;
  }

  scheduledTask.stop();
  scheduledTask = null;
  isSchedulerRunning = false;
  
  Logger.info('External job scheduler stopped');
};

/**
 * Get scheduler status
 */
export const getSchedulerStatus = () => {
  return {
    isRunning: isSchedulerRunning,
    nextRun: scheduledTask ? 'Active' : 'Not scheduled',
  };
};

/**
 * Run import immediately (manual trigger)
 */
export const runImmediateImport = async () => {
  Logger.info('Running immediate external job import...');
  
  try {
    const result = await saveExternalJobs('mockapi');
    Logger.info(
      `Manual import complete: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`
    );
    return result;
  } catch (error) {
    Logger.error('Error in manual external job import:', error);
    throw error;
  }
};

// Auto-start scheduler if enabled in environment
// Uncomment the line below to enable auto-start on server startup
// if (process.env.ENABLE_JOB_SCHEDULER === 'true') {
//   startExternalJobScheduler(process.env.JOB_SCHEDULER_CRON || '0 0 * * *');
// }
