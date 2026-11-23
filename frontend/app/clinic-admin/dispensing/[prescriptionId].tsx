/**
 * Dispense one prescription
 * /clinic-admin/dispensing/{prescription}
 */

import React from 'react';
import { ProtectedRoute } from '../../../core/components/ProtectedRoute';
import { DispenseScreen } from '../../../features/dispensing/presentation/pages/DispenseScreen';

export default function DispenseRoute() {
  return (
    <ProtectedRoute>
      <DispenseScreen />
    </ProtectedRoute>
  );
}
