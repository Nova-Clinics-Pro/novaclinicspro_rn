/**
 * One clinic report
 * /clinic-admin/reports/{report}
 */

import React from 'react';
import { ProtectedRoute } from '../../../core/components/ProtectedRoute';
import { ClinicReportScreen } from '../../../features/reports/presentation/pages/ClinicReportScreen';

export default function ClinicReportRoute() {
  return (
    <ProtectedRoute>
      <ClinicReportScreen />
    </ProtectedRoute>
  );
}
