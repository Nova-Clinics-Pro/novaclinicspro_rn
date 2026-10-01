// Route: /clinic-admin/episodes/{episodeId}/consultation?appointmentId={id}&clientId={id}
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ClinicalWorkspace } from '../../../../features/episodes/presentation/pages/ClinicalWorkspace';
import { useFeatures, isCosV1Enabled, isFreshnessV1Enabled } from '../../../../core/hooks/useFeatures';
import {
  CosWorkspaceStep,
  episodeWorkspaceRoute,
} from '../../../../features/doctorDashboard/application/consultationRoutes';

export default function ConsultationRoute() {
  const { episodeId, appointmentId, clientId, step } = useLocalSearchParams<{
    episodeId: string;
    appointmentId: string;
    clientId: string;
    step?: CosWorkspaceStep;
  }>();
  const features = useFeatures();

  if (isCosV1Enabled(features)) {
    return (
      <Redirect
        href={episodeWorkspaceRoute(
          episodeId,
          appointmentId,
          clientId,
          'doctor',
          step ?? 'assessment',
        ) as never}
      />
    );
  }
  // T-A.5 (ADR-P1-01, FR-A2, AC-1, DoD "no temporary workarounds"): the
  // `key={episodeId:appointmentId}` forced-remount was replaced by
  // useConsultationWorkspace.ts's own internal reset-on-episode/appointment-
  // change effects (casesheet, prescription, treatment recommendation all
  // already reset their local draft/refs when episodeId/appointmentId
  // changes) plus T-A.2's query invalidation — not from destroying and
  // recreating the whole component. This was only safe after fixing ED-003
  // — a stale-closure race in the reset-vs-sync effect pair the remount had
  // been masking (see useConsultationWorkspace.ts's
  // casesheetDataRef/isTreatmentSentRef comments) — and its treatment-
  // recommendation analog, found and fixed in the same task (T-A.5).
  //
  // T-A.6 (RB-1): the remount is conditionally restored when the freshness
  // flag is OFF, so toggling the flag off reproduces the exact pre-Phase-1
  // behavior ("no data effect" on rollback) — the invalidation calls in
  // useConsultationWorkspace.ts are gated behind the same flag.
  //
  // R3A · T-A.2: renders ClinicalWorkspace (which wraps the unchanged
  // ConsultationWorkspaceScreen in WorkspaceProvider) instead of
  // ConsultationWorkspaceScreen directly. The key expression itself is
  // untouched — it now remounts ClinicalWorkspace (context + screen
  // together) when the flag is OFF, which preserves the exact same
  // observable behavior the pre-existing remount had.
  const freshnessEnabled = isFreshnessV1Enabled(features);
  return (
    <ClinicalWorkspace
      key={freshnessEnabled ? undefined : `${episodeId}:${appointmentId}`}
      episodeId={episodeId}
      appointmentId={appointmentId}
      clientId={clientId}
    />
  );
}
