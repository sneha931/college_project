import axiosInstance from './axios';

export interface ExternalJob {
  id: string;
  companyname: string;
  jobrole: string;
  description: string | null;
  salary: number;
  skills: string[];
  minCGPA: number;
  minExperience: number;
  minMarks10: number;
  minMarks12: number | null;
  isExternal: boolean;
  isApproved: boolean;
  externalSource: string | null;
  externalJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const externalJobsApi = {
  // Preview external jobs before importing
  preview: async (
    source: string = 'theirstack'
  ): Promise<{ success: boolean; count: number; jobs: any[] }> => {
    const response = await axiosInstance.get(
      `/external-jobs/preview?source=${source}`
    );
    return response.data;
  },

  // Import external jobs
  import: async (
    source: string = 'theirstack'
  ): Promise<{
    success: boolean;
    data: { saved: number; skipped: number; errors: number };
    message: string;
  }> => {
    const response = await axiosInstance.post('/external-jobs/import', {
      source,
    });
    return response.data;
  },

  // Get pending external jobs
  getPending: async (): Promise<{
    success: boolean;
    count: number;
    jobs: ExternalJob[];
  }> => {
    const response = await axiosInstance.get('/external-jobs/pending');
    return response.data;
  },

  // Get approved external jobs
  getApproved: async (): Promise<{
    success: boolean;
    count: number;
    jobs: ExternalJob[];
  }> => {
    const response = await axiosInstance.get('/external-jobs/approved');
    return response.data;
  },

  // Approve external job
  approve: async (
    jobId: string
  ): Promise<{ success: boolean; job: ExternalJob; message: string }> => {
    const response = await axiosInstance.post(
      `/external-jobs/${jobId}/approve`
    );
    return response.data;
  },

  // Reject external job
  reject: async (
    jobId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(
      `/external-jobs/${jobId}/reject`
    );
    return response.data;
  },
};
