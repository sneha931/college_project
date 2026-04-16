import axiosInstance from './axios';

export interface DashboardAnalytics {
  year: number;
  totalStudents: number;
  placedStudents: number;
  unplacedStudents: number;
  placementPercentage: number;
  companyWisePlacement: { companyName: string; count: number }[];
  skillDemand: { skill: string; count: number }[];
  eventSuccessRate: number;
  averagePackage: number;
  topCompanies: { name: string; package: number; students: number }[];
  placementDistribution: { placed: number; unplaced: number };
  yearTrend: { year: number; placementPercentage: number }[];
}

export const analyticsApi = {
  getDashboardAnalytics: async (year?: number): Promise<{ success: boolean; data: DashboardAnalytics }> => {
    const params = year ? { year } : {};
    const response = await axiosInstance.get('/analytics/dashboard', { params });
    return response.data;
  },

  getAvailableYears: async (): Promise<{ success: boolean; years: number[] }> => {
    const response = await axiosInstance.get('/analytics/years');
    return response.data;
  },
};
