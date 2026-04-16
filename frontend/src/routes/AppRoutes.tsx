import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Layout, ProtectedRoute } from '../components';
import {
  Home,
  Login,
  Register,
  Dashboard,
  StudentDashboard,
  StudentAnalysis,
  Profile,
  JobDetails,
  Events,
  AdminDashboard,
  ManageJobs,
  CreateJob,
  EditJob,
  ManageEvents,
  CreateEvent,
  EditEvent,
  StudentInfo,
  ManageExternalJobs,
  InterviewPage,
  AdminInterviews,
} from '../pages';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <Layout>
                <Home />
              </Layout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes - All authenticated users */}
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']} requiresProfile>
                <Layout>
                  <StudentDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']} requiresProfile>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-analysis"
            element={
              <ProtectedRoute allowedRoles={['student']} requiresProfile>
                <Layout>
                  <StudentAnalysis />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:id"
            element={
              <ProtectedRoute requiresProfile>
                <Layout>
                  <JobDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Layout>
                  <Events />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ManageJobs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CreateJob />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <EditJob />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ManageEvents />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CreateEvent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <EditEvent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <StudentInfo />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/external-jobs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ManageExternalJobs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interviews"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminInterviews />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Student interview session (full-screen, no layout chrome) */}
          <Route
            path="/interview/:interviewId"
            element={
              <ProtectedRoute allowedRoles={['student']} requiresProfile>
                <InterviewPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
