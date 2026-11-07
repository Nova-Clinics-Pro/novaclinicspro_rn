/**
 * Notification Preferences Route
 * /notifications/preferences
 */

import { ProtectedRoute } from '../../core/components/ProtectedRoute';
import React from 'react';
import { NotificationPreferencesScreen } from '../../features/notifications/presentation/pages/NotificationPreferencesScreen';

function NotificationPreferencesRoute() {
  return <NotificationPreferencesScreen />;
}

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function NotificationPreferencesRouteGuarded() {
  return (
    <ProtectedRoute>
      <NotificationPreferencesRoute />
    </ProtectedRoute>
  );
}
