import axiosInstance from './axios';
import type {
  ProfileResponse,
  UpdateProfileRequest,
  UploadProfilePicResponse,
  UploadResumeResponse,
  AdminProfileResponse,
  UpdateAdminProfileRequest,
  AllStudentsResponse,
  UpdateStudentByAdminRequest,
  StudentProfile,
} from '../types';

/**
 * Profile API Service
 */
export const profileApi = {
  /**
   * Get current user's profile
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get<ProfileResponse>('/profile');
    return response.data;
  },

  /**
   * Upload resume and parse it
   */
  uploadResume: async (file: File): Promise<UploadResumeResponse> => {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await axiosInstance.post<UploadResumeResponse>(
      '/profile/uploadresume',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Upload profile picture
   */
  uploadProfilePic: async (file: File): Promise<UploadProfilePicResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axiosInstance.post<UploadProfilePicResponse>(
      '/profile/upload-profile-pic',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Update profile data
   */
  updateProfile: async (
    data: UpdateProfileRequest
  ): Promise<ProfileResponse> => {
    const response = await axiosInstance.put<ProfileResponse>(
      '/profile/update',
      data
    );
    return response.data;
  },

  /**
   * Get resume URL
   */
  getResume: async (): Promise<{ message: string; resumeUrl: string; name: string }> => {
    const response = await axiosInstance.get<{ message: string; resumeUrl: string; name: string }>(
      '/profile/resume'
    );
    return response.data;
  },

  /**
   * Get admin profile (or user name/email when no profile yet)
   */
  getAdminProfile: async (): Promise<AdminProfileResponse> => {
    const response = await axiosInstance.get<AdminProfileResponse>('/profile/admin');
    return response.data;
  },

  /**
   * Create or update admin profile (designation, college name; name & email from account)
   */
  updateAdminProfile: async (
    data: UpdateAdminProfileRequest
  ): Promise<AdminProfileResponse> => {
    const response = await axiosInstance.put<AdminProfileResponse>(
      '/profile/admin',
      data
    );
    return response.data;
  },

  /**
   * Get all student profiles (admin only)
   */
  getAllStudentsForAdmin: async (): Promise<AllStudentsResponse> => {
    const response = await axiosInstance.get<AllStudentsResponse>(
      '/profile/admin/students'
    );
    return response.data;
  },

  /**
   * Update a student profile (admin only, e.g. isPlaced)
   */
  updateStudentByAdmin: async (
    studentId: string,
    data: UpdateStudentByAdminRequest
  ): Promise<{ message: string; profile: StudentProfile }> => {
    const response = await axiosInstance.put<{
      message: string;
      profile: StudentProfile;
    }>(`/profile/admin/students/${studentId}`, data);
    return response.data;
  },
};
