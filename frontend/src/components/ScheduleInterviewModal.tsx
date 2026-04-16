import type { StudentProfile } from '../types';

interface Props {
  open: boolean;
  jobTitle: string;
  companyName: string;
  students: Pick<StudentProfile, 'name' | 'placementEmail' | 'btechCGPA' | 'skills'>[];
  isScheduling: boolean;
  onClose: () => void;
  onSchedule: () => void;
  onDownload?: () => void;
}

export default function ScheduleInterviewModal({
  open,
  jobTitle,
  companyName,
  students,
  isScheduling,
  onClose,
  onSchedule,
  onDownload,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Schedule AI Interviews</h2>
            <p className="text-sm text-gray-500 mt-1">
              {jobTitle} at {companyName} — {students.length} shortlisted student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
          >
            &times;
          </button>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto p-6">
          {students.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>No shortlisted students found for this job.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.placementEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-gray-400">CGPA</p>
                      <p className="text-sm font-semibold text-gray-800">{student.btechCGPA}</p>
                    </div>
                    {student.skills && student.skills.length > 0 && (
                      <div className="hidden sm:flex gap-1 flex-wrap max-w-[200px]">
                        {student.skills.slice(0, 3).map((skill) => (
                          <span key={skill} className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                            {skill}
                          </span>
                        ))}
                        {student.skills.length > 3 && (
                          <span className="text-xs text-gray-400">+{student.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          {onDownload && students.length > 0 && (
            <button
              onClick={onDownload}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              ⬇ Export Excel
            </button>
          )}
          {students.length > 0 && (
            <button
              onClick={onSchedule}
              disabled={isScheduling}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isScheduling ? 'Scheduling...' : `Schedule ${students.length} Interview${students.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
