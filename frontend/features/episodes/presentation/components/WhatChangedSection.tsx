/**
 * "What Changed" Section (T-FE-C.2, FR-VCC-3)
 *
 * Renders the Visit Command Center's "what changed" region — the eight
 * frozen R7 signals (last Visit date · latest Visit summary · active
 * treatment sessions · completed session count · pending clinical
 * review · current Prescription existence/status · active Episode ·
 * billing state) — sourced ONLY from the governed Clinical Workspace
 * aggregate (T-FE-A.2's `useClinicalWorkspaceQuery`) via its `what_changed`
 * facts (T-BE-A.6) plus the pre-existing `prescription`/`episode`/
 * `billing` facts. No datasource/axios import, no second endpoint.
 *
 * No frontend derivation: no previous/current comparison, no date
 * sorting, no latest-record selection, no status comparison, no row
 * counting, no session-date inspection, no invoice arithmetic, no React
 * Query cache comparison. Every value rendered below is a direct,
 * backend-owned field read — `sessions.active_session_count`/
 * `.completed_session_count` are explicit backend counts (never derived
 * from Treatment Sheet rows/`day_number`/lifecycle status), and
 * `pending_review.pending` is the one backend-owned boolean (the
 * frontend never inspects `needs_clinical_review`/`under_clinical_review`
 * itself).
 *
 * Distinguishes `recorded` / `absent` / `not_recorded` / `unavailable` /
 * `not_applicable` / `unresolved` explicitly per signal — an empty,
 * null, or failed-request value is never presented as "No changes"; a
 * missing Visit summary is never fabricated, only labeled "Not recorded".
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicalWorkspaceQuery } from '../../data/repositories/clinicalWorkspace.repository.impl';
import {
  BillingFacts,
  EpisodeFacts,
  PendingReviewFacts,
  PrescriptionFacts,
  PreviousVisitFacts,
} from '../../data/models/clinicalWorkspace.dtos';

export interface WhatChangedSectionProps {
  tenantId: string;
  clientId: string;
  episodeId: string;
  appointmentId: string;
}

type Translate = (key: string) => string;

const resolveStateText = (recordingState: string, t: Translate): string => {
  switch (recordingState) {
    case 'absent':
      return t('visitCommandCenter.whatChanged.absent');
    case 'not_recorded':
      return t('visitCommandCenter.whatChanged.notRecorded');
    case 'not_applicable':
      return t('visitCommandCenter.whatChanged.notApplicable');
    case 'unresolved':
      return t('visitCommandCenter.whatChanged.unresolved');
    default:
      // 'unavailable', or any state this component does not specifically
      // name — never presented as a fabricated "no change".
      return t('visitCommandCenter.whatChanged.unavailable');
  }
};

const resolvePreviousVisitDateText = (previousVisit: PreviousVisitFacts, t: Translate): string => {
  if (previousVisit.recording_state === 'recorded' && previousVisit.exists && previousVisit.visit_date) {
    return previousVisit.visit_date;
  }
  return resolveStateText(previousVisit.recording_state, t);
};

const resolvePreviousVisitSummaryText = (previousVisit: PreviousVisitFacts, t: Translate): string => {
  if (previousVisit.recording_state === 'recorded' && previousVisit.exists) {
    if (previousVisit.outcome_notes) {
      return previousVisit.outcome_notes;
    }
    // A verified previous Visit with no captured narrative — a distinct,
    // more specific state than "no previous Visit"; never fabricated.
    return t('visitCommandCenter.whatChanged.notRecorded');
  }
  return resolveStateText(previousVisit.recording_state, t);
};

const resolveSessionCountText = (
  count: number | null,
  recordingState: string,
  t: Translate,
): string => {
  if (recordingState === 'recorded' && count !== null) {
    return String(count);
  }
  return resolveStateText(recordingState, t);
};

const resolvePendingReviewText = (pendingReview: PendingReviewFacts, t: Translate): string => {
  if (pendingReview.recording_state === 'recorded' && pendingReview.pending !== null) {
    return pendingReview.pending
      ? t('visitCommandCenter.whatChanged.pendingReviewYes')
      : t('visitCommandCenter.whatChanged.pendingReviewNo');
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
    if (episode.status === 'ACTIVE') return t('visitCommandCenter.whatChanged.episodeActive');
    if (episode.status === 'CLOSED') return t('visitCommandCenter.whatChanged.episodeClosed');
    return episode.status;
  }
  return resolveStateText(episode.recording_state, t);
};

const resolveBillingText = (billing: BillingFacts, t: Translate): string => {
  if (billing.recording_state !== 'recorded') {
    return resolveStateText(billing.recording_state, t);
  }
  if (!billing.invoice_exists) {
    return resolveStateText('absent', t);
  }
  if (billing.outstanding_amount && billing.currency) {
    return `${billing.currency} ${billing.outstanding_amount}`;
  }
  if (billing.invoice_status) {
    return billing.invoice_status;
  }
  return resolveStateText(billing.outstanding_state, t);
};

export const WhatChangedSection: React.FC<WhatChangedSectionProps> = ({
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
      <View style={cardStyle} testID="what-changed-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.whatChanged.title')}
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
      <View style={cardStyle} testID="what-changed-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.whatChanged.title')}
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

  const { what_changed: whatChanged, prescription, episode, billing } = data;

  const rows: Array<{ labelKey: string; value: string }> = [
    {
      labelKey: 'visitCommandCenter.whatChanged.previousVisitDate',
      value: resolvePreviousVisitDateText(whatChanged.previous_visit, t),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.previousVisitSummary',
      value: resolvePreviousVisitSummaryText(whatChanged.previous_visit, t),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.activeSessions',
      value: resolveSessionCountText(
        whatChanged.sessions.active_session_count,
        whatChanged.sessions.recording_state,
        t,
      ),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.completedSessions',
      value: resolveSessionCountText(
        whatChanged.sessions.completed_session_count,
        whatChanged.sessions.recording_state,
        t,
      ),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.pendingReview',
      value: resolvePendingReviewText(whatChanged.pending_review, t),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.prescription',
      value: resolvePrescriptionText(prescription, t),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.episode',
      value: resolveEpisodeText(episode, t),
    },
    {
      labelKey: 'visitCommandCenter.whatChanged.billing',
      value: resolveBillingText(billing, t),
    },
  ];

  return (
    <View style={cardStyle} testID="what-changed-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('visitCommandCenter.whatChanged.title')}
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
