import axios from 'axios';

// ⚠️ Set to your production backend URL
export const BASE_URL = "https://college-project-1c3k.onrender.com";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Login student
 * POST /auth/login
 */
export const loginStudent = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data; // { message, token, role }
};

/**
 * Get student profile (to retrieve StudentProfile.id)
 * GET /profile
 */
export const getStudentProfile = async (token) => {
  const response = await api.get('/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data; // { message, profile: { id, name, ... } }
};

/**
 * Mark attendance
 * POST /attendance/mark-attendance
 */
export const markAttendanceAPI = async (studentId, sessionId, token) => {
  const response = await api.post(
    '/attendance/mark-attendance',
    { studentId, sessionId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data; // { success, message, attendance }
};

export default api;
