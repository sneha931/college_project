import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { authApi, profileApi } from '../api';
import type { RoleType, LoginRequest, RegisterRequest, User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  role: RoleType | null;
  user: User | null;
  isLoading: boolean;
  hasProfile: boolean | null;
  login: (data: LoginRequest) => Promise<{ hasProfile: boolean; role: RoleType }>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  checkProfile: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<RoleType | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedRole = localStorage.getItem('role') as RoleType | null;

      if (!token || !savedRole) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token against backend — if expired/invalid this throws 401/403
        await authApi.verifyToken();

        setIsAuthenticated(true);
        setRole(savedRole);

        if (savedRole === 'student') {
          try {
            const response = await profileApi.getProfile();
            setHasProfile(!!(response.profile && response.profile.resumeUrl));
          } catch {
            setHasProfile(false);
          }
        } else {
          setHasProfile(true);
        }
      } catch {
        // Token is expired or invalid — clear everything and force login
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setRole(null);
        setHasProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const checkProfile = async (): Promise<boolean> => {
    const savedRole = localStorage.getItem('role');
    if (savedRole === 'admin') {
      setHasProfile(true);
      return true;
    }
    try {
      const response = await profileApi.getProfile();
      // Check if profile has resume (indicates complete profile)
      const profileExists = !!(response.profile && response.profile.resumeUrl);
      setHasProfile(profileExists);
      return profileExists;
    } catch {
      // Profile doesn't exist
      setHasProfile(false);
      return false;
    }
  };

  const login = async (
    data: LoginRequest
  ): Promise<{ hasProfile: boolean; role: RoleType }> => {
    const response = await authApi.login(data);
    authApi.saveAuthData(response.token, response.role);
    setIsAuthenticated(true);
    setRole(response.role);

    // Check if user has a profile after login
    const profileExists = await checkProfile();
    return { hasProfile: profileExists, role: response.role };
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    setUser(response.user);
    // After registration, user needs to login
  };

  const logout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setRole(null);
    setUser(null);
    setHasProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        user,
        isLoading,
        hasProfile,
        login,
        register,
        logout,
        checkProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
