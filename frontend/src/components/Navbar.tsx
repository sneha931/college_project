import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationsApi } from '../api/notifications';
import type { AppNotification } from '../api/notifications';

const NOTIF_KEY = 'student_notifications_read';

interface LocalNotification extends AppNotification {
  read: boolean;
}

const Navbar = () => {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && role === 'student') {
      loadNotifications();
    }
  }, [isAuthenticated, role]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getMyNotifications();
      const readSet: string[] = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '[]');
      setNotifications(
        data.notifications.map((n) => ({ ...n, read: readSet.includes(n.id) }))
      );
    } catch {
      // silently fail — notifications are non-critical
    }
  };

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const handleNotifClick = useCallback((n: LocalNotification) => {
    const readSet: string[] = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '[]');
    if (!readSet.includes(n.id)) {
      localStorage.setItem(NOTIF_KEY, JSON.stringify([...readSet, n.id]));
    }
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setShowPanel(false);
    if (n.link) navigate(n.link);
  }, [navigate]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-white font-bold text-xl hover:text-blue-200 transition-colors"
            >
              Campus Placement Portal
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {role === 'admin' ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Analytics
                    </Link>
                    <Link
                      to="/profile"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/admin/jobs"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Manage Jobs
                    </Link>
                    <Link
                      to="/admin/events"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Manage Events
                    </Link>
                    <Link
                      to="/admin/students"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Student Info
                    </Link>
                    <Link
                      to="/admin/external-jobs"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      External Jobs
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/student-dashboard"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Browse Jobs
                    </Link>
                    <Link
                      to="/profile"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/events"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Events
                    </Link>
                    <Link
                      to="/student-analysis"
                      className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Analysis
                    </Link>
                    {/* Bell Icon — Notifications */}
                    <div className="relative flex items-center" ref={panelRef}>
                      <button
                        onClick={() => setShowPanel((v) => !v)}
                        className="relative text-white hover:text-blue-200 transition-colors"
                        title="Notifications"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-600 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {showPanel && (
                        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                            <div className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                                  Mark all read
                                </button>
                              )}
                              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                            </div>
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <p className="text-gray-400 text-sm text-center py-8">No notifications yet</p>
                            ) : (
                              notifications.map((n) => {
                                const icon =
                                  n.type === 'interview_scheduled' ? '🎯'
                                  : n.type === 'interview_result' ? '🎉'
                                  : n.type === 'new_job' ? '💼'
                                  : n.type === 'new_event' ? '🗓️'
                                  : '📅';
                                return (
                                  <button
                                    key={n.id}
                                    onClick={() => handleNotifClick(n)}
                                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-start ${n.read ? 'opacity-50' : 'bg-blue-50/40'}`}
                                  >
                                    <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                                    </div>
                                    {!n.read && <span className="flex-shrink-0 mt-1.5 w-2 h-2 bg-blue-500 rounded-full" />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
