import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RoleType } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
  requiresProfile?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  requiresProfile = false,
}: ProtectedRouteProps) => {
  const { isAuthenticated, role, isLoading, hasProfile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'admin') {
      return <Navigate to="/admin/jobs" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect students without a profile/resume to profile page
  // But not if they're already on the profile page
  if (
    requiresProfile &&
    role === 'student' &&
    hasProfile === false &&
    location.pathname !== '/profile'
  ) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
