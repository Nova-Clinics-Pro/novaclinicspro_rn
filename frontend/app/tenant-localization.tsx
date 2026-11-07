/**
 * Tenant Locale Settings Route
 * /tenant-localization
 */

import { ProtectedRoute } from '../core/components/ProtectedRoute';
import React from 'react';
import { TenantLocaleSettingsScreen } from '../features/localization/presentation/pages/TenantLocaleSettingsScreen';

function TenantLocalizationRoute() {
  return <TenantLocaleSettingsScreen />;
}

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function TenantLocalizationRouteGuarded() {
  return (
    <ProtectedRoute>
      <TenantLocalizationRoute />
    </ProtectedRoute>
  );
}
