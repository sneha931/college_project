import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api/interview';
import type { Job } from '../types';

interface JobCardProps {
  job: Job;
  showAdminActions?: boolean;
  onDelete?: (id: string) => void;
  onViewShortlist?: (id: string) => void;
  interviewStatus?: string; // 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'TERMINATED'
  interviewId?: string;
}

const JobCard = ({
  job,
  showAdminActions,
  onDelete,
  onViewShortlist,
  interviewStatus,
  interviewId,
}: JobCardProps) => {
  const navigate = useNavigate();
  const [isOpeningInterview, setIsOpeningInterview] = useState(false);

  const handleAttendInterview = async () => {
    if (!job.id || isOpeningInterview) return;

    try {
      setIsOpeningInterview(true);
      const response = await interviewApi.getMyInterview(job.id);
      if (!response.interview?.id) {
        window.alert(
          'Interview is not ready yet. Please try again in a few minutes.'
        );
        return;
      }
      navigate(`/interview/${response.interview.id}`);
    } catch {
      window.alert('Unable to open interview right now. Please try again.');
    } finally {
      setIsOpeningInterview(false);
    }
  };

  const formatSalary = (salary: number) => {
    if (salary >= 100000) {
      return `${(salary / 100000).toFixed(1)} LPA`;
    }
    // If salary is a small number (likely entered as LPA directly)
    if (salary > 0 && salary < 100) {
      return `${salary} LPA`;
    }
    return `${salary.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {job.jobrole}
            </h3>
            <p className="text-blue-600 font-medium">{job.companyname}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {job.isShortlisted && !showAdminActions && (
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
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
            {showAdminActions && job.shortlistReady && (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {job.shortlistCount || 0} Students
              </span>
            )}
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
              {formatSalary(job.salary)}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600 text-sm">
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
            <span>Min 10th: {job.minMarks10}%</span>
            {job.minMarks12 && (
              <span className="ml-3">12th: {job.minMarks12}%</span>
            )}
          </div>
          <div className="flex items-center text-gray-600 text-sm">
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span>Min CGPA: {job.minCGPA}</span>
            <span className="ml-3">Exp: {job.minExperience}+ months</span>
          </div>
        </div>

        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-gray-500 text-xs py-1">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}

        {job.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">
            {job.description}
          </p>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 gap-3">
          <div className="flex items-center gap-4">
            <Link
              to={`/jobs/${job.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              View Details →
            </Link>
          </div>

          {showAdminActions && (
            <div className="flex space-x-3">
              {job.shortlistReady && job.excelUrl && (
                <button
                  onClick={() => onViewShortlist?.(job.id)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Shortlist
                </button>
              )}
              {!job.shortlistReady && (
                <span className="text-yellow-600 text-sm flex items-center">
                  <svg
                    className="w-4 h-4 mr-1 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Processing...
                </span>
              )}
              <Link
                to={`/admin/jobs/edit/${job.id}`}
                className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
              >
                Edit
              </Link>
              <button
                onClick={() => onDelete?.(job.id)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          )}

          {!showAdminActions && job.interviewScheduled && interviewStatus && (() => {
            const status = interviewStatus;

            if (status === 'COMPLETED') {
              return (
                <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Interview Completed
                </span>
              );
            }

            if (status === 'TERMINATED') {
              return (
                <span className="flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-lg">
                  Interview Terminated
                </span>
              );
            }

            // SCHEDULED or IN_PROGRESS — show attend button
            return (
              <button
                onClick={handleAttendInterview}
                disabled={isOpeningInterview}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center"
                title="Click to attend the interview"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {isOpeningInterview ? 'Opening...' : status === 'IN_PROGRESS' ? '▶ Resume Interview' : 'Attend Interview'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
