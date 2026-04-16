import { useState, useEffect } from 'react';
import { externalJobsApi } from '../../api';
import type { ExternalJob } from '../../api/externalJobs';
import { Loading } from '../../components';

const ManageExternalJobs = () => {
  const [pendingJobs, setPendingJobs] = useState<ExternalJob[]>([]);
  const [approvedJobs, setApprovedJobs] = useState<ExternalJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        externalJobsApi.getPending(),
        externalJobsApi.getApproved(),
      ]);

      setPendingJobs(pendingRes.jobs);
      setApprovedJobs(approvedRes.jobs);
    } catch (err) {
      setError('Failed to fetch external jobs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await externalJobsApi.import('theirstack');
      setSuccessMessage(result.message);

      // Refresh jobs list
      await fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import jobs');
    } finally {
      setIsImporting(false);
    }
  };

  const handleApprove = async (jobId: string) => {
    try {
      await externalJobsApi.approve(jobId);
      setSuccessMessage('Job approved successfully');

      // Move job from pending to approved
      const job = pendingJobs.find(j => j.id === jobId);
      if (job) {
        setPendingJobs(prev => prev.filter(j => j.id !== jobId));
        setApprovedJobs(prev => [{ ...job, isApproved: true }, ...prev]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve job');
    }
  };

  const handleReject = async (jobId: string) => {
    if (
      !confirm(
        'Are you sure you want to reject this job? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await externalJobsApi.reject(jobId);
      setSuccessMessage('Job rejected successfully');

      // Remove from pending list
      setPendingJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject job');
    }
  };

  const formatSalary = (salary: number) => {
    if (salary === 0) return 'Not specified';
    return `₹${(salary / 100000).toFixed(1)} LPA`;
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading external jobs..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🌐 External Job Integration
              </h1>
              <p className="text-gray-600">
                Import and manage jobs from third-party sources (India •
                Fresher)
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Importing...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Import India Fresher Jobs
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-green-800">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg
                  className="w-8 h-8"
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
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Pending Approval</h3>
            <p className="text-4xl font-bold">{pendingJobs.length}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <svg
                  className="w-8 h-8"
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
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">Approved</h3>
            <p className="text-4xl font-bold">{approvedJobs.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Pending Approval ({pendingJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                  activeTab === 'approved'
                    ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Approved ({approvedJobs.length})
              </button>
            </div>
          </div>

          {/* Job List */}
          <div className="p-6">
            {activeTab === 'pending' ? (
              pendingJobs.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-gray-600 text-lg">No pending jobs</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Click "Import India Fresher Jobs" to fetch recent jobs from
                    TheirStack
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingJobs.map(job => (
                    <div
                      key={job.id}
                      className="border border-orange-200 rounded-lg p-6 bg-orange-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {job.jobrole}
                            </h3>
                            <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                              {job.externalSource || 'External'}
                            </span>
                          </div>
                          <p className="text-gray-700 font-semibold mb-2">
                            {job.companyname}
                          </p>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {job.description || 'No description provided'}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm mb-3">
                            <div className="flex items-center gap-1 text-gray-700">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {formatSalary(job.salary)}
                            </div>
                            <div className="flex items-center gap-1 text-gray-700">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                              </svg>
                              Min CGPA: {job.minCGPA}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {job.skills.slice(0, 5).map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full border border-gray-300"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 5 && (
                              <span className="text-gray-500 text-xs px-3 py-1">
                                +{job.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleApprove(job.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleReject(job.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : approvedJobs.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
                <p className="text-gray-600 text-lg">
                  No approved external jobs
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedJobs.map(job => (
                  <div
                    key={job.id}
                    className="border border-green-200 rounded-lg p-6 bg-green-50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {job.jobrole}
                      </h3>
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                        ✓ Approved
                      </span>
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                        {job.externalSource || 'External'}
                      </span>
                    </div>
                    <p className="text-gray-700 font-semibold mb-2">
                      {job.companyname}
                    </p>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {job.description || 'No description provided'}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-700">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatSalary(job.salary)}
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                          />
                        </svg>
                        Min CGPA: {job.minCGPA}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {job.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-white text-gray-700 text-xs px-3 py-1 rounded-full border border-gray-300"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="text-gray-500 text-xs px-3 py-1">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageExternalJobs;
