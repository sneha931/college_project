import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { createSession, getSessionAttendance } from '../api/attendance';
import type { SessionAttendanceResponse } from '../api/attendance';

interface AttendanceSessionProps {
  eventId: string;
  eventName: string;
  token: string;
  onClose: () => void;
}

export const AttendanceSession: React.FC<AttendanceSessionProps> = ({
  eventId,
  eventName,
  token,
  onClose,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] =
    useState<SessionAttendanceResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Initialize session
  const handleStartSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await createSession(eventId, token);
      setSessionId(response.sessionId);
      setIsPolling(true);
      // Start polling for attendance updates
      startPolling(response.sessionId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create attendance session'
      );
    } finally {
      setLoading(false);
    }
  };

  // Poll for attendance updates
  const startPolling = (newSessionId: string) => {
    // Initial fetch
    fetchAttendanceData(newSessionId);

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchAttendanceData(newSessionId);
    }, 3000);
  };

  // Fetch attendance data for the session
  const fetchAttendanceData = async (newSessionId: string) => {
    try {
      const response = await getSessionAttendance(newSessionId, token);
      setAttendanceData(response);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
    }
  };

  // Stop polling
  const handleStopSession = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Download QR code
  const downloadQRCode = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${eventName}-session-${sessionId}.png`;
        link.click();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{eventName}</h2>
              <p className="text-sm text-blue-100">
                Attendance Session Management
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-700 p-2 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!sessionId ? (
            // Start Session Section
            <div className="text-center py-12">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Ready to Start Attendance Session?
                </h3>
                <p className="text-gray-600">
                  Click the button below to create a new session and generate a
                  QR code
                </p>
              </div>
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                {loading ? 'Creating Session...' : 'Start Attendance Session'}
              </button>
            </div>
          ) : (
            // Active Session Section
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center border-2 border-blue-300 rounded-lg p-6 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Session QR Code
                </h3>
                <div
                  ref={qrRef}
                  className="bg-white p-4 rounded-lg border-2 border-gray-200"
                >
                  <QRCodeCanvas
                    value={sessionId}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Session ID:{' '}
                  <span className="font-mono font-bold">{sessionId}</span>
                </p>
                <div className="flex gap-2 mt-6 w-full">
                  <button
                    onClick={downloadQRCode}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Download QR
                  </button>
                  <button
                    onClick={handleStopSession}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Stop Session
                  </button>
                </div>
              </div>

              {/* Live Attendance List Section */}
              <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Live Attendance ({attendanceData?.attendanceCount || 0})
                </h3>

                {isPolling && (
                  <div className="mb-4 flex items-center gap-2 text-green-600">
                    <div className="animate-pulse w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">Live polling active...</span>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto">
                  {attendanceData && attendanceData.students.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceData.students.map((student, index) => (
                        <div
                          key={`${student.studentId}-${index}`}
                          className="bg-white border-l-4 border-green-500 p-3 rounded shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">
                                {student.studentName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {student.email}
                              </p>
                              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                                <span>CGPA: {student.cgpa}</span>
                                <span>
                                  Time:{' '}
                                  {new Date(
                                    student.attendanceTime
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-green-600 text-xl">✓</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No attendance records yet</p>
                      <p className="text-xs mt-2">
                        Waiting for students to scan the QR code...
                      </p>
                    </div>
                  )}
                </div>

                {/* Session Info */}
                {attendanceData && (
                  <div className="mt-4 pt-4 border-t border-green-300 text-xs text-gray-600">
                    <p>
                      <strong>Event:</strong>{' '}
                      {attendanceData.sessionInfo.eventName}
                    </p>
                    <p>
                      <strong>Venue:</strong> {attendanceData.sessionInfo.venue}
                    </p>
                    <p>
                      <strong>Session Created:</strong>{' '}
                      {new Date(
                        attendanceData.sessionInfo.createdAt
                      ).toLocaleString()}
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
