import React, { useState, useEffect } from 'react';
import { getEventSessions, getSessionAttendance } from '../api/attendance';

interface AttendanceHistoryProps {
  eventId: string;
  eventName: string;
  token: string;
  onClose: () => void;
}

type SessionDetail = {
  sessionId: string;
  createdAt: string;
  attendanceCount: number;
  students?: Array<{
    studentId: string;
    studentName: string;
    email: string;
    cgpa: number;
    attendanceTime: string;
  }>;
};

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  eventId,
  eventName,
  token,
  onClose,
}) => {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventSessions();
  }, [eventId]);

  const loadEventSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getEventSessions(eventId, token);
      setSessions(response.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (session: SessionDetail) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSessionAttendance(session.sessionId, token);
      setSelectedSession({
        ...session,
        students: response.students,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load session details'
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!selectedSession || !selectedSession.students) return;

    const headers = ['Student Name', 'Email', 'CGPA', 'Attendance Time'];
    const rows = selectedSession.students.map(student => [
      student.studentName,
      student.email,
      student.cgpa,
      new Date(student.attendanceTime).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName}-attendance-${selectedSession.sessionId}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{eventName}</h2>
              <p className="text-sm text-purple-100">Attendance History</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-purple-700 p-2 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sessions List */}
              <div className="lg:col-span-1">
                <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Sessions ({sessions.length})
                  </h3>

                  {sessions.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {sessions.map((session, index) => (
                        <button
                          key={session.sessionId}
                          onClick={() => loadSessionDetails(session)}
                          className={`w-full text-left p-3 rounded-lg transition ${
                            selectedSession?.sessionId === session.sessionId
                              ? 'bg-purple-600 text-white'
                              : 'bg-white hover:bg-purple-100 text-gray-800 border border-purple-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                Session {index + 1}
                              </p>
                              <p className="text-xs opacity-75">
                                {new Date(
                                  session.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs font-bold bg-opacity-20 bg-current rounded px-2 py-1">
                              {session.attendanceCount}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No sessions found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Details */}
              <div className="lg:col-span-2">
                {selectedSession ? (
                  <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Session Details
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          ID: {selectedSession.sessionId}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created:{' '}
                          {new Date(selectedSession.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedSession.students &&
                        selectedSession.students.length > 0 && (
                          <button
                            onClick={downloadCSV}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                          >
                            Download CSV
                          </button>
                        )}
                    </div>

                    {/* Attendance Records */}
                    <div className="bg-white rounded-lg border border-purple-300 overflow-hidden">
                      {selectedSession.students &&
                      selectedSession.students.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-purple-600 text-white">
                              <tr>
                                <th className="px-4 py-3 text-left">
                                  Student Name
                                </th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-center">CGPA</th>
                                <th className="px-4 py-3 text-right">
                                  Attendance Time
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSession.students.map((student, idx) => (
                                <tr
                                  key={`${student.studentId}-${idx}`}
                                  className={`border-b border-gray-200 hover:bg-purple-100 transition ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  <td className="px-4 py-3 font-semibold text-gray-800">
                                    {student.studentName}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {student.email}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-1 rounded ${
                                        student.cgpa >= 7
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {student.cgpa}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-600">
                                    {new Date(
                                      student.attendanceTime
                                    ).toLocaleTimeString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <p>No attendance records for this session</p>
                        </div>
                      )}
                    </div>

                    {/* Summary Stats */}
                    {selectedSession.students &&
                      selectedSession.students.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-center">
                            <p className="text-gray-600 text-sm">
                              Total Present
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              {selectedSession.students.length}
                            </p>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center">
                            <p className="text-gray-600 text-sm">Avg CGPA</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {(
                                selectedSession.students.reduce(
                                  (sum, s) => sum + s.cgpa,
                                  0
                                ) / selectedSession.students.length
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
                            <p className="text-gray-600 text-sm">Session ID</p>
                            <p className="text-xs font-mono font-bold text-green-600 truncate">
                              {selectedSession.sessionId.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="border-2 border-purple-300 rounded-lg p-12 bg-purple-50 text-center">
                    <p className="text-gray-600">
                      Select a session to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
