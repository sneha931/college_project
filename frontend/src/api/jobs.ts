import axiosInstance from './axios';
import type {
  CreateJobRequest,
  CreateJobResponse,
  CompanyAnalysisResponse,
  JobResponse,
  JobsResponse,
} from '../types';

/**
 * Jobs API Service
 */
export const jobsApi = {
  /**
   * Get all job posts
   */
  getAllJobs: async (): Promise<JobsResponse> => {
    const response = await axiosInstance.get<JobsResponse>('/jobs');
    return response.data;
  },

  /**
   * Get a job post by ID
   */
  getJobById: async (id: string): Promise<JobResponse> => {
    const response = await axiosInstance.get<JobResponse>(`/jobs/${id}`);
    return response.data;
  },

  /**
   * Create a new job post (Admin only)
   */
  createJob: async (data: CreateJobRequest): Promise<CreateJobResponse> => {
    const response = await axiosInstance.post<CreateJobResponse>(
      '/jobs/create',
      data
    );
    return response.data;
  },

  /**
   * Update a job post (Admin only)
   */
  updateJob: async (
    id: string,
    data: CreateJobRequest
  ): Promise<CreateJobResponse> => {
    const response = await axiosInstance.put<CreateJobResponse>(
      `/jobs/update/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a job post (Admin only)
   */
  deleteJob: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/jobs/delete/${id}`
    );
    return response.data;
  },

  /**
   * Get job IDs the current student is shortlisted for (Student only)
   */
  getMyShortlistedJobs: async (): Promise<{ message: string; jobIds: string[] }> => {
    const response = await axiosInstance.get<{ message: string; jobIds: string[] }>(
      '/jobs/my-shortlisted'
    );
    return response.data;
  },

  /**
   * Get shortlist for a job (Admin only)
   */
  getShortlist: async (id: string): Promise<{
    message: string;
    shortlistReady: boolean;
    eligibleCount?: number;
    excelUrl?: string;
    students?: Array<{
      name: string;
      email: string;
      marks10: number;
      marks12: number | null;
      diplomaMarks: number | null;
      btechCGPA: number;
      experience: number;
      matchedSkills: string[];
      score: number;
    }>;
    job: { id: string; companyname: string; jobrole: string };
  }> => {
    const response = await axiosInstance.get(`/jobs/${id}/shortlist`);
    return response.data;
  },

  /**
   * Regenerate shortlist for a job (Admin only)
   */
  regenerateShortlist: async (id: string): Promise<{
    message: string;
    shortlistReady: boolean;
  }> => {
    const response = await axiosInstance.post(`/jobs/${id}/shortlist/regenerate`);
    return response.data;
  },

  /**
   * Generate shortlists for all jobs (Admin only)
   */
  generateAllShortlists: async (): Promise<{
    message: string;
    count: number;
    jobIds?: string[];
  }> => {
    const response = await axiosInstance.post('/jobs/shortlists/generate-all');
    return response.data;
  },

  /**
   * Schedule interviews for shortlisted students (Admin only)
   */
  scheduleInterviews: async (jobId: string, studentEmails: string[]): Promise<{
    message: string;
    scheduledCount: number;
    failedCount: number;
    scheduledTime: string;
  }> => {
    const response = await axiosInstance.post(
      `/jobs/${jobId}/schedule-interviews`,
      { studentEmails }
    );
    return response.data;
  },

  /**
   * Get 2-year company analysis for students
   */
  getCompanyAnalysis: async (): Promise<CompanyAnalysisResponse> => {
    const response = await axiosInstance.get<CompanyAnalysisResponse>(
      '/jobs/analysis/companies'
    );
    return response.data;
  },
};
