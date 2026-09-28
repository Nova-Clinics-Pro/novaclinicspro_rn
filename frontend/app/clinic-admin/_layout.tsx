/**
 * Clinic Admin Layout
 * Handles routing for all clinic admin screens
 * Protected by authentication - requires login
 */

import { Stack } from 'expo-router';
import { colors } from '../../core/theme/colors';
import { ProtectedRoute } from '../../core/components/ProtectedRoute';

export default function ClinicAdminLayout() {
  return (
    <ProtectedRoute>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.paper },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="staff/index" />
        <Stack.Screen name="staff/[staffId]" />
        <Stack.Screen name="staff/leave" />
        <Stack.Screen name="clients/index" />
        <Stack.Screen name="clients/[clientId]" />
        <Stack.Screen name="appointments/index" />
        <Stack.Screen name="appointments/create" />
        <Stack.Screen name="appointments/preview" />
        <Stack.Screen name="appointments/[appointmentId]" />
        <Stack.Screen name="appointments/[appointmentId]/create-episode" />
        <Stack.Screen name="appointments/[appointmentId]/link-episode" />
        <Stack.Screen name="treatment-sessions/index" />
        <Stack.Screen name="treatment-sessions/[sessionId]" />
        <Stack.Screen name="treatment-sheets" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/capabilities" />
        <Stack.Screen name="settings/global" />
        <Stack.Screen name="settings/appointment-rules" />
        <Stack.Screen name="settings/operating-hours" />
        <Stack.Screen name="settings/templates" />
        <Stack.Screen name="settings/rooms/index" />
        <Stack.Screen name="settings/rooms/[roomId]" />
        <Stack.Screen name="settings/treatments/index" />
        <Stack.Screen name="settings/treatments/create" />
        <Stack.Screen name="settings/treatments/[treatmentId]" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="bulk-upload" />
        <Stack.Screen name="billing" />
        <Stack.Screen name="analytics/index" />
        <Stack.Screen name="analytics/revenue" />
        <Stack.Screen name="analytics/users" />
        <Stack.Screen name="analytics/performance" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="branding" />
        <Stack.Screen name="feedback" />
        <Stack.Screen name="episodes/[episodeId]/index" />
        <Stack.Screen name="episodes/[episodeId]/workspace" />
        <Stack.Screen
          name="appointments/[appointmentId]/start-consultation"
          options={{ title: 'New Consultation', headerShown: false }}
        />
        <Stack.Screen
          name="episodes/[episodeId]/consultation"
          options={{ title: 'Consultation', headerShown: false }}
        />
        <Stack.Screen
          name="episodes/[episodeId]/complete-consultation"
          options={{ title: 'Review & Complete', headerShown: false }}
        />
      </Stack>
    </ProtectedRoute>
  );
}
