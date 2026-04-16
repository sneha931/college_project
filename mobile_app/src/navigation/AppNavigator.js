import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import { isLoggedIn } from '../utils/auth';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    isLoggedIn().then((loggedIn) => {
      setInitialRoute(loggedIn ? 'QRScanner' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: '#1D4ED8' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{
            title: 'Mark Attendance',
            headerBackVisible: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
});
