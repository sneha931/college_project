import axiosInstance from './axios';
import type {
  InterviewScheduleRequest,
  ScheduleInterviewResponse,
  InterviewResponseType,
  BulkScheduleInterviewRequest,
  BulkScheduleInterviewResponse,
  InterviewDetails,
  NextQuestionResponse,
  SubmitAnswerResponse,
  CompleteInterviewResponse,
} from '../types';

export const interviewApi = {
  scheduleInterview: async (data: InterviewScheduleRequest): Promise<ScheduleInterviewResponse> => {
    const response = await axiosInstance.post<ScheduleInterviewResponse>('/interviews/schedule', data);
    return response.data;
  },

  bulkScheduleInterviews: async (data: BulkScheduleInterviewRequest): Promise<BulkScheduleInterviewResponse> => {
    const response = await axiosInstance.post<BulkScheduleInterviewResponse>('/interviews/bulk-schedule', data);
    return response.data;
  },

  getInterview: async (id: string): Promise<InterviewResponseType> => {
    const response = await axiosInstance.get<InterviewResponseType>(`/interviews/${id}`);
    return response.data;
  },

  getAllInterviews: async (): Promise<{ message: string; count: number; interviews: InterviewDetails[] }> => {
    const response = await axiosInstance.get('/interviews/all');
    return response.data;
  },

  getJobInterviews: async (jobId: string): Promise<{ message: string; count: number; interviews: InterviewDetails[] }> => {
    const response = await axiosInstance.get(`/interviews/job/${jobId}`);
    return response.data;
  },

  updateInterviewStatus: async (id: string, status: string): Promise<InterviewResponseType> => {
    const response = await axiosInstance.put<InterviewResponseType>(`/interviews/${id}/status`, { status });
    return response.data;
  },

  getMyInterviews: async (): Promise<{ message: string; count: number; interviews: InterviewDetails[] }> => {
    const response = await axiosInstance.get('/interviews/my-interviews');
    return response.data;
  },

  getMyInterview: async (jobId: string): Promise<{ message: string; interview: InterviewDetails | null }> => {
    const response = await axiosInstance.get(`/interviews/my-interview/${jobId}`);
    return response.data;
  },

  startInterview: async (interviewId: string): Promise<{ message: string; interview: InterviewDetails }> => {
    const response = await axiosInstance.post(`/interviews/${interviewId}/start`);
    return response.data;
  },

  getNextQuestion: async (interviewId: string): Promise<NextQuestionResponse> => {
    const response = await axiosInstance.get<NextQuestionResponse>(`/interviews/${interviewId}/question`);
    return response.data;
  },

  submitAnswer: async (data: {
    interviewId: string;
    question: string;
    transcript: string;
  }): Promise<SubmitAnswerResponse> => {
    const response = await axiosInstance.post<SubmitAnswerResponse>('/interviews/answer', data);
    return response.data;
  },

  completeInterview: async (interviewId: string): Promise<CompleteInterviewResponse> => {
    const response = await axiosInstance.post<CompleteInterviewResponse>(`/interviews/${interviewId}/complete`);
    return response.data;
  },
};
