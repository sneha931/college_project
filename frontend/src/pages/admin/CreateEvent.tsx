import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { eventsApi } from '../../api';
import type { CreateEventRequest } from '../../types';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedJobId = searchParams.get('jobId')?.trim() || '';
  const selectedCompanyName = searchParams.get('companyName')?.trim() || '';
  const isJobLinkedEvent = selectedJobId.length > 0;

  const [formData, setFormData] = useState<CreateEventRequest>({
    venue: '',
    companyName: selectedCompanyName,
    startTime: '',
    processOfDay: '',
    jobId: selectedJobId || undefined,
  });

  // Rounds for "process of the day"
  const [roundsCount, setRoundsCount] = useState<number>(1);
  const [rounds, setRounds] = useState<string[]>(['']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRoundsCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value || '0', 10);
    const safeValue = isNaN(value) || value < 1 ? 1 : value;
    setRoundsCount(safeValue);
    setRounds(prev => {
      if (safeValue > prev.length) {
        return [...prev, ...Array(safeValue - prev.length).fill('')];
      }
      return prev.slice(0, safeValue);
    });
  };

  const handleRoundNameChange = (index: number, value: string) => {
    setRounds(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.venue || !formData.companyName || !formData.startTime) {
      setError('Venue, company name and start time are required');
      return;
    }

    if (!roundsCount || roundsCount < 1) {
      setError('Please enter at least 1 round');
      return;
    }

    const trimmedRounds = rounds.slice(0, roundsCount).map(r => r.trim());
    if (trimmedRounds.some(r => r.length === 0)) {
      setError('Please fill all round names');
      return;
    }

    // Build processOfDay text from rounds
    const processOfDayText = trimmedRounds
      .map((name, index) => `Round ${index + 1}: ${name}`)
      .join('\n');

    const processWithMetadata = isJobLinkedEvent
      ? `__JOB_ID__:${selectedJobId}\n${processOfDayText}`
      : processOfDayText;

    setIsSubmitting(true);

    try {
      const payload: CreateEventRequest = {
        ...formData,
        processOfDay: processWithMetadata,
      };

      if (isJobLinkedEvent) {
        payload.jobId = selectedJobId;
        payload.companyName = selectedCompanyName;
      }

      await eventsApi.createEvent(payload);
      navigate('/admin/events');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create event. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current date/time in local format for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/events"
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
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
            Back to Events
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create New Event
          </h1>
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

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <svg
                className="w-6 h-6 mr-3"
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
              Event Details
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-blue-600"
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
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                readOnly={isJobLinkedEvent}
                placeholder="Enter company name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {isJobLinkedEvent && (
                <p className="text-xs text-gray-500">
                  Company is auto-selected from the chosen job post.
                </p>
              )}
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-blue-600"
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
                Venue *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                required
                placeholder="Enter venue address"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-blue-600"
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
                Start Time *
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                min={getCurrentDateTime()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Process of Day - Rounds */}
            <div className="space-y-4">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                <svg
                  className="w-4 h-4 mr-2 text-blue-600"
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
                Process of the Day (Rounds) *
              </label>

              {/* Number of rounds */}
              <div className="space-y-1">
                <span className="text-xs text-gray-500">How many rounds?</span>
                <input
                  type="number"
                  min={1}
                  value={roundsCount}
                  onChange={handleRoundsCountChange}
                  className="w-32 px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Round names */}
              <div className="space-y-3">
                {Array.from({ length: roundsCount }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-16 text-sm font-medium text-gray-700">
                      Round {index + 1}
                    </span>
                    <input
                      type="text"
                      value={rounds[index] ?? ''}
                      onChange={e =>
                        handleRoundNameChange(index, e.target.value)
                      }
                      placeholder="Enter round name (e.g., Aptitude Test, Technical Interview)"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Create Event
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
