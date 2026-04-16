import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../../api';
import { JobCard, Loading } from '../../components';
import type { Job } from '../../types';
import * as XLSX from 'xlsx';

interface ShortlistStudent {
  name: string;
  email: string;
  marks10: number;
  marks12: number | null;
  diplomaMarks: number | null;
  btechCGPA: number;
  experience: number;
  matchedSkills: string[];
  score: number;
  interviewStatus?: string | null;
  interviewScore?: number | null;
  interviewVerdict?: string | null;
}

const ManageJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    jobId: string;
    jobTitle: string;
  }>({
    open: false,
    jobId: '',
    jobTitle: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [shortlistModal, setShortlistModal] = useState<{
    open: boolean;
    jobTitle: string;
    companyName: string;
    students: ShortlistStudent[];
    excelUrl: string | null;
  }>({
    open: false,
    jobTitle: '',
    companyName: '',
    students: [],
    excelUrl: null,
  });
  const [isLoadingShortlist, setIsLoadingShortlist] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchJobs();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Background polling for jobs that are not shortlistReady
  useEffect(() => {
    let bgInterval: ReturnType<typeof setInterval>;
    
    if (jobs.some(job => !job.shortlistReady)) {
      bgInterval = setInterval(async () => {
        try {
          const response = await jobsApi.getAllJobs();
          setJobs(response.jobs);
        } catch {
          // Silently fail background poll
        }
      }, 5000);
    }
    
    return () => {
      if (bgInterval) clearInterval(bgInterval);
    };
  }, [jobs]);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.getAllJobs();
      setJobs(response.jobs);
    } catch {
      setError('Failed to fetch jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteModal({ open: true, jobId: id, jobTitle: title });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await jobsApi.deleteJob(deleteModal.jobId);
      setJobs(jobs.filter(job => job.id !== deleteModal.jobId));
      setDeleteModal({ open: false, jobId: '', jobTitle: '' });
    } catch {
      setError('Failed to delete job. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openShortlistModal = (response: Awaited<ReturnType<typeof jobsApi.getShortlist>>) => {
    if (!response.students || response.students.length === 0) {
      setError('No eligible students found for this job.');
      return;
    }
    setShortlistModal({
      open: true,
      jobTitle: response.job.jobrole,
      companyName: response.job.companyname,
      students: response.students,
      excelUrl: response.excelUrl || null,
    });
  };

  const handleViewShortlist = async (jobId: string) => {
    // Clear any existing poll
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPollingJobId(null);

    try {
      setError('');
      setSuccess('');
      setIsLoadingShortlist(true);
      const response = await jobsApi.getShortlist(jobId);

      if (!response.shortlistReady) {
        setIsLoadingShortlist(false);
        setPollingJobId(jobId);
        setSuccess('Shortlist is being generated. Please wait...');

        pollIntervalRef.current = setInterval(async () => {
          try {
            const poll = await jobsApi.getShortlist(jobId);
            if (poll.shortlistReady) {
              clearInterval(pollIntervalRef.current!);
              pollIntervalRef.current = null;
              setPollingJobId(null);
              setSuccess('');
              setJobs(prev =>
                prev.map(j => (j.id === jobId ? { ...j, shortlistReady: true } : j))
              );
              openShortlistModal(poll);
            }
          } catch {
            clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            setPollingJobId(null);
            setSuccess('');
            setError('Failed to fetch shortlist. Please try again.');
          }
        }, 3000);
        return;
      }

      openShortlistModal(response);
    } catch {
      setError('Failed to fetch shortlist. Please try again.');
    } finally {
      setIsLoadingShortlist(false);
    }
  };

  const handlescheduleInterview = async () => {
    if (shortlistModal.students.length === 0) {
      setError('No students available to schedule interviews for');
      return;
    }

    setIsSchedulingInterview(true);
    try {
      // Get the current job from jobs list
      const currentJob = jobs.find(
        j =>
          j.jobrole === shortlistModal.jobTitle &&
          j.companyname === shortlistModal.companyName
      );

      if (!currentJob) {
        setError('Job information not found');
        setIsSchedulingInterview(false);
        return;
      }

      // Collect student emails
      const studentEmails = shortlistModal.students.map(s => s.email);

      // Call API to schedule interviews
      const response = await jobsApi.scheduleInterviews(
        currentJob.id,
        studentEmails
      );

      // Show success notification
      setSuccess(
        `AI interview scheduled for ${response.scheduledCount} student${
          response.scheduledCount !== 1 ? 's' : ''
        }. Notifications sent to all shortlisted students.`
      );

      // Close the shortlist modal after scheduling
      setTimeout(() => {
        setShortlistModal({
          open: false,
          jobTitle: '',
          companyName: '',
          students: [],
          excelUrl: null,
        });
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to schedule interviews. Please try again.'
      );
    } finally {
      setIsSchedulingInterview(false);
    }
  };

  const handleDownloadExcel = () => {
    if (shortlistModal.students.length === 0) {
      setError('No shortlisted students available to export.');
      return;
    }

    const rows = shortlistModal.students.map(student => ({
      'Student Name': student.name,
      Email: student.email,
      '10th Marks': student.marks10,
      '12th / Diploma': student.marks12 ?? student.diplomaMarks ?? 'N/A',
      'B.Tech CGPA': student.btechCGPA,
      'Experience (Months)': student.experience,
      'Matched Skills': student.matchedSkills.join(', '),
      Score: student.score,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shortlisted Students');

    const safeJobTitle = shortlistModal.jobTitle.replace(/[^a-z0-9]/gi, '_');
    const safeCompanyName = shortlistModal.companyName.replace(
      /[^a-z0-9]/gi,
      '_'
    );
    const fileName = `${safeCompanyName}_${safeJobTitle}_shortlist.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading jobs..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Manage Jobs
            </h1>
            <p className="text-gray-600">
              Create, edit, and manage job postings
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/jobs/create"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Job
            </Link>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3">
            {pollingJobId && (
              <svg className="w-5 h-5 animate-spin text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-gray-500 text-sm">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-800">
                  {jobs.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
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
              <div className="ml-4">
                <p className="text-gray-500 text-sm">Shortlist Ready</p>
                <p className="text-2xl font-bold text-gray-800">
                  {jobs.filter(j => j.shortlistReady).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
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
              </div>
              <div className="ml-4">
                <p className="text-gray-500 text-sm">Companies</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(jobs.map(j => j.companyname)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No jobs posted yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first job posting
            </p>
            <Link
              to="/admin/jobs/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Job
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                showAdminActions
                onDelete={() => handleDeleteClick(job.id, job.jobrole)}
                onViewShortlist={handleViewShortlist}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Delete Job Post
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium">"{deleteModal.jobTitle}"</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() =>
                  setDeleteModal({ open: false, jobId: '', jobTitle: '' })
                }
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortlist Modal */}
      {shortlistModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Shortlisted Students
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {shortlistModal.jobTitle} at {shortlistModal.companyName} -{' '}
                  {shortlistModal.students.length} eligible students
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlescheduleInterview}
                  disabled={isSchedulingInterview}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSchedulingInterview ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2 animate-spin"
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
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Interview'
                  )}
                </button>
                {shortlistModal.students.length > 0 && (
                  <button
                    onClick={handleDownloadExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                  >
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Excel
                  </button>
                )}
                <button
                  onClick={() =>
                    setShortlistModal({
                      open: false,
                      jobTitle: '',
                      companyName: '',
                      students: [],
                      excelUrl: null,
                    })
                  }
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
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
            </div>

            {/* Modal Body - Table */}
            <div className="overflow-auto flex-1 p-6">
              <table className="w-full border-collapse">
                <thead className="bg-blue-600 text-white sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      10th Marks
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      12th / Diploma
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      B.Tech CGPA
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      Experience (Months)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Matched Skills
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">
                      AI Interview
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shortlistModal.students.map((student, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {student.marks10}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {student.marks12
                          ? `${student.marks12}% (12th)`
                          : student.diplomaMarks
                            ? `${student.diplomaMarks}% (Diploma)`
                            : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {student.btechCGPA}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {student.experience}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-1">
                          {student.matchedSkills
                            .slice(0, 3)
                            .map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                          {student.matchedSkills.length > 3 && (
                            <span className="text-gray-500 text-xs">
                              +{student.matchedSkills.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {student.interviewStatus === 'COMPLETED' ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            student.interviewVerdict === 'Cleared 1st Round'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {student.interviewVerdict === 'Cleared 1st Round'
                              ? `✓ Cleared (${student.interviewScore}/100)`
                              : `✗ Not Cleared (${student.interviewScore}/100)`}
                          </span>
                        ) : student.interviewStatus === 'IN_PROGRESS' ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">In Progress</span>
                        ) : student.interviewStatus === 'SCHEDULED' ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Scheduled</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not scheduled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for shortlist */}
      {isLoadingShortlist && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <svg
              className="w-6 h-6 animate-spin text-blue-600"
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
            <span className="text-gray-700">Loading shortlist...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageJobs;
