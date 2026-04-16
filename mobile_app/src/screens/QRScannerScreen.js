import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { clearAuth } from '../utils/auth';

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    // The QR code contains the raw sessionId UUID
    const sessionId = data.trim();

    // Validate it looks like a UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(sessionId)) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a valid attendance session. Please scan the QR code shown on the classroom screen.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
      return;
    }

    // Navigate to Attendance screen passing sessionId
    navigation.navigate('Attendance', { sessionId });
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          navigation.replace('Login');
        },
      },
    ]);
  };

  // --- Permission states ---
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1D4ED8" />
        <Text style={styles.infoText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorTitle}>Camera Access Denied</Text>
        <Text style={styles.errorText}>
          Camera permission is required to scan QR codes. Please tap below to allow access.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={requestPermission}>
          <Text style={styles.retryText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Scan QR Code</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Scanner */}
      <View style={styles.scannerWrapper}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay with scan frame */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        {scanned ? (
          <View style={styles.scannedInfo}>
            <ActivityIndicator color="#1D4ED8" />
            <Text style={styles.scannedText}>QR Code detected! Loading...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.instructionTitle}>Point your camera at the QR code</Text>
            <Text style={styles.instructionSub}>
              Scan the QR code displayed on the classroom screen to mark your attendance.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const FRAME_SIZE = 240;
const OVERLAY_COLOR = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    padding: 28,
  },
  infoText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#000',
    zIndex: 10,
  },
  topTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  logoutText: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '600',
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#60A5FA',
    borderWidth: 4,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  instructions: {
    backgroundColor: '#111827',
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  instructionTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionSub: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  scannedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannedText: {
    color: '#60A5FA',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
});
