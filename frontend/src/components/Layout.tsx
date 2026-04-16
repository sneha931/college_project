import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import StudentChatbot from './StudentChatbot';
import { eventsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Event, SubmitEventFeedbackRequest } from '../types';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [pendingFeedbackEvents, setPendingFeedbackEvents] = useState<Event[]>(
    []
  );
  const [activeFeedbackEventId, setActiveFeedbackEventId] = useState<
    string | null
  >(null);
  const [feedbackFormByEvent, setFeedbackFormByEvent] = useState<
    Record<string, SubmitEventFeedbackRequest>
  >({});
  const [submittingEventId, setSubmittingEventId] = useState<string | null>(
    null
  );
  const [popupError, setPopupError] = useState('');

  useEffect(() => {
    const fetchPendingFeedback = async () => {
      if (
        !isAuthenticated ||
        role !== 'student' ||
        location.pathname === '/events'
      ) {
        return;
      }

      try {
        const response = await eventsApi.getPendingFeedbackForms();
        if (!response.events || response.events.length === 0) {
          return;
        }

        setPendingFeedbackEvents(response.events);
        setActiveFeedbackEventId(response.events[0].id);

        const initialForms: Record<string, SubmitEventFeedbackRequest> = {};
        for (const event of response.events) {
          initialForms[event.id] = {
            rating: 5,
            interviewReview: '',
            preparationTopics: '',
          };
        }
        setFeedbackFormByEvent(initialForms);
      } catch {
        // Silent fail to avoid blocking page load
      }
    };

    fetchPendingFeedback();
  }, [isAuthenticated, role, location.pathname]);

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

    setPopupError('');
    setSubmittingEventId(eventId);
    try {
      await eventsApi.submitFeedback(eventId, {
        rating: Number(form.rating),
        interviewReview: form.interviewReview,
        preparationTopics: form.preparationTopics,
      });

      setPendingFeedbackEvents(prev => {
        const nextEvents = prev.filter(event => event.id !== eventId);
        setActiveFeedbackEventId(nextEvents[0]?.id ?? null);
        return nextEvents;
      });
    } catch {
      setPopupError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingEventId(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>

      {role === 'student' &&
        activeFeedbackEvent &&
        activeFeedbackForm &&
        location.pathname !== '/events' && (
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

              {popupError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {popupError}
                </div>
              )}

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
                  Later
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

      {isAuthenticated && role === 'student' && <StudentChatbot />}
    </div>
  );
};

export default Layout;
