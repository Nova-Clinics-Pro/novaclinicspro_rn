/**
 * New Prescription Route
 * Route for creating a new prescription for a client
 *
 * Phase 4 (R4) · T-E.3b — renders the canonical `PrescriptionStandaloneScreen`
 * (T-B.5, hosting the T-B.4 canonical core) unconditionally. The R3B
 * `isClinicalSpineV1Enabled` flag-OFF fallback (`CreatePrescriptionScreen`)
 * is removed — T-E.3's own parity audit confirmed no capability gap.
 */

import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { PrescriptionStandaloneScreen } from '../../../../../features/prescriptions/presentation/pages/PrescriptionStandaloneScreen';
import { isCosV1Enabled, useFeatures } from '../../../../../core/hooks/useFeatures';
import { episodeWorkspaceRoute } from '../../../../../features/doctorDashboard/application/consultationRoutes';
import { InvalidWorkspaceState } from '../../../../../features/episodes/presentation/components/InvalidWorkspaceState';
import { useAuth } from '../../../../../features/auth/presentation/hooks/useAuth';
import { clinicalAuthoringAccess } from '../../../../../features/episodes/domain/clinicalAuthoringAccess';
import { NoAuthoringAccessState } from '../../../../../features/episodes/presentation/components/NoAuthoringAccessState';
import { LegacyRouteUsage } from '../../../../../core/observability/legacyRouteUsage';

export default function NewPrescriptionRoute() {
  const { clientId, appointmentId, episodeId } = useLocalSearchParams<{
    clientId: string;
    appointmentId?: string;
    episodeId?: string;
  }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const authoring = clinicalAuthoringAccess(currentUser?.permissions);
  const featuresForRoute = useFeatures();

  // Authoring a clinical document needs the Doctor-only permission; nobody reaches the form by a direct link.
  if (!authoring.canCreatePrescription) {
    return <NoAuthoringAccessState document="prescription" onBack={() => router.back()} />;
  }

  if (isCosV1Enabled(featuresForRoute)) {
    if (!episodeId || !appointmentId || !clientId) {
      return <InvalidWorkspaceState onBack={() => router.back()} />;
    }
    return (
      <Redirect
        href={episodeWorkspaceRoute(episodeId, appointmentId, clientId, 'doctor', 'prescription') as never}
      />
    );
  }

  return <>
    <LegacyRouteUsage route="prescription.new" />
    <PrescriptionStandaloneScreen clientId={clientId} appointmentId={appointmentId} />
  </>;
}
