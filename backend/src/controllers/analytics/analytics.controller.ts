import type { Request, Response } from 'express';
import { getYearAnalytics, getAvailableYears } from '../../service/analytics.service.js';
import Logger from '../../logger.js';

export const getDashboardAnalytics = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    const analytics = await getYearAnalytics(year);
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    Logger.error('Error in getDashboardAnalytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getYears = async (req: Request, res: Response) => {
  try {
    const years = getAvailableYears();
    
    res.status(200).json({
      success: true,
      years
    });
  } catch (error) {
    Logger.error('Error in getYears:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available years',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
