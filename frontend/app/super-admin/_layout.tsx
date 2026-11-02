/**
 * Super Admin Layout
 * Handles routing for all super admin screens
 * Protected by authentication - requires super_admin role
 * 
 * Route structure:
 * - index.tsx -> /super-admin
 * - tenants/index.tsx -> /super-admin/tenants
 * - applications/index.tsx -> /super-admin/applications
 * - billing/index.tsx -> /super-admin/billing
 * - system-settings.tsx -> /super-admin/system-settings
 */

import { Stack } from 'expo-router';
import { useClinicTheme } from '../../core/theme/useClinicTheme';
import { ProtectedRoute } from '../../core/components/ProtectedRoute';

export default function SuperAdminLayout() {
  const theme = useClinicTheme();
  return (
    <ProtectedRoute>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background.default },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="tenants/index" />
        <Stack.Screen name="tenants/create" />
        <Stack.Screen name="tenants/[tenantId]" />
        <Stack.Screen name="applications/index" />
        <Stack.Screen name="applications/[applicationId]" />
        <Stack.Screen name="billing" />
        <Stack.Screen name="system-settings" />
      </Stack>
    </ProtectedRoute>
  );
}
