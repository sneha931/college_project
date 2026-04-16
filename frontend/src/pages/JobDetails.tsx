import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';
import { Loading } from '../components';
import { useAuth } from '../context/AuthContext';
import type { Job } from '../types';

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await jobsApi.getJobById(id!);
      setJob(response.job);
    } catch {
      setError('Failed to fetch job details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatSalary = (salary: number) => {
    if (salary >= 100000) {
      return `${(salary / 100000).toFixed(1)} LPA`;
    }
    return `${salary.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading job details..." />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {error || 'Job not found'}
          </h2>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{job.jobrole}</h1>
                <p className="text-blue-200 text-lg">{job.companyname}</p>
                {job.isShortlisted && role === 'student' && (
                  <span className="inline-flex items-center mt-3 px-4 py-1.5 bg-emerald-500/90 text-white rounded-full text-sm font-semibold">
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Shortlisted
                  </span>
                )}
              </div>
              <div className="bg-white text-green-600 px-5 py-2 rounded-full font-bold text-lg">
                {formatSalary(job.salary)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8">
            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-sm mb-1">Min 10th Marks</p>
                <p className="text-2xl font-bold text-gray-800">
                  {job.minMarks10}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-sm mb-1">Min 12th Marks</p>
                <p className="text-2xl font-bold text-gray-800">
                  {job.minMarks12 ? `${job.minMarks12}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-sm mb-1">Min CGPA</p>
                <p className="text-2xl font-bold text-gray-800">
                  {job.minCGPA}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-sm mb-1">Experience</p>
                <p className="text-2xl font-bold text-gray-800">
                  {job.minExperience}+ months
                </p>
              </div>
            </div>

            {/* Required Skills */}
            {job.skills.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-3">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Job Description
                </h2>
                <div className="prose text-gray-600 whitespace-pre-line">
                  {job.description}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Posted: {formatDate(job.createdAt)}
                </div>
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Updated: {formatDate(job.updatedAt)}
                </div>
                {job.isShortlisted && (
                  <div className="flex items-center text-emerald-600 font-medium">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    You are shortlisted (auto-applied)
                  </div>
                )}
                {job.shortlistReady && role === 'admin' && (
                  <div className="flex items-center text-green-600">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Shortlist Ready
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            {role === 'admin' && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex gap-4">
                  <Link
                    to={`/admin/jobs/edit/${job.id}`}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                  >
                    Edit Job
                  </Link>
                  <Link
                    to={`/admin/events/create?jobId=${job.id}&companyName=${encodeURIComponent(job.companyname)}`}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Create Event
                  </Link>
                  {job.excelUrl && (
                    <a
                      href={job.excelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Download Shortlist
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
