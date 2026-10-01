/**
 * Edit Prescription Route
 * Route for editing an existing prescription
 *
 * Phase 4 (R4) · T-E.3b — renders the canonical `PrescriptionStandaloneScreen`
 * (T-B.5, hosting the T-B.4 canonical core) unconditionally. The R3B
 * `isClinicalSpineV1Enabled` flag-OFF fallback (`PrescriptionEditScreen`) is
 * removed — T-E.3's own parity audit confirmed no capability gap.
 */

import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { PrescriptionStandaloneScreen } from '../../../../../../features/prescriptions/presentation/pages/PrescriptionStandaloneScreen';
import { isCosV1Enabled, useFeatures } from '../../../../../../core/hooks/useFeatures';
import { episodeWorkspaceRoute } from '../../../../../../features/doctorDashboard/application/consultationRoutes';
import { InvalidWorkspaceState } from '../../../../../../features/episodes/presentation/components/InvalidWorkspaceState';

export default function EditPrescriptionRoute() {
  const { clientId, prescriptionId, episodeId, appointmentId } = useLocalSearchParams<{
    clientId: string;
    prescriptionId: string;
    episodeId?: string;
    appointmentId?: string;
  }>();
  const router = useRouter();

  if (isCosV1Enabled(useFeatures())) {
    if (!episodeId || !appointmentId || !clientId) {
      return <InvalidWorkspaceState onBack={() => router.back()} />;
    }
    return (
      <Redirect
        href={episodeWorkspaceRoute(episodeId, appointmentId, clientId, 'doctor', 'prescription') as never}
      />
    );
  }

  return <PrescriptionStandaloneScreen clientId={clientId} prescriptionId={prescriptionId} />;
}
