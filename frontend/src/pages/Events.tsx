import { useState, useEffect } from 'react';
import { eventsApi } from '../api';
import { Loading } from '../components';
import type { Event, SubmitEventFeedbackRequest } from '../types';

const JOB_LINK_PREFIX = '__JOB_ID__:';

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [pendingFeedbackEvents, setPendingFeedbackEvents] = useState<Event[]>(
    []
  );
  const [feedbackFormByEvent, setFeedbackFormByEvent] = useState<
    Record<string, SubmitEventFeedbackRequest>
  >({});
  const [submittingEventId, setSubmittingEventId] = useState<string | null>(
    null
  );
  const [activeFeedbackEventId, setActiveFeedbackEventId] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const [eventsResponse, feedbackResponse] = await Promise.all([
        eventsApi.getAllEvents(),
        eventsApi.getPendingFeedbackForms(),
      ]);
      setEvents(eventsResponse.events);
      setPendingFeedbackEvents(feedbackResponse.events);
      setActiveFeedbackEventId(feedbackResponse.events[0]?.id ?? null);

      const initialForms: Record<string, SubmitEventFeedbackRequest> = {};
      for (const event of feedbackResponse.events) {
        initialForms[event.id] = {
          rating: 5,
          interviewReview: '',
          preparationTopics: '',
        };
      }
      setFeedbackFormByEvent(initialForms);
    } catch {
      setError('Failed to fetch events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeedbackForm = (
    eventId: string,
    key: keyof SubmitEventFeedbackRequest,
    value: string | number
  ) => {
    setFeedbackFormByEvent(prev => ({
      ...prev,
      [eventId]: {
        rating: 5,
        interviewReview: '',
        preparationTopics: '',
        ...(prev[eventId] || {}),
        [key]: value,
      },
    }));
  };

  const submitFeedback = async (eventId: string) => {
    const form = feedbackFormByEvent[eventId];
    if (!form) {
      return;
    }

    setFeedbackError('');
    setFeedbackSuccess('');
    setSubmittingEventId(eventId);
    try {
      await eventsApi.submitFeedback(eventId, {
        rating: Number(form.rating),
        interviewReview: form.interviewReview,
        preparationTopics: form.preparationTopics,
      });

      setPendingFeedbackEvents(prev => {
        const nextEvents = prev.filter(event => event.id !== eventId);
        setActiveFeedbackEventId(currentActive =>
          currentActive === eventId
            ? (nextEvents[0]?.id ?? null)
            : currentActive
        );
        return nextEvents;
      });
      setFeedbackSuccess('Feedback submitted successfully.');
    } catch {
      setFeedbackError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingEventId(null);
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

  const isUpcoming = (startTime: string) => new Date(startTime) > new Date();
  const activeFeedbackEvent = pendingFeedbackEvents.find(
    event => event.id === activeFeedbackEventId
  );
  const activeFeedbackForm = activeFeedbackEvent
    ? feedbackFormByEvent[activeFeedbackEvent.id] || {
        rating: 5,
        interviewReview: '',
        preparationTopics: '',
      }
    : null;

  if (isLoading) {
    return <Loading fullScreen text="Loading events..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6 transform hover:scale-105 transition-transform">
            <svg
              className="w-10 h-10 text-white"
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
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Upcoming Events
          </h1>
          <p className="text-gray-600 text-lg">
            Stay updated with placement events and schedules
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md">
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
          </div>
        )}

        {/* Feedback Alerts */}
        {feedbackError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-md">
            <p className="text-red-700 font-medium">{feedbackError}</p>
          </div>
        )}
        {feedbackSuccess && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-md">
            <p className="text-green-700 font-medium">{feedbackSuccess}</p>
          </div>
        )}

        {/* Pending Feedback Forms */}
        {pendingFeedbackEvents.length > 0 && (
          <div className="mb-10 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Pending Feedback Forms
            </h2>
            <p className="text-gray-600 mb-6">
              These drives are completed. Please submit your feedback.
            </p>

            <div className="space-y-5">
              {pendingFeedbackEvents.map(event => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {event.companyName}
                    </h3>
                    <p className="text-sm text-gray-500">{event.venue}</p>
                  </div>
                  <button
                    onClick={() => setActiveFeedbackEventId(event.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Fill Feedback Form
                  </button>
                </div>
              ))}
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
              No Events Scheduled
            </h3>
            <p className="text-gray-600">
              Check back later for upcoming placement events
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const upcoming = isUpcoming(event.startTime);
              const isCompleted = Boolean(event.driveCompletedAt);
              const isHighlighted = upcoming && !isCompleted;
              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 ${
                    isHighlighted
                      ? 'hover:shadow-2xl hover:scale-105 ring-2 ring-blue-200'
                      : 'opacity-80 grayscale-[0.05]'
                  }`}
                >
                  <div
                    className={`px-6 py-4 ${
                      isHighlighted
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-white truncate">
                        {event.companyName}
                      </h3>
                      {isHighlighted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                          Upcoming
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <svg
                          className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-blue-600' : 'text-gray-400'}`}
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
                          className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-blue-600' : 'text-gray-400'}`}
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
                          className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-blue-600' : 'text-gray-400'}`}
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
                                  <span
                                    className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${isHighlighted ? 'bg-blue-500' : 'bg-gray-400'}`}
                                  />
                                  <span>{line}</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeFeedbackEvent && activeFeedbackForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Feedback Form
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeFeedbackEvent.companyName} •{' '}
                    {activeFeedbackEvent.venue}
                  </p>
                </div>
                <button
                  onClick={() => setActiveFeedbackEventId(null)}
                  className="text-gray-500 hover:text-gray-700"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rating (1-5)
                  </label>
                  <select
                    value={activeFeedbackForm.rating}
                    onChange={e =>
                      updateFeedbackForm(
                        activeFeedbackEvent.id,
                        'rating',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={4}>4</option>
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interview Review
                  </label>
                  <input
                    type="text"
                    value={activeFeedbackForm.interviewReview || ''}
                    onChange={e =>
                      updateFeedbackForm(
                        activeFeedbackEvent.id,
                        'interviewReview',
                        e.target.value
                      )
                    }
                    placeholder="How was your interview experience?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Important Topics (comma separated)
                </label>
                <input
                  type="text"
                  value={activeFeedbackForm.preparationTopics || ''}
                  onChange={e =>
                    updateFeedbackForm(
                      activeFeedbackEvent.id,
                      'preparationTopics',
                      e.target.value
                    )
                  }
                  placeholder="DSA, DBMS, OS, OOP, Project questions"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setActiveFeedbackEventId(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitFeedback(activeFeedbackEvent.id)}
                  disabled={submittingEventId === activeFeedbackEvent.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingEventId === activeFeedbackEvent.id
                    ? 'Submitting...'
                    : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
