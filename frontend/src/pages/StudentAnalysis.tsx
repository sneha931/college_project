import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, jobsApi, profileApi } from '../api';
import { Loading } from '../components';
import type { Event, Job, StudentProfile } from '../types';

type SkillPoint = { name: string; value: number; trending?: boolean };
type EventView = {
  id: string;
  companyName: string;
  venue: string;
  startTime: string;
  status: 'upcoming' | 'ongoing' | 'completed';
};
type MatchView = {
  id: string;
  company: string;
  role: string;
  match: number;
};

type StudentDashboardData = {
  status: 'Placed' | 'Not Placed';
  applications: number;
  shortlists: number;
  avgMatch: number;
  readiness: number;
  skills: SkillPoint[];
  recommendations: string[];
  events: EventView[];
  matches: MatchView[];
};

const progressColor = (value: number) => {
  if (value >= 75) return 'bg-green-500';
  if (value >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getCountdown = (startTime: string) => {
  const now = Date.now();
  const target = new Date(startTime).getTime();
  const diff = target - now;
  if (diff <= 0) return 'Started';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const getEventStatus = (event: Event): EventView['status'] => {
  if (event.driveCompletedAt) return 'completed';

  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = start + 3 * 60 * 60 * 1000;

  if (now >= start && now <= end) return 'ongoing';
  if (start > now) return 'upcoming';
  return 'completed';
};

const CircleMatch = ({ value }: { value: number }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative w-16 h-16" title={`Match score ${value}%`}>
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke={value >= 60 ? '#2563EB' : '#EF4444'}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
        {value}%
      </span>
    </div>
  );
};

const StudentAnalysis = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [jobsRes, eventsRes, profileRes, shortlistRes] =
          await Promise.all([
            jobsApi.getAllJobs(),
            eventsApi.getAllEvents(),
            profileApi.getProfile(),
            jobsApi
              .getMyShortlistedJobs()
              .catch(() => ({ message: '', jobIds: [] })),
          ]);

        setJobs(jobsRes.jobs || []);
        setEvents(eventsRes.events || []);
        setProfile(profileRes.profile || null);
        setShortlistedIds(shortlistRes.jobIds || []);
      } catch {
        setError('Failed to load student analytics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const demoDataByYear = useMemo<Record<number, StudentDashboardData>>(
    () => ({
      [currentYear - 1]: {
        status: 'Not Placed',
        applications: 18,
        shortlists: 6,
        avgMatch: 63,
        readiness: 68,
        skills: [
          { name: 'DSA', value: 18, trending: true },
          { name: 'SQL', value: 14, trending: true },
          { name: 'Cloud Computing', value: 12 },
          { name: 'DBMS', value: 11 },
          { name: 'Java', value: 9 },
        ],
        recommendations: [
          'Improve DSA',
          'Learn Cloud Computing',
          'Practice SQL & DBMS',
        ],
        events: [
          {
            id: 'demo-1',
            companyName: 'Apex Tech',
            venue: 'Seminar Hall A',
            startTime: `${currentYear - 1}-08-21T09:30:00.000Z`,
            status: 'completed',
          },
          {
            id: 'demo-2',
            companyName: 'Netcore Labs',
            venue: 'Auditorium',
            startTime: `${currentYear - 1}-09-11T10:00:00.000Z`,
            status: 'completed',
          },
        ],
        matches: [
          {
            id: 'demo-job-1',
            company: 'Apex Tech',
            role: 'Backend Intern',
            match: 72,
          },
          {
            id: 'demo-job-2',
            company: 'Netcore Labs',
            role: 'Data Engineer Intern',
            match: 58,
          },
          {
            id: 'demo-job-3',
            company: 'Skyline AI',
            role: 'ML Intern',
            match: 55,
          },
        ],
      },
      [currentYear - 2]: {
        status: 'Not Placed',
        applications: 14,
        shortlists: 4,
        avgMatch: 57,
        readiness: 59,
        skills: [
          { name: 'Python', value: 12, trending: true },
          { name: 'DBMS', value: 11 },
          { name: 'OOP', value: 10 },
          { name: 'Aptitude', value: 9 },
          { name: 'Networking', value: 8 },
        ],
        recommendations: [
          'Improve DSA',
          'Learn Cloud Computing',
          'Practice SQL & DBMS',
        ],
        events: [
          {
            id: 'demo-3',
            companyName: 'Vertex Systems',
            venue: 'Lab Block 2',
            startTime: `${currentYear - 2}-07-18T09:00:00.000Z`,
            status: 'completed',
          },
        ],
        matches: [
          {
            id: 'demo-job-4',
            company: 'Vertex Systems',
            role: 'SDE Intern',
            match: 61,
          },
          {
            id: 'demo-job-5',
            company: 'Orbit Solutions',
            role: 'QA Intern',
            match: 49,
          },
        ],
      },
    }),
    [currentYear]
  );

  const realData = useMemo<StudentDashboardData>(() => {
    const profileSkills = new Set(
      (profile?.skills || []).map(skill => skill.toLowerCase())
    );

    const matchList: MatchView[] = jobs
      .map(job => {
        const matchedSkills = job.skills.filter(skill =>
          profileSkills.has(skill.toLowerCase())
        ).length;
        const skillScore =
          job.skills.length > 0 ? (matchedSkills / job.skills.length) * 100 : 0;
        const cgpaScore = profile
          ? Math.min(100, (profile.btechCGPA / Math.max(job.minCGPA, 1)) * 100)
          : 0;
        const expScore = profile
          ? profile.experience >= job.minExperience
            ? 100
            : Math.max(0, 100 - (job.minExperience - profile.experience) * 25)
          : 0;

        const finalMatch = Math.round(
          skillScore * 0.65 + cgpaScore * 0.2 + expScore * 0.15
        );

        return {
          id: job.id,
          company: job.companyname,
          role: job.jobrole,
          match: Math.max(0, Math.min(100, finalMatch)),
        };
      })
      .sort((a, b) => b.match - a.match);

    const avgMatch =
      matchList.length > 0
        ? Math.round(
            matchList.reduce((sum, item) => sum + item.match, 0) /
              matchList.length
          )
        : 0;

    const skillsFreq = new Map<string, number>();
    jobs.forEach(job => {
      job.skills.forEach(skill => {
        const key = skill.trim();
        if (!key) return;
        skillsFreq.set(key, (skillsFreq.get(key) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillsFreq.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((item, index) => ({ ...item, trending: index < 3 }));

    const shortlistCount = shortlistedIds.length;
    const readiness = Math.round(
      Math.min(
        100,
        (profile?.resumeUrl ? 20 : 0) +
          Math.min(30, (profile?.skills.length || 0) * 4) +
          Math.min(20, shortlistCount * 4) +
          Math.min(30, avgMatch * 0.3)
      )
    );

    const topMissingSkills = topSkills
      .filter(skill => !profileSkills.has(skill.name.toLowerCase()))
      .slice(0, 3)
      .map(skill => `Learn ${skill.name}`);

    const recommendations = [
      ...topMissingSkills,
      'Improve DSA',
      'Learn Cloud Computing',
      'Practice SQL & DBMS',
    ].slice(0, 3);

    const yearEvents = events
      .filter(event => new Date(event.startTime).getFullYear() === currentYear)
      .map(event => ({
        id: event.id,
        companyName: event.companyName,
        venue: event.venue,
        startTime: event.startTime,
        status: getEventStatus(event),
      }))
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

    return {
      status: profile?.isPlaced ? 'Placed' : 'Not Placed',
      applications: jobs.length,
      shortlists: shortlistCount,
      avgMatch,
      readiness,
      skills: topSkills,
      recommendations,
      events: yearEvents,
      matches: matchList.slice(0, 4),
    };
  }, [jobs, events, profile, shortlistedIds, currentYear]);

  const data =
    selectedYear === currentYear ? realData : demoDataByYear[selectedYear];

  if (isLoading) {
    return <Loading fullScreen text="Loading student analysis..." />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-600">
            No analytics data available for this year.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Placement Analysis
            </h1>
            <p className="text-gray-600">
              Keep Jobs separate and track your progress here.
            </p>
          </div>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {error && selectedYear === currentYear && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${data.status === 'Placed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
            >
              {data.status}
            </span>
            <span
              className="text-sm text-gray-500"
              title="Current year uses real data, past years use demo data"
            >
              {selectedYear === currentYear ? 'Live Data' : 'Demo Data'}
            </span>
            <Link
              to="/dashboard"
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Jobs
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-700">Applications Submitted</p>
              <p className="text-2xl font-bold text-blue-900">
                {data.applications}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-700">Shortlists</p>
              <p className="text-2xl font-bold text-indigo-900">
                {data.shortlists}
              </p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4">
              <p className="text-xs text-cyan-700">Avg Matching Score</p>
              <p className="text-2xl font-bold text-cyan-900">
                {data.avgMatch}%
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-700">Placement Readiness</p>
              <p className="text-2xl font-bold text-emerald-900">
                {data.readiness}%
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Readiness Progress</span>
              <span className="font-medium text-gray-900">
                {data.readiness}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full ${progressColor(data.readiness)}`}
                style={{ width: `${data.readiness}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Skill Demand Analysis
            </h2>
            <div className="space-y-3">
              {data.skills.map(skill => {
                const max = data.skills[0]?.value || 1;
                const width = Math.max(
                  10,
                  Math.round((skill.value / max) * 100)
                );
                return (
                  <div
                    key={skill.name}
                    title={`${skill.name}: ${skill.value} job requests`}
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{skill.name}</span>
                        {skill.trending && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                            Trending 2025
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">
                        {skill.value}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-base font-semibold text-blue-900 mb-3">
              Recommended Skills to Learn
            </h3>
            <ul className="space-y-2 text-sm text-blue-900">
              {data.recommendations.map(rec => (
                <li
                  key={rec}
                  className="bg-white border border-blue-100 rounded-lg px-3 py-2"
                >
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Event Calendar (List View)
          </h2>
          {data.events.length === 0 ? (
            <p className="text-sm text-gray-500">No events available.</p>
          ) : (
            <div className="space-y-3">
              {data.events.map(event => {
                const statusStyles =
                  event.status === 'upcoming'
                    ? 'border-green-200 bg-green-50'
                    : event.status === 'ongoing'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-100 opacity-80';

                return (
                  <div
                    key={event.id}
                    className={`border rounded-xl p-4 ${statusStyles}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {event.companyName}
                        </p>
                        <p className="text-sm text-gray-600">{event.venue}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.startTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm">
                        {event.status === 'upcoming' && (
                          <span
                            className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium"
                            title="Upcoming drive"
                          >
                            Upcoming • Starts in {getCountdown(event.startTime)}
                          </span>
                        )}
                        {event.status === 'ongoing' && (
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium"
                            title="Drive is currently running"
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Ongoing
                          </span>
                        )}
                        {event.status === 'completed' && (
                          <span
                            className="inline-flex px-3 py-1 rounded-full bg-gray-200 text-gray-600 font-medium"
                            title="Drive completed"
                          >
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Job Matching Insights
          </h2>
          {data.matches.length === 0 ? (
            <p className="text-sm text-gray-500">
              No matching insights available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.matches.map(match => (
                <div
                  key={match.id}
                  className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {match.company}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {match.role}
                    </p>
                    {match.match < 60 && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        Improve Skills
                      </p>
                    )}
                    {match.id.startsWith('demo-') ? (
                      <span className="mt-2 inline-flex text-sm text-gray-500 font-medium">
                        Demo Record
                      </span>
                    ) : (
                      <Link
                        to={`/jobs/${match.id}`}
                        className="mt-2 inline-flex text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Job
                      </Link>
                    )}
                  </div>
                  <CircleMatch value={match.match} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAnalysis;
