/**
 * Notifications List Route
 * /notifications - Now uses backend-integrated Notification History Screen
 */

import { ProtectedRoute } from '../../core/components/ProtectedRoute';
import React from 'react';
import { NotificationHistoryScreen } from '../../features/notifications/presentation/pages/NotificationHistoryScreen';

function NotificationsRoute() {
  return <NotificationHistoryScreen />;
}

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function NotificationsRouteGuarded() {
  return (
    <ProtectedRoute>
      <NotificationsRoute />
    </ProtectedRoute>
  );
}
