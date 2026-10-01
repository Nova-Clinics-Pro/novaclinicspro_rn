/**
 * Edit Casesheet Route
 * Route for editing an existing casesheet
 *
 * Phase 4 (R4) · T-E.3b — renders the canonical `CasesheetStandaloneScreen`
 * (T-B.2, hosting the T-B.1 canonical core) unconditionally. The R3B
 * `isClinicalSpineV1Enabled` flag-OFF fallback (`CasesheetEditScreen`) is
 * removed — T-E.3's own parity audit confirmed no capability gap.
 */

import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { CasesheetStandaloneScreen } from '../../../../../../features/casesheets/presentation/pages/CasesheetStandaloneScreen';
import { isCosV1Enabled, useFeatures } from '../../../../../../core/hooks/useFeatures';
import { episodeWorkspaceRoute } from '../../../../../../features/doctorDashboard/application/consultationRoutes';
import { InvalidWorkspaceState } from '../../../../../../features/episodes/presentation/components/InvalidWorkspaceState';

export default function EditCasesheetRoute() {
  const { clientId, casesheetId, episodeId, appointmentId } = useLocalSearchParams<{
    clientId: string;
    casesheetId: string;
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
        href={episodeWorkspaceRoute(episodeId, appointmentId, clientId, 'doctor', 'case_sheet') as never}
      />
    );
  }

  return <CasesheetStandaloneScreen clientId={clientId} casesheetId={casesheetId} />;
}
