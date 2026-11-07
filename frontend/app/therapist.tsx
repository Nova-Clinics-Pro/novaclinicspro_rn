/**
 * Therapist Dashboard Route
 * Entry point for the therapist dashboard at /therapist
 * 
 * This file renders the TherapistDashboardScreen from the therapistDashboard feature module
 * following clean architecture patterns.
 */

import { ProtectedRoute } from '../core/components/ProtectedRoute';
import React from 'react';
import { TherapistDashboardScreen } from '../features/therapistDashboard';

function TherapistDashboardRoute() {
  return <TherapistDashboardScreen />;
}

/** Authenticated route: anonymous visitors are redirected to /login (backend remains authoritative). */
export default function TherapistDashboardRouteGuarded() {
  return (
    <ProtectedRoute>
      <TherapistDashboardRoute />
    </ProtectedRoute>
  );
}
