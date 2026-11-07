/**
 * SchedulingModule (T-FE-E.2, FR-SCH-1, FR-SCH-2)
 *
 * Shows current scheduled/unscheduled Session state (via the same
 * `useTreatmentOrderQuery` fetch `SessionInstructionsModule` already
 * uses -- react-query dedupes the two calls on their shared query key,
 * so this is not a second network request) and lets a permitted user
 * schedule a row via the existing `ScheduleRowModal` (already used by
 * the admin scheduling surfaces, `treatment_order.schedule`-gated
 * backend-side).
 *
 * [Closure, T-BE-D.4a] The scheduling-proposal read
 * (`GET /treatment-sheets/plans/{plan_id}/scheduling-proposal`,
 * T-BE-E.2a) was previously blocked because nothing exposed a
 * `plan_id`. `T-BE-D.4a` exposed `GET /treatment-plans/by-recommendation/
 * {recommendation_id}` -- the Recommendation IS the treatment order/sheet
 * (design.md §2.8), so `treatmentSheetId` is exactly the
 * `originating_recommendation_id` a Plan is looked up by (same identity
 * `TreatmentPlanModule` uses, same query key -- react-query dedupes this
 * module's own lookup with that module's). The proposal query stays
 * disabled until a Plan exists; when one doesn't, the section says so
 * honestly rather than fabricating a proposal. No date computation or
 * sorting happens here -- `useSchedulingProposalQuery`'s response is
 * rendered exactly as the backend returns it (`intent`/`dates`/
 * `reason_code`/`bounded_by_milestone`).
 *
 * Current scheduled/unscheduled state and the write action operate on
 * the already-public Row/Order contract and need no `plan_id` -- both
 * predate this closure and are unchanged.
 */
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { useAuth } from '../../../../auth/presentation/hooks/useAuth';
import { useEpisodeContext } from '../../context/ClinicalWorkspaceContext';
import {
  useTreatmentOrderQuery,
  useSchedulingProposalQuery,
} from '../../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import { useTreatmentPlanByRecommendationQuery } from '../../../../treatmentSheets/data/repositories/treatmentPlans.repository.impl';
import { ScheduleRowModal } from '../../../../treatmentSheets/presentation/components/ScheduleRowModal';
import { TreatmentRowOrderResponse } from '../../../../treatmentSheets/data/models/treatmentOrders.dtos';

const SCHEDULE_PERMISSION = 'treatment_order.schedule';
const NO_PREGENERATED_DATE_INTENTS = new Set(['PRN']);
const REVIEW_BOUNDED_INTENTS = new Set(['REVIEW_DEPENDENT', 'REVIEW_AFTER_MILESTONE']);

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const SchedulingModule: React.FC = () => {
  const { colors, spacing, typography, radii, borderWidths, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { tenantId, treatmentSheetId } = useEpisodeContext();

  const orderQuery = useTreatmentOrderQuery(treatmentSheetId ?? '', tenantId, { enabled: !!tenantId && !!treatmentSheetId });
  const planQuery = useTreatmentPlanByRecommendationQuery(treatmentSheetId ?? '', { enabled: !!treatmentSheetId });
  const [schedulingRow, setSchedulingRow] = useState<TreatmentRowOrderResponse | null>(null);
  const [startDate, setStartDate] = useState(todayIso());
  const [proposalRequested, setProposalRequested] = useState(false);

  const planId = planQuery.data?.id ?? '';
  const proposalQuery = useSchedulingProposalQuery(
    planId,
    { startDate },
    { enabled: proposalRequested && !!planId },
  );

  const rows: TreatmentRowOrderResponse[] = orderQuery.data?.rows ?? [];
  const canSchedule = (currentUser?.permissions ?? []).includes(SCHEDULE_PERMISSION);

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

  if (!treatmentSheetId) {
    return (
      <View style={cardStyle} testID="scheduling-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('scheduling.title')}</Text>
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('scheduling.noOrderYet')}</Text>
      </View>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <View style={cardStyle} testID="scheduling-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('scheduling.title')}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary.default} />
          <Text style={[typography.body2, { color: colors.text.secondary, marginLeft: spacing.sm }]}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (orderQuery.isError) {
    return (
      <View style={cardStyle} testID="scheduling-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('scheduling.title')}</Text>
        <Text style={[typography.body2, { color: colors.feedback.error, marginBottom: spacing.sm }]}>{t('errors.generic.loadFailed')}</Text>
        <TouchableOpacity onPress={() => orderQuery.refetch()} accessibilityRole="button">
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const proposal = proposalQuery.data;

  return (
    <View style={cardStyle} testID="scheduling-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>{t('scheduling.title')}</Text>

      {/* Scheduling proposal (FR-SCH-1) -- disabled until a Treatment Plan exists */}
      {!planId ? (
        <Text style={[typography.caption, { color: colors.text.tertiary, marginBottom: spacing.sm }]}>
          {t('scheduling.proposalUnavailable')}
        </Text>
      ) : (
        <View style={{ marginBottom: spacing.md, gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>{t('scheduling.startDateLabel')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              style={{
                flex: 1,
                borderColor: colors.border.default,
                borderWidth: borderWidths.default,
                borderRadius: radii.small,
                padding: spacing.sm,
                color: colors.text.primary,
              }}
            />
            <TouchableOpacity
              onPress={() => setProposalRequested(true)}
              accessibilityRole="button"
              style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}
            >
              <Text style={[typography.button, { color: colors.primary.default }]}>{t('scheduling.loadProposal')}</Text>
            </TouchableOpacity>
          </View>

          {proposalQuery.isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary.default} />
              <Text style={[typography.body2, { color: colors.text.secondary, marginLeft: spacing.sm }]}>{t('common.loading')}</Text>
            </View>
          )}

          {proposalQuery.isError && (
            <Text style={[typography.body2, { color: colors.feedback.error }]}>{t('errors.generic.loadFailed')}</Text>
          )}

          {proposal && (
            <View>
              {proposal.intent && NO_PREGENERATED_DATE_INTENTS.has(proposal.intent) && (
                <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('scheduling.prnLabel')}</Text>
              )}
              {proposal.intent && REVIEW_BOUNDED_INTENTS.has(proposal.intent) && proposal.bounded_by_milestone && (
                <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('scheduling.reviewDependentLabel')}</Text>
              )}
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.xs }]}>
                {t('scheduling.proposedDates')}
              </Text>
              {proposal.dates.length === 0 ? (
                <Text style={[typography.body2, { color: colors.text.secondary }]}>
                  {t(`scheduling.reasonCodes.${proposal.reason_code}`, { defaultValue: proposal.reason_code })}
                </Text>
              ) : (
                proposal.dates.map((d) => (
                  <Text key={d} style={[typography.body2, { color: colors.text.primary }]}>{d}</Text>
                ))
              )}
            </View>
          )}
        </View>
      )}

      {!canSchedule && (
        <View
          style={[
            styles.waitingBanner,
            { backgroundColor: colors.surface.muted, borderColor: colors.border.subtle, borderRadius: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm },
          ]}
        >
          <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('scheduling.waitingOnRole')}</Text>
        </View>
      )}

      {rows.length === 0 ? (
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('scheduling.unscheduled')}</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {rows.map((row) => {
            const isScheduled = !!row.scheduled_date;
            return (
              <View
                key={row.id}
                style={[
                  styles.rowItem,
                  { borderColor: colors.border.subtle, borderRadius: spacing.sm, padding: spacing.sm, minHeight: sizes.touchTarget },
                ]}
              >
                <Ionicons
                  name={isScheduled ? 'calendar' : 'calendar-outline'}
                  size={18}
                  color={isScheduled ? colors.feedback.success : colors.text.secondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={[typography.body2, { color: colors.text.primary }]}>
                    {t('sessionInstructions.dayLabel', { day: row.day_number })}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.secondary }]}>
                    {isScheduled
                      ? `${row.scheduled_date}${row.scheduled_time ? ' · ' + row.scheduled_time : ''}`
                      : t('scheduling.unassigned')}
                  </Text>
                </View>
                {canSchedule && row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && (
                  <TouchableOpacity
                    onPress={() => setSchedulingRow(row)}
                    accessibilityRole="button"
                    style={{ minHeight: sizes.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.sm }}
                  >
                    <Text style={[typography.button, { color: colors.primary.default }]}>
                      {isScheduled ? t('scheduling.rescheduleActionLabel') : t('scheduling.scheduleActionLabel')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {schedulingRow && orderQuery.data && (
        <ScheduleRowModal
          visible={!!schedulingRow}
          tenantId={tenantId}
          sheetId={treatmentSheetId}
          row={schedulingRow}
          orderVersion={orderQuery.data.version}
          onClose={() => setSchedulingRow(null)}
          onScheduled={() => {
            setSchedulingRow(null);
            orderQuery.refetch();
          }}
          onVersionConflict={() => {
            setSchedulingRow(null);
            orderQuery.refetch();
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  waitingBanner: {},
  rowItem: { flexDirection: 'row', alignItems: 'center' },
});
