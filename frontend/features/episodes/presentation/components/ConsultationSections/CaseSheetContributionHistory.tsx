/**
 * CaseSheetContributionHistory (T-FE-E.1b, T-BE-E.1a, Decision 12, FR-CS-5/6)
 *
 * Renders the append-only history of prior Visit Case Sheet contributions
 * inside the composed Case Sheet experience. Purely read-only — this
 * component never initializes editable form state, never autosaves, and
 * never mutates the current Episode Case Sheet
 * (`useEpisodeContext().casesheet`/`TenantCasesheet.data_json` remains the
 * sole editable document, per Decision 12's amended DO-2 interpretation).
 *
 * Composed as a 4th, unconditional child of `CaseSheetModule`'s returned
 * fragment — not wrapped in `renderSection`/`SectionKey`, since that union
 * drives per-field save-status/progress semantics this read-only block
 * doesn't have (design.md §3 region order; sectionRenderer.tsx's own
 * "Composition Before Duplication" doctrine). Owns its own local
 * expand/collapse state, independent of `expandedSections`/`onToggleSection`
 * threaded into the three `SectionKey` sections.
 *
 * Contract: consumes `GET /clinic/{tenant_id}/casesheets/{casesheet_id}/
 * contributions` only (via `useCasesheetContributionHistoryQuery`) — no
 * frontend reconstruction, no diff/summary computation, no staff lookup.
 * Renders contributions in the exact backend-provided order
 * (`contributed_at` ASC, `id` ASC) — never locally reordered.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { formatDateTime } from '../../../../../core/utils/dateTimeUtils';
import { useEpisodeContext, usePatientContext } from '../../context/ClinicalWorkspaceContext';
import { useCasesheetContributionHistoryQuery } from '../../../../casesheets/data/repositories/casesheets.repository.impl';
import { CasesheetContributionItem } from '../../../../casesheets/data/models/casesheets.dtos';

function renderSnapshotBasicField(
  label: string,
  value: string | null | undefined,
  textStyle: any,
  labelStyle: any,
) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={textStyle}>{value}</Text>
    </View>
  );
}

/**
 * Reads the same `content_snapshot` shape `TenantCasesheet.data_json`
 * itself uses (verified: identical, since a snapshot IS that exact
 * document at write time) — mirrors `CasesheetDetailScreen.tsx`'s own
 * private read pattern rather than importing a shared renderer, since
 * none exists to reuse (Engineering Truth, this task's pre-implementation
 * report, item 6).
 */
const SnapshotContent: React.FC<{ snapshot: Record<string, any> }> = ({ snapshot }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const basic = snapshot.basic ?? snapshot;
  const extensions = snapshot.extensions ?? [];

  const labelStyle = [typography.caption, { color: colors.text.secondary, marginBottom: spacing.xs / 2 }];
  const textStyle = [typography.body2, { color: colors.text.primary }];

  const hasBasicContent =
    !!basic?.chief_complaint ||
    !!basic?.provisional_diagnosis ||
    !!basic?.final_diagnosis ||
    !!basic?.subjective ||
    !!basic?.objective ||
    !!basic?.assessment ||
    !!basic?.plan;

  return (
    <View style={[styles.snapshotContent, { gap: spacing.sm }]}>
      {hasBasicContent && (
        <>
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.chiefComplaint'),
            basic?.chief_complaint,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.provisionalDiagnosis'),
            basic?.provisional_diagnosis,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.finalDiagnosis'),
            basic?.final_diagnosis,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.subjective'),
            basic?.subjective,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.objective'),
            basic?.objective,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.assessment'),
            basic?.assessment,
            textStyle,
            labelStyle,
          )}
          {renderSnapshotBasicField(
            t('episodeWorkspace.casesheet.history.fields.plan'),
            basic?.plan,
            textStyle,
            labelStyle,
          )}
        </>
      )}
      {Array.isArray(extensions) &&
        extensions.map((ext: any, index: number) => (
          <View key={ext.template_id ?? index} style={{ gap: spacing.xs }}>
            <Text style={[typography.subtitle2, { color: colors.text.primary }]}>
              {ext.template_name ||
                ext.template_id ||
                t('episodeWorkspace.casesheet.history.extensionFallback', { number: index + 1 })}
            </Text>
            {ext.data &&
              Object.entries(ext.data)
                .filter(([, value]) => !!String(value ?? '').trim())
                .map(([key, value]) => (
                  <View key={key} style={styles.field}>
                    <Text style={labelStyle}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={textStyle}>{String(value)}</Text>
                  </View>
                ))}
          </View>
        ))}
      {!hasBasicContent && extensions.length === 0 && (
        <Text style={[typography.body2, { color: colors.text.tertiary, fontStyle: 'italic' }]}>
          {t('episodeWorkspace.casesheet.history.noContentRecorded')}
        </Text>
      )}
    </View>
  );
};

const ContributionEntry: React.FC<{ contribution: CasesheetContributionItem }> = ({ contribution }) => {
  const { colors, spacing, typography, radii, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const authorLabel = contribution.author?.full_name ?? t('episodeWorkspace.casesheet.history.missingAuthor');

  return (
    <View
      style={[
        styles.entry,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.subtle,
          borderRadius: radii.medium,
          padding: spacing.md,
          gap: spacing.xs,
        },
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.entryHeaderRow}>
        <Text style={[typography.subtitle2, { color: colors.text.primary }]}>
          {t('episodeWorkspace.casesheet.history.visitLabel')}
        </Text>
        <View
          style={[
            styles.readOnlyBadge,
            { backgroundColor: colors.background.muted, borderRadius: radii.small, paddingHorizontal: spacing.xs },
          ]}
        >
          <Ionicons name="lock-closed" size={12} color={colors.text.secondary} />
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            {t('episodeWorkspace.casesheet.history.readOnlyLabel')}
          </Text>
        </View>
      </View>

      <Text style={[typography.body2, { color: colors.text.secondary }]}>
        {t('episodeWorkspace.casesheet.history.authorLabel')}: {authorLabel}
      </Text>
      <Text style={[typography.caption, { color: colors.text.tertiary }]}>
        {t('episodeWorkspace.casesheet.history.timestampLabel')}: {formatDateTime(contribution.contributed_at)}
      </Text>

      {contribution.content_available && contribution.content_snapshot ? (
        <>
          <TouchableOpacity
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            style={[styles.toggle, { minHeight: sizes.touchTarget, gap: spacing.xs }]}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary.default} />
            <Text style={[typography.button, { color: colors.primary.default }]}>
              {expanded
                ? t('episodeWorkspace.casesheet.history.hideContent')
                : t('episodeWorkspace.casesheet.history.showContent')}
            </Text>
          </TouchableOpacity>
          {expanded && <SnapshotContent snapshot={contribution.content_snapshot} />}
        </>
      ) : (
        <Text style={[typography.body2, { color: colors.text.tertiary, fontStyle: 'italic' }]}>
          {t('episodeWorkspace.casesheet.history.contentUnavailable')}
        </Text>
      )}
    </View>
  );
};

export const CaseSheetContributionHistory: React.FC = () => {
  const { colors, spacing, typography, radii, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const [sectionExpanded, setSectionExpanded] = useState(false);

  const { tenantId, episodeId, casesheetId } = useEpisodeContext();
  const { clientId } = usePatientContext();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useCasesheetContributionHistoryQuery(tenantId, casesheetId ?? '', clientId, episodeId);

  // No Case Sheet yet -- nothing to show history for; never call/enable
  // the query without a casesheetId (handled by the hook's own `enabled`
  // guard), and render nothing here rather than an empty/loading state.
  if (!casesheetId) return null;

  return (
    <View style={[styles.section, { gap: spacing.sm }]}>
      <TouchableOpacity
        onPress={() => setSectionExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded: sectionExpanded }}
        style={[
          styles.sectionHeader,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
            borderRadius: radii.medium,
            padding: spacing.md,
            minHeight: sizes.touchTarget,
            gap: spacing.sm,
          },
        ]}
      >
        <Ionicons name="time-outline" size={20} color={colors.primary.default} />
        <Text
          accessibilityRole="header"
          style={[typography.h6, styles.sectionHeaderText, { color: colors.text.primary }]}
        >
          {t('episodeWorkspace.casesheet.history.sectionTitle')}
        </Text>
        <Ionicons name={sectionExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      {sectionExpanded && (
        <View style={{ gap: spacing.sm }}>
          {isLoading && (
            <Text style={[typography.body2, { color: colors.text.secondary }]}>
              {t('episodeWorkspace.casesheet.history.loading')}
            </Text>
          )}

          {isError && !isLoading && (
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.body2, { color: colors.feedback.error }]}>
                {t('episodeWorkspace.casesheet.history.error')}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                accessibilityRole="button"
                style={[styles.toggle, { minHeight: sizes.touchTarget }]}
              >
                <Text style={[typography.button, { color: colors.primary.default }]}>
                  {t('episodeWorkspace.casesheet.history.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isError && data && data.contributions.length === 0 && (
            <Text style={[typography.body2, { color: colors.text.tertiary }]}>
              {t('episodeWorkspace.casesheet.history.empty')}
            </Text>
          )}

          {!isLoading &&
            !isError &&
            data?.contributions.map((contribution) => (
              <ContributionEntry key={contribution.id} contribution={contribution} />
            ))}
        </View>
      )}
    </View>
  );
};

CaseSheetContributionHistory.displayName = 'CaseSheetContributionHistory';

const styles = StyleSheet.create({
  section: {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  sectionHeaderText: { flex: 1 },
  entry: { borderWidth: 1 },
  entryHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center' },
  snapshotContent: {},
  field: {},
});
