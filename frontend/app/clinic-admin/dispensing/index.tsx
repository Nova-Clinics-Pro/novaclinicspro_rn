/**
 * Dispensing queue
 * /clinic-admin/dispensing
 */

import React from 'react';
import { ProtectedRoute } from '../../../core/components/ProtectedRoute';
import { ReadyToDispenseScreen } from '../../../features/dispensing/presentation/pages/ReadyToDispenseScreen';

export default function DispensingQueueRoute() {
  return (
    <ProtectedRoute>
      <ReadyToDispenseScreen />
    </ProtectedRoute>
  );
}
