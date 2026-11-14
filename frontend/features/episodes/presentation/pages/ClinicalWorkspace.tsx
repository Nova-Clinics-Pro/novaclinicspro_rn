/**
 * ClinicalWorkspace (R3A · T-A.2/T-D.1, ADR-R3A-01/02/03; R3B · T-C.2)
 *
 * The shell the consultation route renders. Wraps the existing, unchanged
 * ConsultationWorkspaceScreen in WorkspaceProvider (T-A.1) so Persistent
 * Context is available for the life of the workspace session.
 *
 * T-D.1 adds WorkspaceSaveStatusProvider + WorkspaceHeader as siblings of
 * ConsultationWorkspaceScreen, matching design §4's target architecture
 * diagram (WorkspaceHeader and ModuleHost are both children of
 * WorkspaceProvider, not of each other). WorkspaceSaveStatusProvider is a
 * SEPARATE context from WorkspaceProvider's own (see
 * WorkspaceSaveStatusContext.tsx's docstring for why) — its addition here
 * changes nothing about how ConsultationWorkspaceScreen or any module
 * resolves episodeId/appointmentId/clientId.
 *
 * Entry resolution (caseResolver.ts / consultationRoutes.ts) is untouched
 * (FR-A3, NAV-2) — this component only changes what the destination screen
 * does with the identifiers it already receives.
 *
 * R3B · T-C.2: `ClinicalTimeline` is mounted as a sibling of
 * `ConsultationWorkspaceScreen` (design's own "ModuleHost"), active only
 * when `isClinicalSpineV1Enabled` is ON. `ConsultationWorkspaceScreen`'s own
 * root is `flex: 1` (its own SafeAreaView + internal ScrollView) — it fills
 * whatever parent space it's given, not necessarily the whole screen. So
 * that adding the Timeline sibling doesn't silently squeeze it to zero
 * height, both are wrapped in their own flex-ratio containers (2:1) instead
 * of being bare flex:1 siblings — `ConsultationWorkspaceScreen.tsx` itself
 * is untouched either way. With the flag OFF, the JSX tree is byte-identical
 * to before this change (single `flex: 1` wrapper, no Timeline).
 */

import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useFeatures, isClinicalSpineV1Enabled } from '../../../../core/hooks/useFeatures';
import { WorkspaceProvider } from '../context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../context/WorkspaceSaveStatusContext';
import { WorkspaceHeader } from '../components/WorkspaceHeader';
import { ClinicalTimeline } from '../components/ClinicalTimeline';
import { ConsultationWorkspaceScreen } from './ConsultationWorkspaceScreen';
import { WorkspaceExitGuard } from '../navigation/WorkspaceExitGuard';

export interface ClinicalWorkspaceProps {
  episodeId: string;
  appointmentId: string;
  clientId: string;
}

export const ClinicalWorkspace: React.FC<ClinicalWorkspaceProps> = ({
  episodeId,
  appointmentId,
  clientId,
}) => {
  // Same tenantId resolution ConsultationWorkspaceScreen performs internally
  // today — useAuth() reads from the auth store, not the network, so calling
  // it here in addition to inside ConsultationWorkspaceScreen introduces no
  // new fetch and no behavior change.
  const { currentUser, selectedClinicId } = useAuth();
  const tenantId = selectedClinicId || currentUser?.tenantId || '';
  const timelineEnabled = isClinicalSpineV1Enabled(useFeatures());

  return (
    <WorkspaceProvider tenantId={tenantId} episodeId={episodeId} appointmentId={appointmentId} clientId={clientId}>
      <WorkspaceSaveStatusProvider>
        <View style={{ flex: 1 }}>
          <WorkspaceExitGuard />
          <WorkspaceHeader />
          <View style={{ flex: timelineEnabled ? 2 : 1 }}>
            <ConsultationWorkspaceScreen episodeId={episodeId} appointmentId={appointmentId} clientId={clientId} />
          </View>
          {timelineEnabled && (
            <View style={{ flex: 1 }}>
              <ClinicalTimeline />
            </View>
          )}
        </View>
      </WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  );
};
