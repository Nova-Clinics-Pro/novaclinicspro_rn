/**
 * "Why Today" Section (T-FE-C.1, FR-VCC-2)
 *
 * Renders the Visit Command Center's "why today" region — appointment
 * purpose and patient-stated concern — sourced ONLY from the governed
 * Clinical Workspace aggregate (T-FE-A.2's `useClinicalWorkspaceQuery`).
 * No datasource/axios import, no second endpoint, no inference from
 * appointment_type, appointment notes, clinic type, route, Case Sheet
 * chief complaint, diagnosis, prescription, treatment state, or a
 * previous Visit.
 *
 * Engineering Truth (R7-APPOINTMENT-PURPOSE-VERIFICATION.md, T--1.3):
 * the backend models "appointment purpose" and "patient-stated concern"
 * as a SINGLE fact (`AppointmentPurposeFacts.value`/`recording_state`)
 * — no distinct backend field for either half exists today, and both
 * are always `not_recorded` in R7 (nothing populates them). This
 * component still renders two labeled rows (Purpose / Patient concern)
 * per FR-VCC-2's own AC, both driven from that one governed field —
 * not two independently-sourced facts, and not a frontend-invented
 * second field. If the backend ever splits this into two real fields,
 * this component's two rows would each bind to its own field; today
 * there is only one to bind both labels to.
 *
 * Distinguishes loading / error / `unavailable` / `not_recorded` /
 * `recorded` explicitly — `unavailable` is never rendered as
 * "Not recorded" (DP-15's no-absence-as-negative rule).
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicalWorkspaceQuery } from '../../data/repositories/clinicalWorkspace.repository.impl';
import { AppointmentPurposeFacts } from '../../data/models/clinicalWorkspace.dtos';

export interface WhyTodaySectionProps {
  tenantId: string;
  clientId: string;
  episodeId: string;
  appointmentId: string;
}

const resolvePurposeDisplayValue = (
  purpose: AppointmentPurposeFacts,
  t: (key: string) => string,
): string => {
  if (purpose.recording_state === 'recorded' && purpose.value) {
    return purpose.value;
  }
  if (purpose.recording_state === 'not_recorded') {
    return t('visitCommandCenter.whyToday.notRecorded');
  }
  // absent / not_applicable / unresolved / unavailable / recorded-with-no-value:
  // never presented as "Not recorded" — that is a distinct, stronger claim
  // ("nobody captured this") than "this fact is currently unavailable".
  return t('visitCommandCenter.whyToday.unavailable');
};

export const WhyTodaySection: React.FC<WhyTodaySectionProps> = ({
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
      <View style={cardStyle} testID="why-today-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.whyToday.title')}
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
      <View style={cardStyle} testID="why-today-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.whyToday.title')}
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

  const purposeValue = resolvePurposeDisplayValue(data.purpose, t);

  return (
    <View style={cardStyle} testID="why-today-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('visitCommandCenter.whyToday.title')}
      </Text>
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.text.secondary }]}>
          {t('visitCommandCenter.whyToday.purpose')}
        </Text>
        <Text style={[typography.body2, { color: colors.text.primary }]}>{purposeValue}</Text>
      </View>
      <View>
        <Text style={[typography.caption, { color: colors.text.secondary }]}>
          {t('visitCommandCenter.whyToday.patientConcern')}
        </Text>
        <Text style={[typography.body2, { color: colors.text.primary }]}>{purposeValue}</Text>
      </View>
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
