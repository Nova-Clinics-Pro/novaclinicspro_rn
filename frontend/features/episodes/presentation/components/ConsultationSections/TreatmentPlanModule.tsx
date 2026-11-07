/**
 * TreatmentPlanModule (T-FE-E.2 closure, T-BE-D.4a, FR-TP-1, FR-TR-1)
 *
 * NEW module -- replaces the honest "Treatment Plan is not yet available"
 * gap message T-FE-E.2's partial closure rendered while `TenantTreatmentPlan`
 * had zero public HTTP contract. `T-BE-D.4a` exposed create/get-by-id/
 * get-by-recommendation; this module composes it.
 *
 * Identity: the Recommendation IS the `TenantTreatmentSheet`/order row
 * (design.md §2.8) -- `treatmentSheetId` (already resolved by
 * `useEpisodeContext()`) is exactly the `originating_recommendation_id`
 * a Plan is created from/looked up by. No new identity concept.
 *
 * Eligibility: the backend is the sole authority (`get_eligible_
 * recommendation_source`, T-BE-D.3a) -- this module never re-derives
 * it. The one client-side hint it does show ("ineligible") comes from
 * the order's own already-fetched `state`/`is_order` fields (DRAFT =
 * not yet sent to scheduling, CANCELLED = withdrawn) purely to avoid
 * offering a create action guaranteed to fail; the actual creation
 * attempt's response remains the authoritative eligibility check (a
 * stale client-side guess never blocks or replaces it).
 *
 * Never reconstructs a Plan from Session/schedule rows (FR-TP-1 AC15) --
 * every field rendered comes directly from `TreatmentPlanResponse`.
 * No amendment/version controls -- Plan versioning is T-BE-D.5's own
 * scope, not this task's.
 */
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { useAuth } from '../../../../auth/presentation/hooks/useAuth';
import { useEpisodeContext, usePatientContext } from '../../context/ClinicalWorkspaceContext';
import { useTreatmentOrderQuery } from '../../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import {
  useCreateTreatmentPlanMutation,
  useTreatmentPlanByRecommendationQuery,
} from '../../../../treatmentSheets/data/repositories/treatmentPlans.repository.impl';
import { toClinicalWorkspaceError } from '../../../application/clinicalWorkspaceError';

const PLAN_CREATE_PERMISSION = 'treatment_sheet.order';
const INELIGIBLE_ORDER_STATES = new Set(['DRAFT', 'CANCELLED']);

export const TreatmentPlanModule: React.FC = () => {
  const { colors, spacing, typography, radii, borderWidths, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const patient = usePatientContext();
  const { episodeId, treatmentSheetId, tenantId } = useEpisodeContext();

  const orderQuery = useTreatmentOrderQuery(treatmentSheetId ?? '', tenantId, {
    enabled: !!treatmentSheetId,
  });
  const planQuery = useTreatmentPlanByRecommendationQuery(treatmentSheetId ?? '', {
    enabled: !!treatmentSheetId,
  });
  const createMutation = useCreateTreatmentPlanMutation();

  const [sessionCountInput, setSessionCountInput] = useState('');

  const canCreate = (currentUser?.permissions ?? []).includes(PLAN_CREATE_PERMISSION);
  const isEligible = orderQuery.data?.is_order && !INELIGIBLE_ORDER_STATES.has(orderQuery.data?.state ?? '');

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

  const title = (
    <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
      {t('treatmentPlan.title')}
    </Text>
  );

  if (!treatmentSheetId) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('treatmentPlan.noRecommendationYet')}</Text>
      </View>
    );
  }

  if (orderQuery.isLoading || planQuery.isLoading) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary.default} />
          <Text style={[typography.body2, { color: colors.text.secondary, marginLeft: spacing.sm }]}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (orderQuery.isError || planQuery.isError) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <Text style={[typography.body2, { color: colors.feedback.error, marginBottom: spacing.sm }]}>
          {t('errors.generic.loadFailed')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            orderQuery.refetch();
            planQuery.refetch();
          }}
          accessibilityRole="button"
        >
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const plan = planQuery.data;

  if (plan) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <PlanField label={t('treatmentPlan.fields.therapies')} value={plan.therapies.join(', ') || '—'} />
        <PlanField
          label={t('treatmentPlan.fields.authorizedSessionCount')}
          value={plan.authorized_session_count != null ? String(plan.authorized_session_count) : '—'}
        />
        <PlanField label={t('treatmentPlan.fields.frequency')} value={plan.frequency ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.schedulingIntent')} value={plan.scheduling_intent ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.preferredInterval')} value={plan.preferred_interval ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.sequencingPattern')} value={plan.sequencing_pattern ?? '—'} />
        <PlanField
          label={t('treatmentPlan.fields.reviewMilestones')}
          value={plan.review_milestones.join(', ') || '—'}
        />
        <PlanField label={t('treatmentPlan.fields.completionCriteria')} value={plan.completion_criteria ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.coursePrecautions')} value={plan.course_precautions ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.therapistRequirements')} value={plan.therapist_requirements ?? '—'} />
        <PlanField label={t('treatmentPlan.fields.status')} value={t(`treatmentPlan.statusLabels.${plan.status}`, { defaultValue: plan.status })} />
      </View>
    );
  }

  // No Plan exists yet.
  if (!isEligible) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('treatmentPlan.recommendationIneligible')}</Text>
      </View>
    );
  }

  if (!canCreate) {
    return (
      <View style={cardStyle} testID="treatment-plan-section">
        {title}
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('treatmentPlan.waitingOnRole')}</Text>
      </View>
    );
  }

  const handleCreate = () => {
    if (!episodeId || !treatmentSheetId || !patient.clientId) return;
    const parsedCount = sessionCountInput.trim() ? Number(sessionCountInput.trim()) : null;
    createMutation.mutate({
      client_id: patient.clientId,
      episode_id: episodeId,
      originating_recommendation_id: treatmentSheetId,
      therapies: orderQuery.data?.recommended_therapy ? [orderQuery.data.recommended_therapy] : [],
      authorized_session_count: parsedCount != null && !Number.isNaN(parsedCount) ? parsedCount : orderQuery.data?.planned_sessions ?? null,
      frequency: orderQuery.data?.frequency ?? null,
    });
  };

  return (
    <View style={cardStyle} testID="treatment-plan-section">
      {title}
      <Text style={[typography.body2, { color: colors.text.secondary, marginBottom: spacing.sm }]}>
        {t('treatmentPlan.eligibleNoPlan')}
      </Text>
      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.xs }]}>
          {t('treatmentPlan.fields.authorizedSessionCount')}
        </Text>
        <TextInput
          value={sessionCountInput}
          onChangeText={setSessionCountInput}
          keyboardType="numeric"
          placeholder={orderQuery.data?.planned_sessions != null ? String(orderQuery.data.planned_sessions) : undefined}
          style={[
            {
              borderColor: colors.border.default,
              borderWidth: borderWidths.default,
              borderRadius: radii.small,
              padding: spacing.sm,
              color: colors.text.primary,
              backgroundColor: colors.surface.default,
            },
          ]}
        />
      </View>
      {createMutation.isError && (
        <Text style={[typography.body2, { color: colors.feedback.error, marginBottom: spacing.sm }]}>
          {toClinicalWorkspaceError(createMutation.error, t('treatmentPlan.createFailed')).code === 'NOT_FOUND'
            ? t('treatmentPlan.recommendationIneligible')
            : t('treatmentPlan.createFailed')}
        </Text>
      )}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={createMutation.isPending}
        accessibilityRole="button"
        style={[
          styles.createButton,
          { backgroundColor: colors.primary.default, borderRadius: spacing.sm, minHeight: sizes.touchTarget },
        ]}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color={colors.surface.default} />
        ) : (
          <Text style={[typography.button, { color: colors.surface.default }]}>{t('treatmentPlan.createAction')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const PlanField: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { colors, spacing, typography } = useClinicTheme();
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.text.secondary }]}>{label}</Text>
      <Text style={[typography.body2, { color: colors.text.primary }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  createButton: { alignItems: 'center', justifyContent: 'center' },
});
