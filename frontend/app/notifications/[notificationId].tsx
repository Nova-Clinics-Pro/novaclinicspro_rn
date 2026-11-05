/**
 * Notification Detail Route
 * /notifications/[notificationId]
 */

import { ProtectedRoute } from '../../core/components/ProtectedRoute';
import React from 'react';
import { NotificationDetailScreen } from '../../features/notifications/presentation/pages/NotificationDetailScreen';

function NotificationDetailRoute() {
  return <NotificationDetailScreen />;
}

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function NotificationDetailRouteGuarded() {
  return (
    <ProtectedRoute>
      <NotificationDetailRoute />
    </ProtectedRoute>
  );
}
