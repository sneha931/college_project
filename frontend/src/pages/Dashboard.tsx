import { useState, useEffect } from 'react';
import { jobsApi } from '../api';
import { interviewApi } from '../api/interview';
import { JobCard, Loading } from '../components';
import type { Job, InterviewDetails } from '../types';

const Dashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [interviewByJobId, setInterviewByJobId] = useState<Record<string, InterviewDetails>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSalary, setFilterSalary] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchTerm, filterSalary, jobs]);

  const fetchJobs = async () => {
    try {
      const [jobsRes, interviewsRes] = await Promise.all([
        jobsApi.getAllJobs(),
        interviewApi.getMyInterviews().catch(() => ({ interviews: [] as InterviewDetails[] })),
      ]);
      setJobs(jobsRes.jobs);
      setFilteredJobs(jobsRes.jobs);
      const byJobId = Object.fromEntries(
        (interviewsRes.interviews ?? []).map((iv) => [iv.jobId, iv])
      );
      setInterviewByJobId(byJobId);
    } catch {
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSalaryInRupees = (salary: number): number => {
    if (salary >= 100000) return salary;
    if (salary > 0 && salary < 100000) return salary * 100000;
    return 0;
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        job =>
          job.companyname.toLowerCase().includes(term) ||
          job.jobrole.toLowerCase().includes(term) ||
          job.skills.some(skill => skill.toLowerCase().includes(term))
      );
    }

    if (filterSalary) {
      const minSalaryRupees = parseInt(filterSalary, 10);
      filtered = filtered.filter(
        job => getSalaryInRupees(job.salary) >= minSalaryRupees
      );
    }

    setFilteredJobs(filtered);
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading job opportunities..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Job Opportunities
          </h1>
          <p className="text-gray-600">
            Explore the latest campus placement opportunities
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by company, role, or skills..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Salary (LPA)
              </label>
              <select
                value={filterSalary}
                onChange={e => setFilterSalary(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">All Salaries</option>
                <option value="300000">3+ LPA</option>
                <option value="500000">5+ LPA</option>
                <option value="800000">8+ LPA</option>
                <option value="1000000">10+ LPA</option>
                <option value="1500000">15+ LPA</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterSalary('');
                }}
                className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            Showing <span className="font-semibold">{filteredJobs.length}</span>{' '}
            of <span className="font-semibold">{jobs.length}</span> jobs
          </p>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No jobs found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                interviewStatus={interviewByJobId[job.id]?.status}
                interviewId={interviewByJobId[job.id]?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
