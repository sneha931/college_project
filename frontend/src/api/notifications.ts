import axiosInstance from './axios';

export interface AppNotification {
  id: string;
  type: 'interview_scheduled' | 'interview_result' | 'event_reminder' | 'new_job' | 'new_event';
  title: string;
  body: string;
  link?: string;
  createdAt: string;
}

export const notificationsApi = {
  getMyNotifications: async (): Promise<{ count: number; notifications: AppNotification[] }> => {
    const res = await axiosInstance.get('/notifications');
    return res.data;
  },
};
