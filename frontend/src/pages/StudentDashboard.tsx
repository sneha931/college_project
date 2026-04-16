import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { profileApi, matchingApi, eventsApi, jobsApi } from '../api';
import { interviewApi } from '../api/interview';
import { Loading } from '../components';
import type {
  StudentProfile, JobMatch, Event, Job, SkillDemand, InterviewDetails,
} from '../types';

// ─── Notification helpers ─────────────────────────────────────────────────────
interface AppNotification {
  id: string;
  type: 'interview_scheduled' | 'interview_result' | 'event_reminder';
  title: string;
  body: string;
  link?: string;
  read: boolean;
}

const NOTIF_KEY = 'student_notifications_read';

function buildNotifications(interviews: InterviewDetails[], events: Event[]): AppNotification[] {
  const notifs: AppNotification[] = [];
  const now = new Date();

  interviews.forEach((iv) => {
    if (iv.status === 'SCHEDULED' || iv.status === 'IN_PROGRESS') {
      notifs.push({
        id: `iv_pending_${iv.id}`,
        type: 'interview_scheduled',
        title: '🎯 Interview Ready',
        body: `${iv.JobPosts?.companyname} — ${iv.JobPosts?.jobrole}. Click "Attend Interview" to begin.`,
        link: `/interview/${iv.id}`,
        read: false,
      });
    }
    if (iv.status === 'COMPLETED') {
      notifs.push({
        id: `iv_done_${iv.id}`,
        type: 'interview_result',
        title: iv.isShortlisted ? '🎉 You are Shortlisted!' : '📋 Interview Result',
        body: iv.isShortlisted
          ? `Congratulations! You scored ${iv.aiScore}/100 for ${iv.JobPosts?.companyname}.`
          : `You scored ${iv.aiScore}/100 for ${iv.JobPosts?.companyname}. Keep improving!`,
        link: `/interview/${iv.id}`,
        read: false,
      });
    }
  });

  events
    .filter((e) => {
      const diff = new Date(e.startTime).getTime() - now.getTime();
      return diff > 0 && diff < 1000 * 60 * 60 * 48;
    })
    .forEach((e) => {
      notifs.push({
        id: `ev_${e.id}`,
        type: 'event_reminder',
        title: '📅 Upcoming Event',
        body: `${e.companyName} drive at ${e.venue} is coming up soon.`,
        read: false,
      });
    });

  const readSet: string[] = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '[]');
  return notifs.map((n) => ({ ...n, read: readSet.includes(n.id) }));
}

// ─── Component ────────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<InterviewDetails[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profileRes, matchesRes, eventsRes, jobsRes, interviewsRes] = await Promise.all([
        profileApi.getProfile().catch(() => ({ profile: null })),
        matchingApi.getMyMatches().catch(() => ({ matches: [] })),
        eventsApi.getAllEvents().catch(() => ({ events: [] })),
        jobsApi.getAllJobs().catch(() => ({ jobs: [] })),
        interviewApi.getMyInterviews().catch(() => ({
          interviews: [] as InterviewDetails[], count: 0, message: '',
        })),
      ]);

      const ivList = interviewsRes.interviews ?? [];
      const evList = eventsRes.events ?? [];

      setProfile(profileRes.profile);
      setMatches(matchesRes.matches || []);
      setEvents(evList);
      setJobs(jobsRes.jobs || []);
      setInterviews(ivList);
      setNotifications(buildNotifications(ivList, evList));
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const markOneRead = useCallback((id: string) => {
    const readSet: string[] = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '[]');
    if (!readSet.includes(id)) {
      localStorage.setItem(NOTIF_KEY, JSON.stringify([...readSet, id]));
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Derive interview status per job
  const interviewByJobId = Object.fromEntries(
    interviews.map((iv) => [iv.jobId, iv])
  );

  // Shortlisted jobs: only jobs where job.isShortlisted is true
  const shortlistedJobs = jobs.filter((j) => j.isShortlisted);
  // Jobs that have a pending interview for this student
  const jobsWithPendingInterview = shortlistedJobs.filter((j) => {
    const iv = interviewByJobId[j.id];
    return iv && (iv.status === 'SCHEDULED' || iv.status === 'IN_PROGRESS');
  });

  const completedInterviews = interviews.filter((iv) => iv.status === 'COMPLETED');

  // Stats
  const averageMatchScore =
    matches.length > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length)
      : 0;

  // Skill demand analysis
  const skillDemandMap: Record<string, number> = {};
  jobs.forEach((job) => {
    job.skills.forEach((skill) => {
      skillDemandMap[skill] = (skillDemandMap[skill] || 0) + 1;
    });
  });
  const skillDemands: SkillDemand[] = Object.entries(skillDemandMap)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const studentSkills = profile?.skills || [];
  const recommendedSkills = skillDemands
    .filter(({ skill }) => !studentSkills.some((s) => s.toLowerCase() === skill.toLowerCase()))
    .slice(0, 6);

  // Events
  const now = new Date();
  const upcomingEvents = events
    .filter((e) => new Date(e.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  const completedEvents = events
    .filter((e) => e.driveCompletedAt || new Date(e.startTime) <= now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  const getCountdown = (eventDate: string) => {
    const diff = new Date(eventDate).getTime() - now.getTime();
    if (diff <= 0) return 'Started';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) return <Loading fullScreen text="Loading dashboard..." />;

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header + Notification Bell ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.name || 'Student'}! 👋
            </h1>
            <p className="text-gray-600">Here&apos;s your placement dashboard overview</p>
          </div>

          {/* Bell */}
          <div className="relative flex-shrink-0 mt-1">
            <button
              onClick={() => {
                setShowNotifPanel((v) => !v);
                if (!showNotifPanel) markAllRead();
              }}
              className="relative bg-white rounded-xl shadow p-3 hover:shadow-md transition-shadow"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {showNotifPanel && (
              <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          markOneRead(n.id);
                          if (n.link) navigate(n.link);
                          setShowNotifPanel(false);
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                        {!n.read && <span className="inline-block mt-1 w-2 h-2 bg-blue-500 rounded-full" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Attend Interview Section (per company, shortlisted only) ── */}
        {jobsWithPendingInterview.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">🎯 Your Pending Interviews</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobsWithPendingInterview.map((job) => {
                const iv = interviewByJobId[job.id];
                const isResume = iv.status === 'IN_PROGRESS';
                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl shadow border border-indigo-100 p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-base">{job.companyname}</p>
                        <p className="text-sm text-gray-500">{job.jobrole}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                        isResume ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isResume ? 'In Progress' : 'Scheduled'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(`/interview/${iv.id}`)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                        isResume
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isResume ? '▶ Resume Interview' : '🎯 Attend Interview'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Stats Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`bg-gradient-to-br ${profile?.isPlaced ? 'from-green-500 to-green-600' : 'from-blue-500 to-blue-600'} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Placement Status</h3>
            <p className="text-3xl font-bold mb-2">{profile?.isPlaced ? 'Placed' : 'Active'}</p>
            {profile?.placedCompany && <p className="text-sm opacity-90">at {profile.placedCompany}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-1">Total Matches</h3>
            <p className="text-3xl font-bold text-gray-900">{matches.length}</p>
            <p className="text-sm text-gray-500 mt-1">Job opportunities</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-1">Auto-Shortlisted</h3>
            <p className="text-3xl font-bold text-gray-900">{shortlistedJobs.length}</p>
            <p className="text-sm text-gray-500 mt-1">High match jobs</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-semibold mb-1">Avg Match Score</h3>
            <p className="text-3xl font-bold text-gray-900">{averageMatchScore}%</p>
            <p className="text-sm text-gray-500 mt-1">Skill compatibility</p>
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Skill Demand Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">📊 Top Skills in Demand</h2>
                <span className="text-sm text-gray-500">Across {jobs.length} jobs</span>
              </div>
              {skillDemands.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={skillDemands}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="skill" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {skillDemands.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={studentSkills.some((s) => s.toLowerCase() === entry.skill.toLowerCase()) ? '#10b981' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-12">No skill data available</div>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-gray-600">You have this skill</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span className="text-gray-600">Learn this skill</span>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">📅 Upcoming Events</h2>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{event.companyName}</h3>
                          <p className="text-sm text-gray-600 mt-1">📍 {event.venue}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(event.startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">{event.processOfDay}</p>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {getCountdown(event.startTime)}
                          </span>
                          <span className="text-xs text-green-700 mt-2">Upcoming</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming events scheduled</p>
              )}
            </div>

            {/* Completed Events */}
            {completedEvents.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">✅ Recently Completed</h2>
                <div className="space-y-4">
                  {completedEvents.map((event) => (
                    <div key={event.id} className="border-l-4 border-gray-300 bg-gray-50 p-4 rounded-lg opacity-75">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-700 text-lg">{event.companyName}</h3>
                          <p className="text-sm text-gray-500 mt-1">📍 {event.venue}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(event.startTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <span className="bg-gray-300 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Recommended Skills */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Recommended Skills
              </h2>
              <p className="text-sm opacity-90 mb-4">Learn these to boost your match score</p>
              {recommendedSkills.length > 0 ? (
                <div className="space-y-3">
                  {recommendedSkills.map(({ skill, count }, index) => (
                    <div key={index} className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 hover:bg-opacity-30 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{skill}</span>
                        <span className="text-xs bg-white bg-opacity-30 px-2 py-1 rounded-full">{count} jobs</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-75">Great! You have all the top in-demand skills! 🎉</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  Update Profile
                </button>
                <button
                  onClick={() => navigate('/jobs')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  Browse Jobs
                </button>
                <button
                  onClick={() => navigate('/events')}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  View All Events
                </button>
              </div>
            </div>

            {/* Interview Results */}
            {completedInterviews.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Interview Results</h2>
                <div className="space-y-3">
                  {completedInterviews.slice(0, 4).map((iv) => (
                    <button
                      key={iv.id}
                      onClick={() => navigate(`/interview/${iv.id}`)}
                      className="w-full text-left bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{iv.JobPosts?.companyname}</p>
                          <p className="text-xs text-gray-500">{iv.JobPosts?.jobrole}</p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{iv.aiScore ?? '—'}/100</p>
                          <span className={`text-xs font-semibold ${iv.isShortlisted ? 'text-green-600' : 'text-red-500'}`}>
                            {iv.isShortlisted ? '✓ Cleared 1st Round' : '✗ Not Cleared'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Profile Status</h2>
              <div className="space-y-3">
                <ProfileCheckItem label="Resume Uploaded" completed={!!profile?.resumeUrl} />
                <ProfileCheckItem label="Skills Added" completed={(profile?.skills || []).length > 0} />
                <ProfileCheckItem label="Profile Picture" completed={!!profile?.profilePic} />
                <ProfileCheckItem label="CGPA Recorded" completed={!!profile?.btechCGPA} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileCheckItem = ({ label, completed }: { label: string; completed: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${completed ? 'bg-green-500' : 'bg-gray-200'}`}>
      {completed && (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className={`text-sm ${completed ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
  </div>
);

export default StudentDashboard;
