import axiosInstance from './axios';

export interface SessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  attendance?: {
    studentId: string;
    studentName: string;
    sessionId: string;
    timestamp: string;
  };
}

export interface SessionAttendanceResponse {
  success: boolean;
  sessionInfo: {
    sessionId: string;
    eventName: string;
    venue: string;
    createdAt: string;
  };
  attendanceCount: number;
  students: Array<{
    studentId: string;
    studentName: string;
    email: string;
    cgpa: number;
    attendanceTime: string;
  }>;
}

export interface EventSessionsResponse {
  success: boolean;
  eventInfo: {
    eventId: string;
    companyName: string;
    venue: string;
  };
  sessions: Array<{
    sessionId: string;
    createdAt: string;
    attendanceCount: number;
  }>;
}

/**
 * Create a new attendance session for an event
 * @param eventId - The ID of the event
 * @returns Promise with session ID
 */
export const createSession = async (
  eventId: string,
  token: string
): Promise<SessionResponse> => {
  try {
    const response = await axiosInstance.post(
      '/attendance/create-session',
      { eventId },
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Mark attendance for a student
 * @param studentId - The ID of the student
 * @param sessionId - The ID of the session
 * @returns Promise with attendance confirmation
 */
export const markAttendance = async (
  studentId: string,
  sessionId: string,
  token: string
): Promise<AttendanceResponse> => {
  try {
    const response = await axiosInstance.post(
      '/attendance/mark-attendance',
      { studentId, sessionId },
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all attendance records for a specific session
 * @param sessionId - The ID of the session
 * @returns Promise with list of students who marked attendance
 */
export const getSessionAttendance = async (
  sessionId: string,
  token: string
): Promise<SessionAttendanceResponse> => {
  try {
    const response = await axiosInstance.get(
      `/attendance/session-attendance/${sessionId}`,
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all attendance sessions for an event
 * @param eventId - The ID of the event
 * @returns Promise with list of sessions
 */
export const getEventSessions = async (
  eventId: string,
  token: string
): Promise<EventSessionsResponse> => {
  try {
    const response = await axiosInstance.get(
      `/attendance/event-sessions/${eventId}`,
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
