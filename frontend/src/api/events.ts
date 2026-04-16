import axiosInstance from './axios';
import type {
  CreateEventRequest,
  CreateEventResponse,
  EventResponse,
  EventsResponse,
  PendingFeedbackEventsResponse,
  SubmitEventFeedbackRequest,
  UpdateEventRequest,
} from '../types';

/**
 * Events API Service
 */
export const eventsApi = {
  /**
   * Get all events
   */
  getAllEvents: async (): Promise<EventsResponse> => {
    const response = await axiosInstance.get<EventsResponse>('/events');
    return response.data;
  },

  /**
   * Get an event by ID
   */
  getEventById: async (id: string): Promise<EventResponse> => {
    const response = await axiosInstance.get<EventResponse>(`/events/${id}`);
    return response.data;
  },

  /**
   * Create a new event (Admin only)
   */
  createEvent: async (
    data: CreateEventRequest
  ): Promise<CreateEventResponse> => {
    const response = await axiosInstance.post<CreateEventResponse>(
      '/events/create',
      data
    );
    return response.data;
  },

  /**
   * Update an event (Admin only)
   */
  updateEvent: async (
    id: string,
    data: UpdateEventRequest
  ): Promise<CreateEventResponse> => {
    const response = await axiosInstance.put<CreateEventResponse>(
      `/events/update/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an event (Admin only)
   */
  deleteEvent: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/events/delete/${id}`
    );
    return response.data;
  },

  /**
   * Mark event drive as completed and trigger feedback forms (Admin only)
   */
  completeDrive: async (
    id: string
  ): Promise<{
    message: string;
    event: EventResponse['event'];
    notifiedCount: number;
  }> => {
    const response = await axiosInstance.post<{
      message: string;
      event: EventResponse['event'];
      notifiedCount: number;
    }>(`/events/${id}/complete-drive`);
    return response.data;
  },

  /**
   * Get pending feedback forms for logged-in student
   */
  getPendingFeedbackForms: async (): Promise<PendingFeedbackEventsResponse> => {
    const response = await axiosInstance.get<PendingFeedbackEventsResponse>(
      '/events/feedback/pending'
    );
    return response.data;
  },

  /**
   * Submit student feedback for completed event drive
   */
  submitFeedback: async (
    eventId: string,
    data: SubmitEventFeedbackRequest
  ): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      `/events/${eventId}/feedback`,
      data
    );
    return response.data;
  },
};
