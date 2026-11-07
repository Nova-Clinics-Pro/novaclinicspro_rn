/**
 * ClinicalTimeline (R3B · T-C.2, ADR-R3B-02, ADR-R3B-07, Timeline Adapter Rule §7)
 *
 * Render-only: consumes `useClinicalTimelineData()`'s (T-C.1) already-
 * normalized output and renders chronological ordering + per-item
 * navigation. Performs NO aggregation, NO query merging, and NO
 * normalization of its own — that logic lives exclusively in the adapter
 * (Timeline Adapter Rule). Holds no clinical-artifact state (CO-4) — its
 * only local state, if any, would be presentation-only (e.g. expand/
 * collapse), never artifact content.
 *
 * Read-only in every sense (CO-3, CO-6, N-7): this file calls zero create/
 * update/save APIs of any kind, including no Visit Note API — it only reads
 * the adapter's output and calls `router.push()`. Every item navigates to
 * its own canonical detail/reference route (FR-C2) — this component never
 * renders an editable field.
 *
 * Mounted as a sibling of `ConsultationWorkspaceScreen` (the "ModuleHost" of
 * design.md's own target-architecture diagram) inside `ClinicalWorkspace`,
 * active only when `isClinicalSpineV1Enabled` is ON (ClinicalWorkspace.tsx).
 * Also composed inside `VisitCommandCenter` (T-FE-C.4, FR-VCC-1) — same
 * public API (no props; episode scope comes entirely from
 * `useEpisodeContext()`), so both hosts work unmodified.
 *
 * T-FE-C.4: virtualized via `FlatList` (was a plain `ScrollView` + `.map()`)
 * and given a bounded `maxHeight` so it is always its own independently-
 * scrollable region -- required both to satisfy the "virtualized" AC and to
 * make embedding safe inside `VisitCommandCenter`'s single outer
 * `ScrollView` (an unbounded-height `FlatList` nested in a ScrollView of the
 * same orientation is a known RN anti-pattern). The legacy `flex: 1` host in
 * `ClinicalWorkspace.tsx` is unaffected -- `maxHeight` only caps growth, it
 * doesn't fight a smaller flex-constrained parent.
 *
 * T-FE-C.5 (T-BE-A.3/A.3a): the adapter's item shape changed (backend
 * `encounter_type` taxonomy replaces the old 5 UI-artifact types), so this
 * file's icon lookup and press handling were updated minimally: (1)
 * `ITEM_ICON` now keys on the 4 backend encounter types plus a generic
 * fallback for an unrecognized future value; (2) an item with no `route`
 * (Treatment Plan/Treatment Review -- no existing detail screen for either
 * yet) renders non-interactive rather than calling `router.push(undefined)`.
 * No other rendering behavior changed -- `formatDate(item.date)` already
 * handled a null date gracefully before this task. A one-state
 * error/retry surface was added (`isError`/`refetch`, now exposed by the
 * adapter) since the single Clinical History query can itself fail --
 * unlike the pre-T-FE-C.5 assembly, there are no "remaining" queries to
 * fall back to.
 *
 * T-FE-C.6 (FR-HIST-1): `treatment_plan` rows are now individually
 * collapsible -- local UI state only (a `Set` of expanded item ids), per
 * this file's own pre-existing docstring anticipation above ("its only
 * local state, if any, would be presentation-only, e.g. expand/collapse").
 * Expanding a Plan row reveals its `sessionCounts` breakdown (icon+text
 * per count, never colour-alone) -- the only Plan-level detail the
 * backend contract actually carries. Engineering Truth (this task's own
 * pre-implementation report): `HistoryItemResponse` has no `sessions[]`
 * array and no Plan `status` field (design.md's own `history_items[]`
 * description names both; neither exists on the live contract) -- so
 * expanding a Plan can only ever reveal the real aggregate counts, never
 * fabricated per-session rows or a fabricated status label. AC(4)'s
 * "completed/stopped/superseded Plans remain visible and distinct" is
 * satisfied on its literal "remain visible" clause only (every Plan the
 * backend returns is rendered, never locally filtered by any status
 * heuristic -- proven by test); visual differentiation BY status is a
 * discovered, reported gap requiring a backend field, not fabricated
 * here. `legacy_treatment_sessions` rows get an explicit
 * "Plan association unavailable" subtitle (AC-6) -- literal text, not an
 * inferred one, since that is exactly what this encounter type means.
 *
 * T-FE-C.7 (FR-MOB-1, FR-HIST-1 AC17): mobile hierarchy behaviour.
 * Engineering Truth found only one genuine gap among the 3 frozen AC
 * items -- the collapse/expand touch target (the Plan row's own
 * `TouchableOpacity`) had no explicit minimum size, sized only by
 * content. Now given `minHeight: sizes.touchTarget` (the same governed
 * 44pt token used throughout this codebase). The other two AC items were
 * already true by construction and needed proof, not code: (2) no
 * viewport-conditional rendering exists anywhere in this file, so Plan
 * grouping can never be flattened on a smaller screen -- there is no
 * "mobile mode" to degrade into a flat list. (3) every status-bearing
 * element (session counts, item type) already renders icon+text, never a
 * bare colour-only dot.
 *
 * T-FE-C.6a (T-BE-A.3b, FR-HIST-1 AC7/AC8/AC9): the backend contract gap
 * T-FE-C.6/C.7 both reported is now closed -- `HistoryItemResponse`
 * carries `plan_status` and `sessions[]` for `treatment_plan` items.
 * Expanding a Plan now renders its real status (text, never colour-alone,
 * honest "unavailable" fallback when null) plus one child row per
 * backend Session -- date/time, therapist, doctor instructions, and
 * execution state/outcome/non-execution reason, each with its own
 * field-specific "unavailable" localized state, never one vague generic
 * message and never a value this file computes itself. `SessionCounts
 * Breakdown` (the aggregate view) is kept alongside the new per-Session
 * rows, not replaced -- both are genuine backend facts and neither
 * supersedes the other. Session rows are read-only, non-interactive
 * (no onPress, no editable field, no scheduling/execution action) with
 * their own `accessibilityLabel` summarizing the row for screen readers
 * -- consistent with "Clinical History remains read-only history."
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { formatDate } from '../../../../core/utils/dateTimeUtils';
import {
  useClinicalTimelineData,
  ClinicalTimelineItem,
  ClinicalTimelineSessionCounts,
  ClinicalTimelineSession,
} from '../hooks/useClinicalTimelineData';

const ITEM_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  consultation: 'calendar-outline',
  treatment_review: 'clipboard-outline',
  treatment_plan: 'medical-outline',
  legacy_treatment_sessions: 'pulse-outline',
};
const DEFAULT_ITEM_ICON: keyof typeof Ionicons.glyphMap = 'ellipse-outline';

// Bounded height for the panel's own FlatList -- see docstring above.
const TIMELINE_MAX_HEIGHT = 360;

const SESSION_COUNT_ICON: Record<keyof ClinicalTimelineSessionCounts, keyof typeof Ionicons.glyphMap> = {
  completed: 'checkmark-circle-outline',
  scheduled: 'time-outline',
  not_completed: 'ellipse-outline',
  cancelled: 'close-circle-outline',
};

const KNOWN_PLAN_STATUSES: ReadonlySet<string> = new Set([
  'authoring',
  'approved_clinical_intent',
  'available_for_scheduling',
  'active_course',
  'under_clinical_review',
  'completed',
  'superseded_amended',
  'stopped_discontinued',
]);
const KNOWN_SESSION_STATUSES: ReadonlySet<string> = new Set([
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
const KNOWN_NON_EXECUTION_REASONS: ReadonlySet<string> = new Set([
  'PATIENT_NO_SHOW',
  'PATIENT_CANCELLED',
  'CLINIC_CANCELLED',
  'CLINICAL_HOLD',
  'OTHER',
]);

/**
 * T-FE-C.6a (T-BE-A.3b): one individual Session row inside an expanded
 * Plan group -- read-only, non-interactive (no onPress, no editable
 * field, no scheduling/execution action). Renders only backend-verified
 * facts; each nullable field gets its own field-specific "unavailable"
 * state, never one vague generic placeholder, and never a value this
 * component derives itself.
 */
const SessionRow: React.FC<{ session: ClinicalTimelineSession }> = ({ session }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  const dateLabel = session.scheduledDate
    ? formatDate(session.scheduledAt ?? session.scheduledDate)
    : t('clinicalTimeline.session.dateUnavailable');
  const therapistLabel = session.assignedStaffName ?? t('clinicalTimeline.session.therapistUnavailable');
  const instructionsLabel =
    session.treatmentName || session.medicinesText || session.instructionsText
      ? [session.treatmentName, session.medicinesText, session.instructionsText].filter(Boolean).join(' — ')
      : t('clinicalTimeline.session.instructionsUnavailable');
  const statusLabel = KNOWN_SESSION_STATUSES.has(session.status)
    ? t(`clinicalTimeline.session.statuses.${session.status}`)
    : session.status;
  const reasonLabel = session.nonExecutionReasonCode
    ? KNOWN_NON_EXECUTION_REASONS.has(session.nonExecutionReasonCode)
      ? t(`clinicalTimeline.session.nonExecutionReasons.${session.nonExecutionReasonCode}`)
      : session.nonExecutionReasonCode
    : null;

  const accessibilityLabel = [
    dateLabel,
    therapistLabel,
    statusLabel,
    reasonLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.sessionRow,
        { borderColor: colors.border.subtle, borderRadius: spacing.xs, padding: spacing.xs, gap: spacing.xs / 2 },
      ]}
    >
      <View style={[styles.itemRow, { gap: spacing.xs }]}>
        <Ionicons name="calendar-clear-outline" size={14} color={colors.text.secondary} />
        <Text style={[typography.caption, { color: colors.text.secondary }]}>{dateLabel}</Text>
      </View>
      <View style={[styles.itemRow, { gap: spacing.xs }]}>
        <Ionicons name="person-outline" size={14} color={colors.text.secondary} />
        <Text style={[typography.caption, { color: colors.text.secondary }]}>{therapistLabel}</Text>
      </View>
      <View style={[styles.itemRow, { gap: spacing.xs }]}>
        <Ionicons name="document-text-outline" size={14} color={colors.text.secondary} />
        <Text style={[typography.caption, { color: colors.text.secondary }]}>{instructionsLabel}</Text>
      </View>
      <View style={[styles.itemRow, { gap: spacing.xs }]}>
        <Ionicons
          name={session.status === 'COMPLETED' ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={14}
          color={colors.text.secondary}
        />
        <Text style={[typography.caption, { color: colors.text.secondary }]}>
          {statusLabel}
          {reasonLabel ? ` — ${reasonLabel}` : ''}
        </Text>
      </View>
    </View>
  );
};

const SessionCountsBreakdown: React.FC<{ counts: ClinicalTimelineSessionCounts }> = ({ counts }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const rows: Array<[keyof ClinicalTimelineSessionCounts, string]> = [
    ['completed', t('clinicalTimeline.sessionCounts.completed')],
    ['scheduled', t('clinicalTimeline.sessionCounts.scheduled')],
    ['not_completed', t('clinicalTimeline.sessionCounts.notCompleted')],
    ['cancelled', t('clinicalTimeline.sessionCounts.cancelled')],
  ];
  return (
    <View style={[styles.sessionCounts, { gap: spacing.xs, paddingTop: spacing.xs }]}>
      {rows.map(([key, label]) => (
        <View key={key} style={[styles.sessionCountRow, { gap: spacing.xs }]}>
          <Ionicons name={SESSION_COUNT_ICON[key]} size={14} color={colors.text.secondary} />
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            {label}: {counts[key]}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const ClinicalTimeline: React.FC = () => {
  const router = useRouter();
  const { colors, spacing, typography, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const { items, isLoading, isError, refetch } = useClinicalTimelineData();
  // T-FE-C.6 (AC-3): presentation-only expand/collapse state -- which
  // Plan rows are currently expanded. Never holds clinical-artifact
  // content, only item ids.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ClinicalTimelineItem }) => {
      const isPlan = item.type === 'treatment_plan';
      const isExpanded = isPlan && expandedIds.has(item.id);
      const subtitle =
        item.type === 'legacy_treatment_sessions' ? t('clinicalTimeline.legacyUnavailableLabel') : item.subtitle;
      // T-FE-C.6a (T-BE-A.3b, FR-HIST-1 AC7): the Plan's own authoritative
      // status -- text, never colour-alone; honest "unavailable" fallback
      // when the backend genuinely has no status for this Plan, never a
      // blank line or a fabricated default.
      const planStatusLabel = isPlan
        ? item.planStatus && KNOWN_PLAN_STATUSES.has(item.planStatus)
          ? t(`clinicalTimeline.planStatuses.${item.planStatus}`)
          : item.planStatus ?? t('clinicalTimeline.planStatusUnavailable')
        : null;

      return (
        <TouchableOpacity
          onPress={
            isPlan ? () => toggleExpanded(item.id) : item.route ? () => router.push(item.route as any) : undefined
          }
          disabled={!isPlan && !item.route}
          accessibilityRole="button"
          accessibilityState={isPlan ? { expanded: isExpanded } : undefined}
          accessibilityLabel={`${item.title}${subtitle ? `, ${subtitle}` : ''}${
            planStatusLabel ? `, ${planStatusLabel}` : ''
          }, ${formatDate(item.date)}`}
          style={[
            styles.item,
            {
              borderColor: colors.border.subtle,
              borderRadius: spacing.sm,
              padding: spacing.sm,
              gap: spacing.sm,
              // T-FE-C.7 (FR-MOB-1 AC1 pattern): the collapse/expand
              // control (and every other row's own press target) meets
              // the governed minimum touch target, not just whatever
              // content happens to render.
              minHeight: sizes.touchTarget,
            },
          ]}
        >
          <View style={[styles.itemRow, { gap: spacing.sm }]}>
            <Ionicons name={ITEM_ICON[item.type] ?? DEFAULT_ITEM_ICON} size={20} color={colors.primary.default} />
            <View style={styles.itemText}>
              <Text style={[typography.subtitle2, { color: colors.text.primary }]}>{item.title}</Text>
              {!!subtitle && <Text style={[typography.caption, { color: colors.text.secondary }]}>{subtitle}</Text>}
              {isPlan && !!planStatusLabel && (
                <View style={[styles.itemRow, { gap: spacing.xs }]}>
                  <Ionicons name="flag-outline" size={12} color={colors.text.secondary} />
                  <Text style={[typography.caption, { color: colors.text.secondary }]}>{planStatusLabel}</Text>
                </View>
              )}
            </View>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>{formatDate(item.date)}</Text>
            {isPlan && (!!item.sessionCounts || !!item.sessions) && (
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.text.secondary}
              />
            )}
            {!isPlan && !!item.route && <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />}
          </View>
          {isExpanded && item.sessionCounts && <SessionCountsBreakdown counts={item.sessionCounts} />}
          {isExpanded && item.sessions && item.sessions.length > 0 && (
            <View style={[styles.sessionsList, { gap: spacing.xs, paddingTop: spacing.xs }]}>
              {item.sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [router, colors, spacing, typography, sizes, t, expandedIds, toggleExpanded],
  );
  const keyExtractor = useCallback((item: ClinicalTimelineItem) => item.id, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default, maxHeight: TIMELINE_MAX_HEIGHT },
      ]}
    >
      <Text style={[typography.h6, { color: colors.text.primary, padding: spacing.md, paddingBottom: spacing.sm }]}>
        Clinical Timeline
      </Text>
      {isLoading ? (
        <View style={[styles.center, { padding: spacing.lg }]}>
          <ActivityIndicator color={colors.primary.default} />
        </View>
      ) : isError ? (
        <View style={[styles.center, { padding: spacing.lg, gap: spacing.sm }]}>
          <Text style={[typography.body2, { color: colors.feedback.error }]}>
            {t('clinicalTimeline.error')}
          </Text>
          <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
            <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <Text
          style={[typography.body2, { color: colors.text.secondary, paddingHorizontal: spacing.md, paddingBottom: spacing.md }]}
        >
          No clinical activity recorded yet for this episode.
        </Text>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, borderWidth: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  item: { borderWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemText: { flex: 1 },
  sessionCounts: {},
  sessionCountRow: { flexDirection: 'row', alignItems: 'center' },
  sessionsList: {},
  sessionRow: { borderWidth: 1 },
});
