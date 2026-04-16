import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../../api';
import {
  AttendanceHistory,
  AttendanceSession,
  Loading,
} from '../../components';
import type { Event } from '../../types';

const JOB_LINK_PREFIX = '__JOB_ID__:';

const ManageEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    eventId: string;
    eventName: string;
  }>({
    open: false,
    eventId: '',
    eventName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [completingEventId, setCompletingEventId] = useState<string | null>(
    null
  );
  const [attendanceModal, setAttendanceModal] = useState<{
    open: boolean;
    eventId: string;
    eventName: string;
  }>({
    open: false,
    eventId: '',
    eventName: '',
  });
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    eventId: string;
    eventName: string;
  }>({
    open: false,
    eventId: '',
    eventName: '',
  });
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsApi.getAllEvents();
      setEvents(response.events);
    } catch {
      setError('Failed to fetch events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({ open: true, eventId: id, eventName: name });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await eventsApi.deleteEvent(deleteModal.eventId);
      setEvents(events.filter(event => event.id !== deleteModal.eventId));
      setDeleteModal({ open: false, eventId: '', eventName: '' });
      setSuccess('Event deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCompleteDrive = async (eventId: string) => {
    setError('');
    setSuccess('');
    setCompletingEventId(eventId);
    try {
      const response = await eventsApi.completeDrive(eventId);
      setEvents(prev =>
        prev.map(event =>
          event.id === eventId
            ? {
                ...event,
                driveCompletedAt: response.event.driveCompletedAt,
                feedbackRequestsSentAt: response.event.feedbackRequestsSentAt,
              }
            : event
        )
      );
      setSuccess(
        `${response.message}. Forms available for ${response.notifiedCount} shortlisted students.`
      );
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Failed to complete drive and trigger feedback forms.');
    } finally {
      setCompletingEventId(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading events..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Manage Events
            </h1>
            <p className="text-gray-600 text-lg">
              Organize and manage placement events
            </p>
          </div>
          <Link
            to="/admin/events/create"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
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
            Create Event
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-green-700 font-medium">{success}</p>
              </div>
              <button
                onClick={() => setSuccess('')}
                className="text-green-500 hover:text-green-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto text-gray-400 mb-4"
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
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              No Events Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first event
            </p>
            <Link
              to="/admin/events/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
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
              Create Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white truncate">
                    {event.companyName}
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-500">Venue</p>
                        <p className="text-gray-800 font-medium">
                          {event.venue}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
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
                      <div>
                        <p className="text-sm text-gray-500">Start Time</p>
                        <p className="text-gray-800 font-medium">
                          {formatDateTime(event.startTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">
                          Process of Day
                        </p>
                        <ul className="space-y-1">
                          {event.processOfDay
                            .split('\n')
                            .map(line => line.trim())
                            .filter(
                              line =>
                                line.length > 0 &&
                                !line.startsWith(JOB_LINK_PREFIX)
                            )
                            .map((line, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-gray-800"
                              >
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <span>{line}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setAttendanceModal({
                          open: true,
                          eventId: event.id,
                          eventName: event.companyName,
                        })
                      }
                      className="flex-1 min-w-[140px] px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                    >
                      Generate QR
                    </button>
                    <button
                      onClick={() =>
                        setHistoryModal({
                          open: true,
                          eventId: event.id,
                          eventName: event.companyName,
                        })
                      }
                      className="flex-1 min-w-[140px] px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                    >
                      Attendance History
                    </button>
                    <button
                      onClick={() => handleCompleteDrive(event.id)}
                      disabled={
                        Boolean(event.driveCompletedAt) ||
                        completingEventId === event.id
                      }
                      className="flex-1 min-w-[140px] px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {event.driveCompletedAt
                        ? 'Drive Completed'
                        : completingEventId === event.id
                          ? 'Completing...'
                          : 'Complete Drive'}
                    </button>
                    <Link
                      to={`/admin/events/edit/${event.id}`}
                      className="flex-1 min-w-[140px] px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-center"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() =>
                        handleDeleteClick(event.id, event.companyName)
                      }
                      className="flex-1 min-w-[140px] px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Delete Event
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the event for{' '}
                <span className="font-semibold">{deleteModal.eventName}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setDeleteModal({ open: false, eventId: '', eventName: '' })
                  }
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {attendanceModal.open && (
          <AttendanceSession
            eventId={attendanceModal.eventId}
            eventName={attendanceModal.eventName}
            token={token}
            onClose={() =>
              setAttendanceModal({
                open: false,
                eventId: '',
                eventName: '',
              })
            }
          />
        )}

        {historyModal.open && (
          <AttendanceHistory
            eventId={historyModal.eventId}
            eventName={historyModal.eventName}
            token={token}
            onClose={() =>
              setHistoryModal({
                open: false,
                eventId: '',
                eventName: '',
              })
            }
          />
        )}
      </div>
    </div>
  );
};

export default ManageEvents;
