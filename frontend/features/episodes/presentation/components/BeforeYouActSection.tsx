/**
 * "Before You Act" Section (T-FE-C.3, FR-VCC-4, FR-PS-1)
 *
 * Renders the Visit Command Center's "before you act" region — the four
 * verified-existing safety signals FR-VCC-4/FR-PS-1 (F-2 = Option A)
 * approve for R7: pending clinical review · current Prescription
 * existence/status · active Episode · treatment session progress —
 * sourced ONLY from the governed Clinical Workspace aggregate
 * (T-FE-A.2's `useClinicalWorkspaceQuery`), reusing the SAME backend
 * facts T-FE-C.2's `WhatChangedSection` already consumes
 * (`what_changed.pending_review`, `prescription`, `episode`,
 * `what_changed.sessions`). No datasource/axios import, no second
 * endpoint, no second query key.
 *
 * Hard clinical-safety boundary (FR-VCC-4 AC1, FR-PS-1 AC1, F-2,
 * ED-DEP-4/ED-ARCH-003 — verified: allergies/interactions/renal/hepatic
 * indicators do not exist anywhere in the backend today): this component
 * renders NO allergy, interaction, renal, or hepatic panel, and never
 * reads the frontend's own unbacked `Client.allergies`/`ClientEntity
 * .allergies` field (ED-ARCH-003) — displaying it here would read as "no
 * known allergies", a false clinical negative FR-PS-1 AC3 forbids.
 *
 * No frontend readiness/blocker derivation: this component does not
 * invent a "blocking"/"warning"/"waiting on permission" classification
 * for these four facts — no such severity field exists in the backend
 * contract for pending_review/prescription/episode/sessions (that is
 * `clinical_workflow_service`'s own, separate, not-yet-built contract —
 * T-BE-B.2, out of this task's frozen scope). The only distinct semantic
 * states rendered here are the backend's own `RecordingState` values
 * (`recorded`/`absent`/`unavailable`/`not_applicable`/`unresolved`) —
 * never a frontend-invented severity tier.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicalWorkspaceQuery } from '../../data/repositories/clinicalWorkspace.repository.impl';
import {
  EpisodeFacts,
  PendingReviewFacts,
  PrescriptionFacts,
  SessionActivityFacts,
} from '../../data/models/clinicalWorkspace.dtos';

export interface BeforeYouActSectionProps {
  tenantId: string;
  clientId: string;
  episodeId: string;
  appointmentId: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

const resolveStateText = (recordingState: string, t: Translate): string => {
  switch (recordingState) {
    case 'absent':
      return t('visitCommandCenter.beforeYouAct.absent');
    case 'not_recorded':
      return t('visitCommandCenter.beforeYouAct.notRecorded');
    case 'not_applicable':
      return t('visitCommandCenter.beforeYouAct.notApplicable');
    case 'unresolved':
      return t('visitCommandCenter.beforeYouAct.unresolved');
    default:
      // 'unavailable', or any state this component does not specifically
      // name — never presented as a fabricated "no known issue".
      return t('visitCommandCenter.beforeYouAct.unavailable');
  }
};

const resolvePendingReviewText = (pendingReview: PendingReviewFacts, t: Translate): string => {
  if (pendingReview.recording_state === 'recorded' && pendingReview.pending !== null) {
    return pendingReview.pending
      ? t('visitCommandCenter.beforeYouAct.pendingReviewYes')
      : t('visitCommandCenter.beforeYouAct.pendingReviewNo');
  }
  return resolveStateText(pendingReview.recording_state, t);
};

const resolvePrescriptionText = (prescription: PrescriptionFacts, t: Translate): string => {
  if (prescription.recording_state === 'recorded' && prescription.exists && prescription.document_status) {
    return prescription.document_status;
  }
  return resolveStateText(prescription.recording_state, t);
};

const resolveEpisodeText = (episode: EpisodeFacts, t: Translate): string => {
  if (episode.recording_state === 'recorded' && episode.status) {
    if (episode.status === 'ACTIVE') return t('visitCommandCenter.beforeYouAct.episodeActive');
    if (episode.status === 'CLOSED') return t('visitCommandCenter.beforeYouAct.episodeClosed');
    return episode.status;
  }
  return resolveStateText(episode.recording_state, t);
};

const resolveSessionProgressText = (sessions: SessionActivityFacts, t: Translate): string => {
  if (
    sessions.recording_state === 'recorded' &&
    sessions.active_session_count !== null &&
    sessions.completed_session_count !== null
  ) {
    return t('visitCommandCenter.beforeYouAct.sessionProgressValue', {
      active: sessions.active_session_count,
      completed: sessions.completed_session_count,
    });
  }
  return resolveStateText(sessions.recording_state, t);
};

export const BeforeYouActSection: React.FC<BeforeYouActSectionProps> = ({
  tenantId,
  clientId,
  episodeId,
  appointmentId,
}) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useClinicalWorkspaceQuery(
    tenantId,
    clientId,
    episodeId,
    appointmentId,
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface.default,
      borderColor: colors.border.default,
      borderWidth: borderWidths.default,
      borderRadius: radii.medium,
      padding: spacing.lg,
    },
  ];

  if (isLoading) {
    return (
      <View style={cardStyle} testID="before-you-act-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.beforeYouAct.title')}
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary.default} />
          <Text style={[typography.body2, { color: colors.text.secondary, marginLeft: spacing.sm }]}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={cardStyle} testID="before-you-act-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.beforeYouAct.title')}
        </Text>
        <Text style={[typography.body2, { color: colors.feedback.error, marginBottom: spacing.sm }]}>
          {t('errors.generic.loadFailed')}
        </Text>
        <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { what_changed: whatChanged, prescription, episode } = data;

  const rows: Array<{ labelKey: string; value: string }> = [
    {
      labelKey: 'visitCommandCenter.beforeYouAct.pendingReview',
      value: resolvePendingReviewText(whatChanged.pending_review, t),
    },
    {
      labelKey: 'visitCommandCenter.beforeYouAct.prescription',
      value: resolvePrescriptionText(prescription, t),
    },
    {
      labelKey: 'visitCommandCenter.beforeYouAct.episode',
      value: resolveEpisodeText(episode, t),
    },
    {
      labelKey: 'visitCommandCenter.beforeYouAct.sessionProgress',
      value: resolveSessionProgressText(whatChanged.sessions, t),
    },
  ];

  return (
    <View style={cardStyle} testID="before-you-act-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('visitCommandCenter.beforeYouAct.title')}
      </Text>
      {rows.map((row) => (
        <View key={row.labelKey} style={{ marginBottom: spacing.sm }}>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>{t(row.labelKey)}</Text>
          <Text style={[typography.body2, { color: colors.text.primary }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
};

// Component-local structural layout only — no reusable visual value
// (border width, radius, colour, spacing) belongs here; those are
// applied via the inline `cardStyle`/style arrays above, from
// `useClinicTheme()`.
const styles = StyleSheet.create({
  card: {},
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
});
