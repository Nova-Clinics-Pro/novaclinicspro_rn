/**
 * WorkflowPills (T-FE-B.1, FR-MOB-2, FR-WFA-2)
 *
 * Renders the Visit Command Center's workflow-stage pill rail, sourced
 * ONLY from the governed Clinical Workflow contract
 * (`useClinicalWorkflowQuery`, T-BE-B.2a). Render-only: assembles no
 * stage list, computes no state, infers no next action, and duplicates
 * no backend resolver rule. Backend `stages[]` is rendered as-is, in the
 * order the backend returns it — this component never reorders,
 * filters (except the one documented `unresolved` exception below), or
 * derives stage applicability.
 *
 * State -> visual token mapping (design.md §3/§4a: "never colour-alone
 * (icon + text)", "no dot-only pills"). Verified against the backend's
 * actual `StageState` enum (app/domain/models/clinical_workflow.py),
 * which carries NINE values, not the six tasks.md's own AC shorthand
 * names (🟢completed 🟡current ⚪pending 🔵waiting-on-role 🔴blocked
 * ⚫n/a). The three unnamed values are handled per the backend's own
 * documented rules, not invented:
 *   - `read_only`, `historical_only` -> mapped to the same muted/neutral
 *     token family as `not_applicable` (closest existing visual family;
 *     a presentation choice, not a new clinical meaning).
 *   - `unresolved` -> the domain module's own docstring is explicit:
 *     "must never render as a patient-facing badge... treat as an error
 *     surface, not a status." This component honors that literally: a
 *     stage in this state is filtered out of the rendered rail, never
 *     invented as a 7th visual state.
 *
 * `waiting_permission` is a permission CODE (e.g. "treatment.schedule"),
 * never a role name (FR-WFA-2 AC2) — design.md/tasks.md are explicit
 * that `episodeWorkspaceConfigByRole` is never the actionability
 * authority. No frontend permission-code -> role-name mapping exists
 * anywhere in this codebase (verified), and inventing one here would be
 * exactly the kind of clinical-meaning derivation FR-COS-2 forbids. This
 * component instead renders the raw permission code the backend sent,
 * through a template string — showing WHO is waited on using the
 * backend's own identifier, never a guessed role label.
 *
 * T-FE-D.1 (FR-WFA-1/2, W18): a blocked stage now also surfaces its own
 * blocking_reason_code/detail_reason_code (localized, reusing the exact
 * same reason vocabulary NextActionBar already translates -- these are
 * the same backend-owned codes, not a parallel dictionary) plus, where
 * the backend's own _STAGE_ACTION map (mirrored codes-only as
 * STAGE_TO_ACTION in nextActionRegistry.ts) names a fixing action, a
 * "fix this" affordance reusing NEXT_ACTION_REGISTRY's EXISTING route
 * builder -- never a new route, per W18's own "never a dead end"
 * requirement. "stages come only from the backend" and "GP shows no
 * therapy stages because the capability is absent, not clinic name"
 * (both frozen AC) require no new code here: this component has never
 * read a clinic-type/specialty field (verified -- WorkflowPillsProps
 * carries only tenant/client/episode/appointment identity), so absence
 * is already, structurally, backend-driven.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicalWorkflowQuery } from '../../data/repositories/clinicalWorkflow.repository.impl';
import { WorkflowStage } from '../../data/models/clinicalWorkflow.dtos';
import { NEXT_ACTION_REGISTRY, NextActionContext, STAGE_TO_ACTION } from '../config/nextActionRegistry';

export interface WorkflowPillsProps {
  tenantId: string;
  clientId: string;
  episodeId: string;
  appointmentId: string;
}

type PillTone = 'success' | 'current' | 'neutral' | 'waiting' | 'blocked' | 'muted';

const STATE_TONE: Record<string, PillTone> = {
  completed: 'success',
  current: 'current',
  pending: 'neutral',
  waiting: 'waiting',
  blocked: 'blocked',
  read_only: 'muted',
  historical_only: 'muted',
  not_applicable: 'muted',
  // 'unresolved' intentionally absent: filtered before rendering (see
  // this file's own header docstring).
};

const STATE_ICON: Record<PillTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  current: 'ellipse',
  neutral: 'ellipse-outline',
  waiting: 'time-outline',
  blocked: 'alert-circle',
  muted: 'remove-circle-outline',
};

/**
 * Imperatively reveal a measured current pill once. Kept as a small
 * production helper so the same guard is used by both the data-resolution
 * effect and the layout callback.
 */
export const scrollToCurrentWorkflowPill = (
  scrollView: Pick<ScrollView, 'scrollTo'> | null,
  pillOffsets: Record<string, number>,
  lastScrolledCurrentCode: { current: string | null },
  currentStageCode: string | undefined,
  horizontalPadding: number,
) => {
  if (!currentStageCode || lastScrolledCurrentCode.current === currentStageCode) return;
  const offset = pillOffsets[currentStageCode];
  if (offset === undefined) return;
  scrollView?.scrollTo({ x: Math.max(0, offset - horizontalPadding), animated: true });
  lastScrolledCurrentCode.current = currentStageCode;
};

export const WorkflowPills: React.FC<WorkflowPillsProps> = ({
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
  // Hooks must remain unconditional across the query's initial loading
  // render and its resolved-data render. The actual offset is still only
  // used once a current stage has been rendered and measured below.
  const scrollRef = useRef<ScrollView>(null);
  const pillOffsets = useRef<Record<string, number>>({});
  const lastScrolledCurrentCode = useRef<string | null>(null);
  const currentStageCode = data?.stages.find((stage) => stage.state === 'current')?.code;

  useEffect(() => {
    scrollToCurrentWorkflowPill(
      scrollRef.current,
      pillOffsets.current,
      lastScrolledCurrentCode,
      currentStageCode,
      spacing.md,
    );
  }, [currentStageCode, spacing.md]);

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
      <View style={cardStyle} testID="workflow-pills-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.workflowPills.title')}
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
      <View style={cardStyle} testID="workflow-pills-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('visitCommandCenter.workflowPills.title')}
        </Text>
        <Text
          accessibilityRole="text"
          style={[typography.body2, { color: colors.feedback.error }]}
        >
          {t('visitCommandCenter.workflowPills.unavailable')}
        </Text>
        <Text
          accessibilityRole="button"
          onPress={() => refetch()}
          style={[typography.button, { color: colors.primary.default, marginTop: spacing.sm }]}
        >
          {t('common.retry')}
        </Text>
      </View>
    );
  }

  // Backend's own documented rule: `unresolved` is an error surface, not
  // a status — never rendered as a patient-facing badge. See header
  // docstring. Every other stage renders exactly as returned, same order.
  const renderableStages = data.stages.filter((stage) => stage.state !== 'unresolved');
  // T-FE-D.1 (W18): blocked stages get their own reason + fix-affordance
  // line below the pill rail, in the same order the backend returned
  // them — never reordered, never limited to only the top recommendation.
  const blockedStages = renderableStages.filter((stage) => stage.state === 'blocked');
  const context: NextActionContext = { episodeId, appointmentId, clientId };
  const currentStage = renderableStages.find((stage) => stage.state === 'current');
  const registerPillLayout = (code: string) => (event: LayoutChangeEvent) => {
    const offset = event.nativeEvent.layout.x;
    pillOffsets.current[code] = offset;
    scrollToCurrentWorkflowPill(
      scrollRef.current,
      pillOffsets.current,
      lastScrolledCurrentCode,
      currentStage?.code === code ? code : undefined,
      spacing.md,
    );
  };

  return (
    <View style={cardStyle} testID="workflow-pills-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('visitCommandCenter.workflowPills.title')}
      </Text>
      {renderableStages.length === 0 ? (
        <Text style={[typography.body2, { color: colors.text.secondary }]}>
          {t('visitCommandCenter.workflowPills.empty')}
        </Text>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            testID="workflow-pill-rail"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
            accessibilityRole="tablist"
          >
            {renderableStages.map((stage) => (
              <WorkflowPill key={stage.code} stage={stage} onLayout={registerPillLayout(stage.code)} />
            ))}
          </ScrollView>
          {blockedStages.length > 0 && (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              {blockedStages.map((stage) => (
                <BlockedStageDetail key={stage.code} stage={stage} context={context} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

/**
 * T-FE-D.1 (W18): "▨ Treatment recommendation — blocked / 'reason' [Go to
 * case sheet] (never a dead end)". Reuses the exact same reason
 * vocabulary NextActionBar already translates for blocking_factors — the
 * codes are the same backend-owned vocabulary, not a parallel one.
 */
const BlockedStageDetail: React.FC<{ stage: WorkflowStage; context: NextActionContext }> = ({
  stage,
  context,
}) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const reasonCode = stage.blocking_reason_code || stage.detail_reason_code;
  const reasonKey = reasonCode
    ? `visitCommandCenter.nextActionBar.reason.${reasonCode.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())}`
    : null;
  const reasonLabel = reasonKey
    ? (() => {
        const translated = t(reasonKey);
        return translated === reasonKey ? t('visitCommandCenter.nextActionBar.reason.unknown') : translated;
      })()
    : null;

  const actionCode = STAGE_TO_ACTION[stage.code];
  const entry = actionCode ? NEXT_ACTION_REGISTRY[actionCode] : undefined;
  const fixLabel = entry ? t(`visitCommandCenter.nextActionBar.action.${entry.translationKey}`) : null;

  return (
    <View
      testID={`blocked-stage-detail-${stage.code}`}
      style={[
        styles.blockedDetail,
        {
          borderColor: colors.feedback.error,
          borderWidth: borderWidths.hairline,
          borderRadius: radii.small,
          padding: spacing.sm,
          backgroundColor: colors.feedback.errorLight,
        },
      ]}
    >
      <Text style={[typography.caption, { color: colors.feedback.error, flexShrink: 1 }]}>
        {t(`visitCommandCenter.workflowPills.stage.${stage.code}`)} — {t('visitCommandCenter.workflowPills.state.blocked')}
        {reasonLabel ? `: ${reasonLabel}` : ''}
      </Text>
      {entry?.buildRoute && (
        <TouchableOpacity
          testID={`blocked-stage-fix-${stage.code}`}
          accessibilityRole="button"
          accessibilityLabel={`${t('visitCommandCenter.workflowPills.fixAffordance')}: ${fixLabel}`}
          onPress={() => router.push(entry.buildRoute!(context) as never)}
          style={{ marginTop: spacing.xs }}
        >
          <Text style={[typography.button, { color: colors.primary.default }]}>
            {t('visitCommandCenter.workflowPills.fixAffordance')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const WorkflowPill: React.FC<{ stage: WorkflowStage; onLayout: (event: LayoutChangeEvent) => void }> = ({ stage, onLayout }) => {
  const { colors, spacing, typography, radii, borderWidths, sizes } = useClinicTheme();
  const { t } = useTranslation();

  const tone: PillTone = STATE_TONE[stage.state] ?? 'neutral';
  const isCurrent = stage.state === 'current';

  const toneColor: Record<PillTone, string> = {
    success: colors.feedback.success,
    current: colors.primary.default,
    neutral: colors.text.secondary,
    waiting: colors.feedback.info,
    blocked: colors.feedback.error,
    muted: colors.text.disabled,
  };

  const toneBackground: Record<PillTone, string> = {
    success: colors.feedback.successLight,
    current: colors.primary.soft,
    neutral: colors.background.muted,
    waiting: colors.feedback.infoLight,
    blocked: colors.feedback.errorLight,
    muted: colors.background.muted,
  };

  const stageLabel = t(`visitCommandCenter.workflowPills.stage.${stage.code}`);
  const stateLabelKey =
    stage.state === 'read_only'
      ? 'readOnly'
      : stage.state === 'historical_only'
      ? 'historicalOnly'
      : stage.state === 'not_applicable'
      ? 'notApplicable'
      : stage.state;
  const stateLabel = t(`visitCommandCenter.workflowPills.state.${stateLabelKey}`);

  const a11yLabel = stage.waiting_permission
    ? `${stageLabel}, ${stateLabel}, ${t('visitCommandCenter.workflowPills.waitingOn', {
        permission: stage.waiting_permission,
      })}`
    : `${stageLabel}, ${stateLabel}`;

  return (
    <View
      testID={`workflow-pill-${stage.code}`}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isCurrent }}
      onLayout={onLayout}
      style={[
        styles.pill,
        {
          minHeight: sizes.touchTarget,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.pill,
          backgroundColor: toneBackground[tone],
          borderWidth: isCurrent ? borderWidths.default : borderWidths.hairline,
          borderColor: isCurrent ? colors.primary.default : colors.border.subtle,
        },
      ]}
    >
      <Ionicons name={STATE_ICON[tone]} size={sizes.iconSmall} color={toneColor[tone]} />
      <Text style={[typography.caption, { color: toneColor[tone], marginLeft: spacing.xs }]} numberOfLines={1}>
        {stageLabel}
      </Text>
      {stage.mandatory === false && (
        <Text style={[typography.caption, { color: colors.text.tertiary, marginLeft: spacing.xs }]}>
          {t('visitCommandCenter.workflowPills.optional')}
        </Text>
      )}
      {stage.state === 'waiting' && stage.waiting_permission && (
        <Text
          style={[typography.caption, { color: colors.text.tertiary, marginLeft: spacing.xs }]}
          numberOfLines={1}
        >
          {t('visitCommandCenter.workflowPills.waitingOn', { permission: stage.waiting_permission })}
        </Text>
      )}
    </View>
  );
};

// Component-local structural layout only (flex/flexDirection/alignItems/
// justifyContent) — no reusable visual value (colour, spacing, radius,
// border width, icon size, touch target) belongs here; those come from
// `useClinicTheme()` and are applied via the inline style arrays above.
const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedDetail: {
    width: '100%',
  },
});
