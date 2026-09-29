/**
 * Root Layout
 * Wraps the entire app with necessary providers
 */

import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../core/providers/AuthProvider';
import { queryClient } from '../core/api/queryClient';
import { LogBox } from 'react-native';
import { ApiRequestFallbackProvider } from '../core/providers/ApiRequestFallbackProvider';

// Ignore only specific non-critical warnings
LogBox.ignoreLogs([
  // Expo Go limitations (not relevant for production builds)
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported in Expo Go',
  
  // Known React Native warnings that don't affect functionality
  'Require cycle:',
  'VirtualizedLists should never be nested',
  
  // Route warnings (handled by expo-router)
  'Route "',
  'is missing the required default export',
  
  // Layout warnings
  '[Layout children]:',
]);

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiRequestFallbackProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" options={{ presentation: 'modal' }} />
            <Stack.Screen name="super-admin" />
            <Stack.Screen name="clinic-admin" />
            <Stack.Screen name="doctor" />
            <Stack.Screen name="therapist" />
            <Stack.Screen name="theme-demo" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="notification-preferences" />
            <Stack.Screen name="localization" />
            <Stack.Screen name="tenant-localization" />
          </Stack>
        </AuthProvider>
      </ApiRequestFallbackProvider>
    </QueryClientProvider>
  );
}
