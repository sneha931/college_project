import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { eventsApi, jobsApi } from '../../api';
import type { CreateEventRequest, CreateJobRequest } from '../../types';

const CreateJob = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [createEventAlongside, setCreateEventAlongside] = useState(false);
  const [eventData, setEventData] = useState<CreateEventRequest>({
    venue: '',
    companyName: '',
    startTime: '',
    processOfDay: '',
  });

  const [formData, setFormData] = useState<CreateJobRequest>({
    companyname: '',
    jobrole: '',
    minMarks10: 50,
    minMarks12: undefined,
    minCGPA: 6.5,
    minExperience: 0,
    skills: [],
    salary: 0,
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === 'minMarks10' ||
        name === 'minMarks12' ||
        name === 'minCGPA' ||
        name === 'minExperience' ||
        name === 'salary'
          ? value === ''
            ? undefined
            : Number(value)
          : value,
    });
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove),
    });
  };

  const handleEventChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await jobsApi.createJob(formData);

      if (createEventAlongside) {
        if (
          !eventData.venue ||
          !eventData.startTime ||
          !eventData.processOfDay
        ) {
          setError('Please fill all event details to create event with job.');
          setIsSubmitting(false);
          return;
        }

        await eventsApi.createEvent({
          venue: eventData.venue,
          companyName: formData.companyname,
          startTime: eventData.startTime,
          processOfDay: eventData.processOfDay,
        });
      }

      navigate('/admin/jobs');
    } catch {
      setError(
        createEventAlongside
          ? 'Failed to create job/event. Please verify details and try again.'
          : 'Failed to create job. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/jobs"
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
            Back to Jobs
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Create New Job</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company & Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyname"
                  required
                  value={formData.companyname}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Google"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Role *
                </label>
                <input
                  type="text"
                  name="jobrole"
                  required
                  value={formData.jobrole}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Software Engineer"
                />
              </div>
            </div>

            {/* Academic Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min 10th Marks (%)
                </label>
                <input
                  type="number"
                  name="minMarks10"
                  step="0.01"
                  value={formData.minMarks10}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min 12th Marks (%)
                </label>
                <input
                  type="number"
                  name="minMarks12"
                  step="0.01"
                  value={formData.minMarks12 || ''}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min CGPA
                </label>
                <input
                  type="number"
                  name="minCGPA"
                  step="0.01"
                  max="10"
                  value={formData.minCGPA}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Experience (months)
                </label>
                <input
                  type="number"
                  name="minExperience"
                  min="0"
                  value={formData.minExperience}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary (per annum in INR)
              </label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., 1000000 for 10 LPA"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyPress={e =>
                    e.key === 'Enter' && (e.preventDefault(), addSkill())
                  }
                  placeholder="Add a skill"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-400 hover:text-blue-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Describe the job role, responsibilities, and requirements..."
              />
            </div>

            {/* Optional Event Creation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">
                    Create Event for this Job
                  </h3>
                  <p className="text-sm text-gray-600">
                    Enable this to create an event for the same company in one
                    step.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateEventAlongside(prev => !prev);
                    setEventData(prev => ({
                      ...prev,
                      companyName: formData.companyname,
                    }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    createEventAlongside
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {createEventAlongside ? 'Enabled' : 'Enable'}
                </button>
              </div>

              {createEventAlongside && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.companyname}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Venue *
                    </label>
                    <input
                      type="text"
                      name="venue"
                      value={eventData.venue}
                      onChange={handleEventChange}
                      placeholder="e.g., Seminar Hall A"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={eventData.startTime}
                      onChange={handleEventChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Process of Day *
                    </label>
                    <textarea
                      name="processOfDay"
                      rows={4}
                      value={eventData.processOfDay}
                      onChange={handleEventChange}
                      placeholder="Round 1: Aptitude&#10;Round 2: Technical Interview&#10;Round 3: HR Interview"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Creating...'
                  : createEventAlongside
                    ? 'Create Job + Event'
                    : 'Create Job Post'}
              </button>
              <Link
                to="/admin/jobs"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateJob;
