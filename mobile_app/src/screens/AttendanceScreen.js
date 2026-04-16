import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { markAttendanceAPI } from '../services/api';
import { getToken, getStudentId, getUserName } from '../utils/auth';

const STATUS = {
  IDLE: 'idle',
  AUTHENTICATING: 'authenticating',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export default function AttendanceScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [studentName, setStudentName] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAndStart();
  }, []);

  const checkBiometricAndStart = async () => {
    const name = await getUserName();
    setStudentName(name || 'Student');

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!compatible) {
      // Device has no biometric hardware at all — hard block
      setStatus(STATUS.FAILED);
      setErrorMessage(
        'This device does not support fingerprint authentication.\n\nAttendance can only be marked using a device with fingerprint hardware.'
      );
      return;
    }

    if (!enrolled) {
      // Hardware exists but no fingerprint enrolled — hard block
      setStatus(STATUS.FAILED);
      setErrorMessage(
        'No fingerprint is set up on this device.\n\nPlease go to Settings → Security → Fingerprint and enroll your fingerprint, then try again.'
      );
      return;
    }

    setBiometricAvailable(true);
    triggerBiometricAuth();
  };

  const triggerBiometricAuth = async () => {
    setStatus(STATUS.AUTHENTICATING);
    setErrorMessage('');

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark your attendance',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await submitAttendance();
      } else {
        const reason = result.error || 'Authentication was cancelled.';
        setStatus(STATUS.FAILED);
        setErrorMessage(
          reason === 'user_cancel'
            ? 'Authentication cancelled. Tap the button to try again.'
            : `Authentication failed: ${reason}`
        );
      }
    } catch (err) {
      setStatus(STATUS.FAILED);
      setErrorMessage('Biometric authentication error. Please try again.');
    }
  };

  const submitAttendance = async () => {
    setStatus(STATUS.SUBMITTING);
    setErrorMessage('');

    try {
      const token = await getToken();
      const studentId = await getStudentId();

      if (!token || !studentId) {
        setStatus(STATUS.FAILED);
        setErrorMessage('Session expired. Please login again.');
        return;
      }

      const response = await markAttendanceAPI(studentId, sessionId, token);

      if (response.success) {
        setStatus(STATUS.SUCCESS);
      } else {
        setStatus(STATUS.FAILED);
        setErrorMessage(response.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      setStatus(STATUS.FAILED);

      const httpStatus = error?.response?.status;
      const backendMsg = error?.response?.data?.message;

      // Token expired or invalid — force re-login
      if (httpStatus === 401 || httpStatus === 403) {
        setErrorMessage('Your session has expired. Please login again.');
        setTimeout(async () => {
          const { clearAuth } = await import('../utils/auth');
          await clearAuth();
          navigation.replace('Login');
        }, 2000);
        return;
      }

      // Show exact backend message when available
      if (backendMsg) {
        setErrorMessage(backendMsg);
        return;
      }

      if (!error.response) {
        setErrorMessage(
          'Cannot reach server.\n\nCheck:\n• Backend is running (npm run dev)\n• IP in api.js is correct\n• Phone & laptop on same Wi-Fi'
        );
        return;
      }

      setErrorMessage(`Error ${httpStatus || ''}: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleScanAgain = () => {
    navigation.replace('QRScanner');
  };

  const handleRetry = () => {
    if (biometricAvailable) {
      triggerBiometricAuth();
    } else {
      submitAttendance();
    }
  };

  // --- Render by status ---

  if (status === STATUS.SUCCESS) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Attendance Marked!</Text>
          <Text style={styles.successSubtitle}>
            Your attendance has been recorded successfully.
          </Text>
          <View style={styles.infoBox}>
            <InfoRow label="Student" value={studentName} />
            <InfoRow label="Session ID" value={`${sessionId.slice(0, 8)}...`} />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleScanAgain}>
            <Text style={styles.primaryBtnText}>Scan Another Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === STATUS.FAILED) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.failedIcon}>❌</Text>
          <Text style={styles.failedTitle}>Failed</Text>
          <Text style={styles.failedMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleScanAgain}>
            <Text style={styles.secondaryBtnText}>Scan QR Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === STATUS.AUTHENTICATING || status === STATUS.SUBMITTING) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#1D4ED8" style={{ marginBottom: 20 }} />
          <Text style={styles.loadingTitle}>
            {status === STATUS.AUTHENTICATING
              ? 'Verifying Fingerprint...'
              : 'Marking Attendance...'}
          </Text>
          <Text style={styles.loadingSubtitle}>
            {status === STATUS.AUTHENTICATING
              ? 'Please place your finger on the sensor'
              : 'Sending data to server...'}
          </Text>
        </View>
      </View>
    );
  }

  // IDLE state
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.idleIcon}>🔒</Text>
        <Text style={styles.idleTitle}>Biometric Verification</Text>
        <Text style={styles.idleSubtitle}>
          Authenticate with your fingerprint to mark attendance
        </Text>
        <View style={styles.infoBox}>
          <InfoRow label="Student" value={studentName} />
          <InfoRow label="Session ID" value={`${sessionId.slice(0, 8)}...`} />
        </View>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={biometricAvailable ? triggerBiometricAuth : submitAttendance}
        >
          <Text style={styles.primaryBtnText}>
            {biometricAvailable ? 'Authenticate & Mark Attendance' : 'Mark Attendance'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleScanAgain}>
          <Text style={styles.secondaryBtnText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  // Success
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Failed
  failedIcon: { fontSize: 64, marginBottom: 16 },
  failedTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  failedMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Loading
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Idle
  idleIcon: { fontSize: 64, marginBottom: 16 },
  idleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Info box
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  // Buttons
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
});
