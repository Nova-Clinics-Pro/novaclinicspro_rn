/**
 * NextActionBar (T-FE-B.2, FR-REC-2, FR-COS-2, Decision 7)
 *
 * Renders the backend-recommended next action, sourced ONLY from the
 * SAME `useClinicalWorkflowQuery` result `WorkflowPills` already
 * consumes (no second query, no second cache key, no second datasource
 * call — reuses the identical hook signature).
 *
 * Render-only: computes no recommendation, infers no actionability from
 * job title, duplicates no backend rule. `recommended_action` present
 * means the backend considers it the current best-supported action;
 * `waiting_role` present (with `recommended_action` null, verified by
 * reading `_recommend()` directly -- these two are mutually exclusive by
 * construction) means the backend is explicitly waiting on another role,
 * never rendered as an enabled CTA.
 *
 * Decision 7 (RATIFIED): "[Do this]" + "[Something else v]" ALWAYS
 * present -- deviation must be immediate (<=1 tap) and unpunished. This
 * is not optional polish; it is the ratified core interaction model.
 * Alternatives are rendered exactly as the backend returns them, never
 * reordered by an invented priority, and never silently promoted to the
 * primary CTA.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicalWorkflowQuery } from '../../data/repositories/clinicalWorkflow.repository.impl';
import { AlternativeAction, ClinicalWorkflowResolutionResponse } from '../../data/models/clinicalWorkflow.dtos';
import { NEXT_ACTION_REGISTRY, NextActionContext } from '../config/nextActionRegistry';

export interface NextActionBarProps {
  tenantId: string;
  clientId: string;
  episodeId: string;
  appointmentId: string;
}

const toCamel = (snake: string): string =>
  snake.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

export const NextActionBar: React.FC<NextActionBarProps> = ({
  tenantId,
  clientId,
  episodeId,
  appointmentId,
}) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useClinicalWorkflowQuery(
    tenantId,
    clientId,
    episodeId,
    appointmentId,
  );

  const context: NextActionContext = { episodeId, appointmentId, clientId };

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
      <View style={cardStyle} testID="next-action-bar">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.nextActionBar.title')}
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
      <View style={cardStyle} testID="next-action-bar">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.nextActionBar.title')}
        </Text>
        <Text accessibilityRole="text" style={[typography.body2, { color: colors.feedback.error }]}>
          {t('visitCommandCenter.nextActionBar.unavailable')}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          accessibilityRole="button"
          style={{ marginTop: spacing.sm }}
        >
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={cardStyle} testID="next-action-bar">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('visitCommandCenter.nextActionBar.title')}
      </Text>
      <RecommendationBody data={data} context={context} />
    </View>
  );
};

const RecommendationBody: React.FC<{
  data: ClinicalWorkflowResolutionResponse;
  context: NextActionContext;
}> = ({ data, context }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const reasonLabel = (reasonCode: string | null): string => {
    if (!reasonCode) return '';
    const key = `visitCommandCenter.nextActionBar.reason.${toCamel(reasonCode)}`;
    const translated = t(key);
    // useTranslation falls back to en-US per the existing localization
    // policy; if the code is genuinely unrecognised even there, i18next
    // returns the key itself -- detect that and use the safe generic
    // fallback rather than ever showing a raw snake_case backend code.
    return translated === key ? t('visitCommandCenter.nextActionBar.reason.unknown') : translated;
  };

  // "waiting" state: recommended_action is null, waiting_role is set —
  // verified mutually exclusive by construction in _recommend(). Never
  // an enabled CTA.
  if (!data.recommended_action && data.waiting_role) {
    return (
      <View testID="next-action-waiting">
        <Text
          accessibilityRole="text"
          style={[typography.body2, { color: colors.text.primary, marginBottom: spacing.xs }]}
        >
          {t('visitCommandCenter.nextActionBar.waitingOn', { permission: data.waiting_role })}
        </Text>
        {!!data.recommendation_reason && (
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            {reasonLabel(data.recommendation_reason)}
          </Text>
        )}
        <UnavailableDoThisButton />
        <DeviationMenu data={data} context={context} />
      </View>
    );
  }

  // Blocked / unresolved: no recommendation is actionable; render the
  // reason and any blocking factors, never a fabricated resolution.
  if (data.recommendation_reason === 'unresolved_facts' || data.unresolved_facts.length > 0) {
    return (
      <View testID="next-action-unresolved">
        <Text
          accessibilityRole="text"
          style={[typography.body2, { color: colors.feedback.warning }]}
        >
          {t('visitCommandCenter.nextActionBar.unresolvedTitle')}
        </Text>
        <UnavailableDoThisButton />
        <DeviationMenu data={data} context={context} />
      </View>
    );
  }

  if (data.blocking_factors.length > 0 && !data.recommended_action) {
    return (
      <View testID="next-action-blocked">
        <Text accessibilityRole="text" style={[typography.body2, { color: colors.feedback.error }]}>
          {t('visitCommandCenter.nextActionBar.blockedTitle')}
        </Text>
        {data.blocking_factors.map((code) => (
          <Text key={code} style={[typography.caption, { color: colors.text.secondary }]}>
            {reasonLabel(code)}
          </Text>
        ))}
        <UnavailableDoThisButton />
        <DeviationMenu data={data} context={context} />
      </View>
    );
  }

  // No recommended_action and no waiting/blocked/unresolved signal —
  // distinct "no recommendation right now" state (e.g. episode_closed).
  if (!data.recommended_action) {
    return (
      <View testID="next-action-none">
        <Text style={[typography.body2, { color: colors.text.secondary }]}>
          {t('visitCommandCenter.nextActionBar.noRecommendation')}
        </Text>
        {!!data.recommendation_reason && (
          <Text style={[typography.caption, { color: colors.text.tertiary }]}>
            {reasonLabel(data.recommendation_reason)}
          </Text>
        )}
        <UnavailableDoThisButton />
        <DeviationMenu data={data} context={context} />
      </View>
    );
  }

  // Actionable recommendation.
  const entry = NEXT_ACTION_REGISTRY[data.recommended_action];
  const actionLabel = entry
    ? t(`visitCommandCenter.nextActionBar.action.${entry.translationKey}`)
    : data.recommended_action;
  const hasRoute = !!entry?.buildRoute;

  const handleDoThis = () => {
    if (entry?.buildRoute) {
      const route = entry.buildRoute(context);
      router.push(route as never);
    }
  };

  return (
    <View testID="next-action-recommendation">
      <Text
        accessibilityRole="text"
        style={[typography.body1, { color: colors.text.primary, marginBottom: spacing.xs }]}
      >
        {actionLabel}
      </Text>
      {!!data.recommendation_reason && (
        <Text style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.sm }]}>
          {reasonLabel(data.recommendation_reason)}
        </Text>
      )}
      {hasRoute ? (
        <DoThisButton label={actionLabel} onPress={handleDoThis} />
      ) : (
        <>
          <Text
            accessibilityRole="text"
            style={[typography.caption, { color: colors.text.tertiary, marginBottom: spacing.sm }]}
          >
            {t('visitCommandCenter.nextActionBar.noRouteYet')}
          </Text>
          <UnavailableDoThisButton />
        </>
      )}
      <DeviationMenu data={data} context={context} />
    </View>
  );
};

const DoThisButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const { colors, spacing, typography, radii, sizes } = useClinicTheme();
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('visitCommandCenter.nextActionBar.doThis')}: ${label}`}
      style={[
        styles.doThisButton,
        {
          minHeight: sizes.touchTarget,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.medium,
          backgroundColor: colors.primary.default,
        },
      ]}
    >
      <Text style={[typography.button, { color: colors.primary.onPrimary }]} numberOfLines={2}>
        {t('visitCommandCenter.nextActionBar.doThis')}
      </Text>
    </TouchableOpacity>
  );
};

const UnavailableDoThisButton: React.FC = () => {
  const { colors, spacing, typography, radii, sizes } = useClinicTheme();
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      disabled
      testID="next-action-do-this-unavailable"
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={t('visitCommandCenter.nextActionBar.doThis')}
      style={[
        styles.doThisButton,
        {
          minHeight: sizes.touchTarget,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.medium,
          backgroundColor: colors.background.muted,
          marginTop: spacing.sm,
        },
      ]}
    >
      <Text style={[typography.button, { color: colors.text.disabled }]} numberOfLines={2}>
        {t('visitCommandCenter.nextActionBar.doThis')}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Decision 7's mandatory "[Something else v]" — ALWAYS rendered,
 * regardless of the primary recommendation's state, so deviation never
 * costs more than one tap. Alternatives are rendered exactly as the
 * backend returns them (order preserved, no local re-prioritisation, no
 * silent promotion to primary).
 */
const DeviationMenu: React.FC<{
  data: ClinicalWorkflowResolutionResponse;
  context: NextActionContext;
}> = ({ data, context }) => {
  const [open, setOpen] = React.useState(false);
  const { colors, spacing, typography, radii, borderWidths, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={{ marginTop: spacing.sm }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t('visitCommandCenter.nextActionBar.somethingElse')}
        style={[styles.somethingElseButton, { minHeight: sizes.touchTarget }]}
      >
        <Text style={[typography.button, { color: colors.primary.default }]}>
          {t('visitCommandCenter.nextActionBar.somethingElse')} {open ? '▲' : '▾'}
        </Text>
      </TouchableOpacity>
      {open && (
        <View
          testID="deviation-menu"
          style={[
            styles.deviationList,
            {
              borderColor: colors.border.subtle,
              borderWidth: borderWidths.hairline,
              borderRadius: radii.medium,
              marginTop: spacing.xs,
              padding: spacing.sm,
              backgroundColor: colors.background.muted,
            },
          ]}
        >
          {data.alternatives.length === 0 ? (
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>
              {t('visitCommandCenter.nextActionBar.notApplicable')}
            </Text>
          ) : (
            <>
              <Text
                style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.xs }]}
              >
                {t('visitCommandCenter.nextActionBar.alternativesTitle')}
              </Text>
              {data.alternatives.map((alt: AlternativeAction, idx: number) => {
                const entry = NEXT_ACTION_REGISTRY[alt.action];
                const label = entry
                  ? t(`visitCommandCenter.nextActionBar.action.${entry.translationKey}`)
                  : alt.action;
                const hasRoute = !!entry?.buildRoute;
                return (
                  <TouchableOpacity
                    key={`${alt.action}-${alt.stage}-${idx}`}
                    testID={`alternative-${alt.action}`}
                    disabled={!hasRoute}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => {
                      if (entry?.buildRoute) {
                        router.push(entry.buildRoute(context) as never);
                      }
                    }}
                    style={{ paddingVertical: spacing.xs, minHeight: sizes.touchTarget, justifyContent: 'center' }}
                  >
                    <Text
                      style={[
                        typography.body2,
                        { color: hasRoute ? colors.primary.default : colors.text.disabled },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      )}
    </View>
  );
};

// Component-local structural layout only (flex/flexDirection/alignItems/
// justifyContent/textAlign) — no reusable visual value belongs here;
// those come from `useClinicTheme()` and are applied via inline styles.
const styles = StyleSheet.create({
  card: { width: '100%' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  doThisButton: { alignItems: 'center', justifyContent: 'center' },
  somethingElseButton: { alignItems: 'flex-start', justifyContent: 'center' },
  deviationList: { width: '100%' },
});
