/**
 * New Casesheet Route
 * Route for creating a new casesheet for a client
 *
 * Phase 4 (R4) · T-E.3b — renders the canonical `CasesheetStandaloneScreen`
 * (T-B.2, hosting the T-B.1 canonical core) unconditionally. The R3B
 * `isClinicalSpineV1Enabled` flag-OFF fallback (`CreateCasesheetScreen`) is
 * removed — T-E.3's own parity audit confirmed no capability gap.
 */

import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { CasesheetStandaloneScreen } from '../../../../../features/casesheets/presentation/pages/CasesheetStandaloneScreen';
import { isCosV1Enabled, useFeatures } from '../../../../../core/hooks/useFeatures';
import { episodeWorkspaceRoute } from '../../../../../features/doctorDashboard/application/consultationRoutes';
import { InvalidWorkspaceState } from '../../../../../features/episodes/presentation/components/InvalidWorkspaceState';
import { useAuth } from '../../../../../features/auth/presentation/hooks/useAuth';
import { clinicalAuthoringAccess } from '../../../../../features/episodes/domain/clinicalAuthoringAccess';
import { NoAuthoringAccessState } from '../../../../../features/episodes/presentation/components/NoAuthoringAccessState';
import { LegacyRouteUsage } from '../../../../../core/observability/legacyRouteUsage';

export default function NewCasesheetRoute() {
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
  if (!authoring.canCreateCasesheet) {
    return <NoAuthoringAccessState document="casesheet" onBack={() => router.back()} />;
  }

  if (isCosV1Enabled(featuresForRoute)) {
    if (!episodeId || !appointmentId || !clientId) {
      return <InvalidWorkspaceState onBack={() => router.back()} />;
    }
    return (
      <Redirect
        href={episodeWorkspaceRoute(episodeId, appointmentId, clientId, 'doctor', 'case_sheet') as never}
      />
    );
  }

  return <>
    <LegacyRouteUsage route="casesheet.new" />
    <CasesheetStandaloneScreen clientId={clientId} appointmentId={appointmentId} episodeId={episodeId} />
  </>;
}
