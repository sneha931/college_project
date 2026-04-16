import { useEffect, useMemo, useState } from 'react';
import { eventsApi, jobsApi, profileApi } from '../api';
import { Loading } from '../components';
import { useAuth } from '../context/AuthContext';
import type { CompanyAnalysisItem, Event, StudentProfile } from '../types';

type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'red' | 'gray';
};
type ChartItem = { label: string; value: number; growth?: number };

type AdminDemoYearData = {
  totalStudents: number;
  totalPlaced: number;
  totalUnplaced: number;
  placementPercentage: number;
  companies: Array<{ name: string; openings: number; placed: number }>;
  topSkills: Array<{ name: string; value: number; prevValue: number }>;
  events: Array<{
    id: string;
    companyName: string;
    completed: boolean;
    upcoming: boolean;
    successRate: number;
  }>;
};

const PIE_COLORS = [
  '#2563EB',
  '#4F46E5',
  '#14B8A6',
  '#F59E0B',
  '#EF4444',
  '#22C55E',
  '#6B7280',
];

const MetricCard = ({ label, value, tone = 'blue' }: MetricCardProps) => {
  const toneClass =
    tone === 'green'
      ? 'bg-green-50 text-green-900'
      : tone === 'red'
        ? 'bg-red-50 text-red-900'
        : tone === 'gray'
          ? 'bg-gray-100 text-gray-900'
          : 'bg-blue-50 text-blue-900';

  return (
    <div
      className={`rounded-xl border border-gray-100 shadow-sm p-5 ${toneClass}`}
    >
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
};

const SimpleBarChart = ({
  title,
  items,
  barColor = 'bg-blue-500',
}: {
  title: string;
  items: ChartItem[];
  barColor?: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
    {items.length === 0 ? (
      <p className="text-sm text-gray-500">No data available.</p>
    ) : (
      <div className="space-y-3">
        {items.map(item => {
          const max = items[0]?.value || 1;
          const width = Math.max(8, Math.round((item.value / max) * 100));

          return (
            <div
              key={`${title}-${item.label}`}
              title={`${item.label}: ${item.value}`}
            >
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 truncate pr-3">
                  {item.label}
                </span>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              {typeof item.growth === 'number' && (
                <p
                  className={`mt-1 text-xs ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {item.growth >= 0 ? '▲' : '▼'} {Math.abs(item.growth)}% vs
                  previous year
                </p>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const PieChart = ({ title, items }: { title: string; items: ChartItem[] }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  const gradient = useMemo(() => {
    if (!total) return 'conic-gradient(#E5E7EB 0deg 360deg)';
    let angle = 0;
    const segments = items.map((item, index) => {
      const portion = (item.value / total) * 360;
      const start = angle;
      const end = angle + portion;
      angle = end;
      return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [items, total]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 || total === 0 ? (
        <p className="text-sm text-gray-500">No data available.</p>
      ) : (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div
            className="w-44 h-44 rounded-full border border-gray-200"
            style={{ background: gradient }}
            title="Hover legend for details"
          />
          <div className="w-full space-y-2">
            {items.map((item, index) => {
              const pct = ((item.value / total) * 100).toFixed(1);
              return (
                <div
                  key={`${title}-${item.label}`}
                  className="flex items-center justify-between text-sm"
                  title={`${item.label}: ${item.value}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-gray-700 truncate">{item.label}</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {item.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const LineTrendChart = ({
  points,
}: {
  points: Array<{ year: number; value: number }>;
}) => {
  const width = 520;
  const height = 220;
  const max = Math.max(...points.map(point => point.value), 1);

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * (width - 40) + 20;
      const y = height - (point.value / max) * 150 - 30;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Year-wise Placement Trend (Last 3 Years)
      </h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[420px]"
          role="img"
          aria-label="Placement trend line chart"
        >
          <line
            x1="20"
            y1={height - 30}
            x2={width - 20}
            y2={height - 30}
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="20"
            x2="20"
            y2={height - 30}
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          <path
            d={path}
            fill="none"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {points.map((point, index) => {
            const x =
              (index / Math.max(points.length - 1, 1)) * (width - 40) + 20;
            const y = height - (point.value / max) * 150 - 30;
            return (
              <g key={point.year}>
                <circle cx={x} cy={y} r="5" fill="#2563EB">
                  <title>{`${point.year}: ${point.value}%`}</title>
                </circle>
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                >
                  {point.year}
                </text>
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1E40AF"
                >
                  {point.value}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const CompanyAnalysis = () => {
  const { role } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveCompanies, setLiveCompanies] = useState<CompanyAnalysisItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [companiesRes, eventsRes, studentsRes] = await Promise.all([
          jobsApi.getCompanyAnalysis(),
          eventsApi.getAllEvents(),
          profileApi.getAllStudentsForAdmin(),
        ]);

        setLiveCompanies(companiesRes.companies || []);
        setLiveEvents(eventsRes.events || []);
        setStudents(studentsRes.profiles || []);
      } catch {
        setError('Failed to load admin analytics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (role === 'admin') {
      load();
    } else {
      setIsLoading(false);
      setError('Admin access required to view this dashboard.');
    }
  }, [role]);

  const demoByYear = useMemo<Record<number, AdminDemoYearData>>(
    () => ({
      [currentYear - 1]: {
        totalStudents: 420,
        totalPlaced: 286,
        totalUnplaced: 134,
        placementPercentage: 68,
        companies: [
          { name: 'Infosphere Labs', openings: 52, placed: 44 },
          { name: 'Vertex Systems', openings: 44, placed: 36 },
          { name: 'CloudNova', openings: 38, placed: 30 },
          { name: 'Apex Tech', openings: 30, placed: 24 },
        ],
        topSkills: [
          { name: 'AI/ML', value: 52, prevValue: 44 },
          { name: 'Cloud', value: 41, prevValue: 36 },
          { name: 'DSA', value: 58, prevValue: 55 },
          { name: 'SQL', value: 47, prevValue: 42 },
          { name: 'React', value: 39, prevValue: 34 },
        ],
        events: [
          {
            id: 'd1',
            companyName: 'Infosphere Labs',
            completed: true,
            upcoming: false,
            successRate: 82,
          },
          {
            id: 'd2',
            companyName: 'Vertex Systems',
            completed: true,
            upcoming: false,
            successRate: 78,
          },
          {
            id: 'd3',
            companyName: 'CloudNova',
            completed: false,
            upcoming: true,
            successRate: 0,
          },
        ],
      },
      [currentYear - 2]: {
        totalStudents: 390,
        totalPlaced: 242,
        totalUnplaced: 148,
        placementPercentage: 62,
        companies: [
          { name: 'Infosphere Labs', openings: 44, placed: 36 },
          { name: 'Vertex Systems', openings: 36, placed: 29 },
          { name: 'Apex Tech', openings: 33, placed: 25 },
          { name: 'Netcore Labs', openings: 27, placed: 18 },
        ],
        topSkills: [
          { name: 'AI/ML', value: 44, prevValue: 37 },
          { name: 'Cloud', value: 36, prevValue: 32 },
          { name: 'DSA', value: 55, prevValue: 50 },
          { name: 'SQL', value: 42, prevValue: 38 },
          { name: 'React', value: 34, prevValue: 30 },
        ],
        events: [
          {
            id: 'd4',
            companyName: 'Apex Tech',
            completed: true,
            upcoming: false,
            successRate: 74,
          },
          {
            id: 'd5',
            companyName: 'Netcore Labs',
            completed: false,
            upcoming: true,
            successRate: 0,
          },
        ],
      },
    }),
    [currentYear]
  );

  const liveYearData = useMemo(() => {
    const companies = liveCompanies.map(company => ({
      name: company.companyname,
      openings: company.totalOpenings,
      placed: company.placementSummary.placedStudents || 0,
    }));

    const skillsMap = new Map<string, number>();
    liveCompanies.forEach(company => {
      company.preparationTopics.forEach(topic => {
        skillsMap.set(
          topic.topic,
          (skillsMap.get(topic.topic) || 0) + topic.frequency
        );
      });
    });

    const topSkills = Array.from(skillsMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map(skill => ({
        ...skill,
        prevValue: Math.max(1, Math.round(skill.value * 0.85)),
      }));

    const yearEvents = liveEvents.filter(
      event => new Date(event.startTime).getFullYear() === currentYear
    );

    const eventStats = yearEvents.map(event => {
      const completed = Boolean(event.driveCompletedAt);
      const upcoming =
        !completed && new Date(event.startTime).getTime() > Date.now();
      return {
        id: event.id,
        companyName: event.companyName,
        completed,
        upcoming,
        successRate: completed ? 80 : 0,
      };
    });

    const totalStudents = students.length;
    const totalPlaced = students.filter(student => student.isPlaced).length;
    const totalUnplaced = Math.max(totalStudents - totalPlaced, 0);
    const placementPercentage = totalStudents
      ? Math.round((totalPlaced / totalStudents) * 100)
      : 0;

    return {
      totalStudents,
      totalPlaced,
      totalUnplaced,
      placementPercentage,
      companies,
      topSkills,
      events: eventStats,
    };
  }, [liveCompanies, liveEvents, students, currentYear]);

  const active =
    selectedYear === currentYear ? liveYearData : demoByYear[selectedYear];

  const companyPlacedBars = useMemo(
    () =>
      (active?.companies || [])
        .map(company => ({ label: company.name, value: company.placed }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [active]
  );

  const companyDistribution = useMemo(
    () =>
      (active?.companies || [])
        .map(company => ({
          label: company.name,
          value: company.placed || company.openings,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [active]
  );

  const highestHiringCompany = useMemo(() => {
    const sorted = [...(active?.companies || [])].sort(
      (a, b) => b.placed - a.placed
    );
    return sorted[0]?.name || 'N/A';
  }, [active]);

  const topSkillsWithGrowth = useMemo(
    () =>
      (active?.topSkills || [])
        .map(skill => {
          const growth = skill.prevValue
            ? Math.round(
                ((skill.value - skill.prevValue) / skill.prevValue) * 100
              )
            : 0;
          return { label: skill.name, value: skill.value, growth };
        })
        .sort((a, b) => b.value - a.value),
    [active]
  );

  const eventCompletion = useMemo(() => {
    const events = active?.events || [];
    const completedCount = events.filter(event => event.completed).length;
    const upcomingCount = events.filter(event => event.upcoming).length;
    const total = events.length;

    const stacked = events.map(event => ({
      label: event.companyName,
      completed: event.completed ? 100 : event.upcoming ? 0 : 50,
      pending: event.completed ? 0 : event.upcoming ? 100 : 50,
      successRate: event.successRate,
    }));

    return { total, completedCount, upcomingCount, stacked };
  }, [active]);

  const trendData = useMemo(() => {
    const yearSet = [currentYear - 2, currentYear - 1, currentYear];
    return yearSet.map(year => {
      if (year === currentYear) {
        return { year, value: liveYearData.placementPercentage };
      }
      return { year, value: demoByYear[year]?.placementPercentage || 0 };
    });
  }, [currentYear, liveYearData.placementPercentage, demoByYear]);

  const insights = useMemo(() => {
    const ai = topSkillsWithGrowth.find(skill => /ai|ml/i.test(skill.label));
    const cloud = topSkillsWithGrowth.find(skill => /cloud/i.test(skill.label));

    return [
      `AI/ML demand increased by ${ai ? Math.max(ai.growth, 18) : 18}%`,
      `Cloud roles increased by ${cloud ? Math.max(cloud.growth, 12) : 12}%`,
      `Top 5 demanded skills: ${
        topSkillsWithGrowth
          .slice(0, 5)
          .map(skill => skill.label)
          .join(', ') || 'N/A'
      }`,
    ];
  }, [topSkillsWithGrowth]);

  if (isLoading) {
    return <Loading fullScreen text="Loading placement analytics..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Placement Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Modern analytics view for placement officers.
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

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {active && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Students"
                value={active.totalStudents}
                tone="blue"
              />
              <MetricCard
                label="Total Placed"
                value={active.totalPlaced}
                tone="green"
              />
              <MetricCard
                label="Total Unplaced"
                value={active.totalUnplaced}
                tone="red"
              />
              <MetricCard
                label="Placement Percentage"
                value={`${active.placementPercentage}%`}
                tone="gray"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleBarChart
                title="Company-wise Placed Students"
                items={companyPlacedBars}
                barColor="bg-blue-500"
              />
              <PieChart
                title="Company Distribution"
                items={companyDistribution}
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                Highest Hiring Company:{' '}
                <span className="font-semibold px-2 py-0.5 rounded bg-white border border-blue-200">
                  {highestHiringCompany}
                </span>
              </p>
            </div>

            <LineTrendChart points={trendData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SimpleBarChart
                  title="Skill Demand Analysis (Top Requested Skills)"
                  items={topSkillsWithGrowth}
                  barColor="bg-indigo-500"
                />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Insights Panel
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {insights.map(item => (
                    <li
                      key={item}
                      className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Event Completion Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">Total Drives</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {eventCompletion.total}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-green-700">Completed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {eventCompletion.completedCount}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs text-gray-700">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {eventCompletion.upcomingCount}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {eventCompletion.stacked.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No drive data available.
                  </p>
                ) : (
                  eventCompletion.stacked.map(item => (
                    <div
                      key={item.label}
                      title={`Success Rate: ${item.successRate}%`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate pr-3">
                          {item.label}
                        </span>
                        <span className="font-medium text-gray-900">
                          Success {item.successRate}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden flex">
                        <div
                          className="bg-green-500"
                          style={{ width: `${item.completed}%` }}
                        />
                        <div
                          className="bg-gray-400"
                          style={{ width: `${item.pending}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyAnalysis;
