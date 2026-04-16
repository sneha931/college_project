import axiosInstance from './axios';
import type { MyMatchesResponse, JobMatch } from '../types';

/**
 * Matching API Service
 */
export const matchingApi = {
  /**
   * Get all matches for the current student
   */
  getMyMatches: async (): Promise<MyMatchesResponse> => {
    const response = await axiosInstance.get<MyMatchesResponse>(
      '/matching/my-matches'
    );
    return response.data;
  },

  /**
   * Get match details for a specific job
   */
  getMyJobMatch: async (
    jobId: string
  ): Promise<{ message: string; match: JobMatch }> => {
    const response = await axiosInstance.get<{
      message: string;
      match: JobMatch;
    }>(`/matching/job/${jobId}/me`);
    return response.data;
  },
};
