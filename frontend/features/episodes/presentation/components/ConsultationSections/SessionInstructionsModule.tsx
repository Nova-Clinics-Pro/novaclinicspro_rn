/**
 * SessionInstructionsModule (T-FE-E.2/T-FE-E.2a, FR-TS-3, FR-SCH-2)
 *
 * NEW module -- no existing frontend component owned "doctor-authored
 * Session content" before this task. Reads the current Episode's
 * treatment order via `useTreatmentOrderQuery` (the rich
 * `TreatmentRowOrderResponse[]` projection -- `id`, `status`,
 * `treatment_name`/`medicines_text`/`instructions_text`, unlike the
 * narrower `treatmentSheet` already in `useEpisodeContext()`, which the
 * backend's own `_row_to_dict` docstring documents as deliberately
 * excluding scheduling/status fields -- see `ClinicalTimeline.tsx`'s own
 * Engineering Truth note on the same distinction, T-BE-A.3b).
 *
 * Sessions are selected and edited by their stable `id`
 * (`TreatmentSheetRow.id`, T-BE-E.1) -- never `day_number`, `session_date`,
 * therapist, or array position (FR-TS-1). A completed Session's content
 * is never editable (mirrors the backend's own `update_row`/`bulk_update`
 * rejection of `status == 'COMPLETED'` -- this is a UI convenience
 * matching a real server-side rule, not a new rule invented here).
 *
 * OCC (T-BE-E.5, staged-optional): the order's own `version` (already
 * fetched, no second call) is sent as `If-Match` on every SINGLE-Session
 * content save. A stale token surfaces an explicit conflict state with a
 * `current_version`-driven reload action -- never a silent overwrite,
 * never an automatic blind retry with the server's version.
 *
 * [T-FE-E.2a, FR-TS-3 Adoption requirement] Author once, apply to many
 * Sessions -- a SEPARATE selection mechanism (checkbox `checkedRowIds`,
 * orthogonal to the existing single-row `selectedRowId` flow, which is
 * fully preserved unchanged below) driving ONE bulk mutation
 * (`useUpdateAllTreatmentSheetRowsMutation`, `PATCH .../rows`, already
 * existed -- reused verbatim, no datasource/DTO change). Engineering
 * Truth (this task's own pre-implementation investigation) confirmed the
 * backend bulk path is atomic (every validation -- sheet exists, edit
 * permitted, every row exists, every row belongs to this sheet, no row
 * COMPLETED -- runs before any mutation; a rejected request touches
 * nothing) and rejects the WHOLE request if any selected row is
 * COMPLETED (never a silent per-row skip). It has NO OCC/version
 * parameter at all (`bulk_update_rows`/`bulk_update` accept none) --
 * reported, not silently added here; this task does not touch the
 * backend.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { useEpisodeContext } from '../../context/ClinicalWorkspaceContext';
import { useTreatmentOrderQuery } from '../../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import {
  useUpdateTreatmentSheetRowMutation,
  useUpdateAllTreatmentSheetRowsMutation,
  SessionInstructionsError,
} from '../../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { TreatmentRowOrderResponse } from '../../../../treatmentSheets/data/models/treatmentOrders.dtos';

const KNOWN_ROW_STATUSES: ReadonlySet<string> = new Set(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

type BulkDraft = { treatment_description: string; medicines_given: string; instructions: string };
const EMPTY_BULK_DRAFT: BulkDraft = { treatment_description: '', medicines_given: '', instructions: '' };

/** Only COMPLETED Sessions are ineligible for content edits -- the exact,
 * verified backend rule (both `update_row` and `bulk_update` reject
 * COMPLETED rows and nothing else at this layer). No second lifecycle
 * resolver is invented here. */
const isEligibleForContentEdit = (row: TreatmentRowOrderResponse): boolean => row.status !== 'COMPLETED';

export const SessionInstructionsModule: React.FC = () => {
  const { colors, spacing, typography, radii, borderWidths, sizes } = useClinicTheme();
  const { t } = useTranslation();
  const { tenantId, treatmentSheetId } = useEpisodeContext();

  const orderQuery = useTreatmentOrderQuery(treatmentSheetId ?? '', tenantId, { enabled: !!tenantId && !!treatmentSheetId });
  const updateRowMutation = useUpdateTreatmentSheetRowMutation(tenantId, treatmentSheetId ?? '');
  const bulkMutation = useUpdateAllTreatmentSheetRowsMutation(tenantId, treatmentSheetId ?? '');

  // Existing single-Session edit flow -- UNCHANGED.
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BulkDraft>(EMPTY_BULK_DRAFT);
  const [conflict, setConflict] = useState<{ currentVersion: number | null } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // T-FE-E.2a: bulk-apply flow -- a separate selection mechanism, does
  // not interact with selectedRowId/draft above.
  const [checkedRowIds, setCheckedRowIds] = useState<Set<string>>(new Set());
  const [bulkDraft, setBulkDraft] = useState<BulkDraft>(EMPTY_BULK_DRAFT);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  const rows: TreatmentRowOrderResponse[] = orderQuery.data?.rows ?? [];
  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedRowId) ?? null, [rows, selectedRowId]);
  const eligibleRows = useMemo(() => rows.filter(isEligibleForContentEdit), [rows]);
  const hasIneligibleRows = eligibleRows.length < rows.length;
  const checkedCount = checkedRowIds.size;
  const allEligibleChecked = eligibleRows.length > 0 && eligibleRows.every((r) => checkedRowIds.has(r.id));
  const bulkDraftIsEmpty =
    !bulkDraft.treatment_description.trim() && !bulkDraft.medicines_given.trim() && !bulkDraft.instructions.trim();

  const selectRow = useCallback((row: TreatmentRowOrderResponse) => {
    setSelectedRowId(row.id);
    setDraft({
      treatment_description: row.treatment_name ?? '',
      medicines_given: row.medicines_text ?? '',
      instructions: row.instructions_text ?? '',
    });
    setConflict(null);
    setSaveError(null);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!selectedRow) return;
    setSaveError(null);
    setConflict(null);
    try {
      await updateRowMutation.mutateAsync({
        rowId: selectedRow.id,
        payload: draft,
        expectedVersion: orderQuery.data?.version,
      });
      await orderQuery.refetch();
    } catch (error) {
      if (error instanceof SessionInstructionsError && error.kind === 'VERSION_CONFLICT') {
        setConflict({ currentVersion: error.currentVersion });
        return;
      }
      setSaveError(error instanceof SessionInstructionsError ? error.message : t('sessionInstructions.saveFailed'));
    }
  }, [selectedRow, draft, orderQuery, updateRowMutation, t]);

  const reloadAfterConflict = useCallback(async () => {
    setConflict(null);
    setSaveError(null);
    setSelectedRowId(null);
    await orderQuery.refetch();
  }, [orderQuery]);

  // T-FE-E.2a selection handlers -- keyed exclusively on row.id
  // (TreatmentSheetRow.id), never day_number/array index/date/therapist.
  const toggleRowChecked = useCallback((rowId: string) => {
    setBulkSuccess(false);
    setBulkError(null);
    setCheckedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const selectAllEligible = useCallback(() => {
    setBulkSuccess(false);
    setBulkError(null);
    setCheckedRowIds(new Set(eligibleRows.map((r) => r.id)));
  }, [eligibleRows]);

  const clearSelection = useCallback(() => {
    setCheckedRowIds(new Set());
    setBulkDraft(EMPTY_BULK_DRAFT);
    setBulkConfirming(false);
    setBulkError(null);
    setBulkSuccess(false);
  }, []);

  const submitBulkApply = useCallback(async () => {
    if (checkedRowIds.size === 0 || bulkDraftIsEmpty || !treatmentSheetId) return;
    setBulkError(null);
    try {
      // ONE bulk mutation -- never a client-side loop of single-row calls.
      // Row IDs are exactly TreatmentSheetRow.id; the mutation's own
      // (tenantId, treatmentSheetId) scope guarantees every submitted row
      // belongs to this one Treatment Sheet (this module only ever reads
      // rows from useTreatmentOrderQuery(treatmentSheetId), so no
      // cross-sheet row can enter checkedRowIds to begin with).
      await bulkMutation.mutateAsync(
        Array.from(checkedRowIds).map((id) => ({ id, ...bulkDraft })),
      );
      await orderQuery.refetch();
      // Selection/draft are deliberately NOT cleared here -- clearing them
      // would unmount this panel immediately (it renders only while
      // checkedCount > 0), hiding the success feedback before the doctor
      // ever sees it. The doctor dismisses via "Clear selection" once
      // they've seen it, same as any other transient confirmation.
      setBulkConfirming(false);
      setBulkSuccess(true);
    } catch (error) {
      setBulkConfirming(false);
      if (error instanceof SessionInstructionsError && error.kind === 'PERMISSION_DENIED') {
        setBulkError(t('sessionInstructions.bulk.applyFailedPermission'));
      } else if (error instanceof SessionInstructionsError && error.kind === 'VALIDATION_FAILED') {
        setBulkError(t('sessionInstructions.bulk.applyFailedValidation'));
      } else {
        setBulkError(t('sessionInstructions.bulk.applyFailedGeneral'));
      }
    }
  }, [checkedRowIds, bulkDraft, bulkDraftIsEmpty, treatmentSheetId, bulkMutation, orderQuery, t]);

  const handleApplyPress = useCallback(() => {
    if (checkedRowIds.size === 0 || bulkDraftIsEmpty) return;
    if (checkedRowIds.size > 1) {
      setBulkConfirming(true);
      return;
    }
    // Single checked Session via the bulk pathway -- no confirmation
    // required, matching the existing single-Session edit UX's own
    // convention (never confirmed there either).
    submitBulkApply();
  }, [checkedRowIds, bulkDraftIsEmpty, submitBulkApply]);

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
    // Honest, field-specific empty state -- never "coming soon". A
    // Recommendation must exist (TreatmentRecommendationModule) before
    // any Session exists to author content on.
    return (
      <View style={cardStyle} testID="session-instructions-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('sessionInstructions.title')}
        </Text>
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('sessionInstructions.noOrderYet')}</Text>
      </View>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <View style={cardStyle} testID="session-instructions-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('sessionInstructions.title')}
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary.default} />
          <Text style={[typography.body2, { color: colors.text.secondary, marginLeft: spacing.sm }]}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (orderQuery.isError) {
    return (
      <View style={cardStyle} testID="session-instructions-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('sessionInstructions.title')}
        </Text>
        <Text style={[typography.body2, { color: colors.feedback.error, marginBottom: spacing.sm }]}>
          {t('errors.generic.loadFailed')}
        </Text>
        <TouchableOpacity onPress={() => orderQuery.refetch()} accessibilityRole="button">
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={cardStyle} testID="session-instructions-section">
        <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
          {t('sessionInstructions.title')}
        </Text>
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('sessionInstructions.noSessions')}</Text>
      </View>
    );
  }

  return (
    <View style={cardStyle} testID="session-instructions-section">
      <Text style={[typography.h6, { color: colors.text.primary, marginBottom: spacing.sm }]}>
        {t('sessionInstructions.title')}
      </Text>

      {/* T-FE-E.2a: selection controls */}
      <View style={[styles.selectionBar, { gap: spacing.sm, marginBottom: spacing.sm }]}>
        <TouchableOpacity
          onPress={selectAllEligible}
          accessibilityRole="checkbox"
          accessibilityLabel={t('sessionInstructions.bulk.selectAllCheckboxLabel')}
          accessibilityState={{ checked: allEligibleChecked || (checkedCount > 0 ? 'mixed' : false) }}
          disabled={eligibleRows.length === 0}
          style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}
        >
          <Text style={[typography.button, { color: colors.primary.default }]}>{t('sessionInstructions.bulk.selectAllEligible')}</Text>
        </TouchableOpacity>
        {checkedCount > 0 && (
          <TouchableOpacity
            onPress={clearSelection}
            accessibilityRole="button"
            style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}
          >
            <Text style={[typography.button, { color: colors.text.secondary }]}>{t('sessionInstructions.bulk.clearSelection')}</Text>
          </TouchableOpacity>
        )}
        {checkedCount > 0 && (
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            {t('sessionInstructions.bulk.sessionsSelectedCount', { count: checkedCount })}
          </Text>
        )}
      </View>
      {hasIneligibleRows && (
        <Text style={[typography.caption, { color: colors.text.tertiary, marginBottom: spacing.sm }]}>
          {t('sessionInstructions.bulk.someNotEditable')}
        </Text>
      )}

      <View style={[styles.rowList, { gap: spacing.xs }]}>
        {rows.map((row) => {
          const isSelected = row.id === selectedRowId;
          const isChecked = checkedRowIds.has(row.id);
          const isEligible = isEligibleForContentEdit(row);
          const statusLabel = KNOWN_ROW_STATUSES.has(row.status)
            ? t(`sessionInstructions.rowStatus.${row.status}`)
            : row.status;
          return (
            <View
              key={row.id}
              style={[
                styles.rowItem,
                {
                  borderColor: isSelected ? colors.primary.default : colors.border.subtle,
                  borderRadius: spacing.sm,
                  padding: spacing.sm,
                  minHeight: sizes.touchTarget,
                },
              ]}
            >
              {isEligible && (
                <TouchableOpacity
                  onPress={() => toggleRowChecked(row.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={t('sessionInstructions.bulk.selectSessionCheckbox', { day: row.day_number })}
                  accessibilityState={{ checked: isChecked }}
                  style={{ minHeight: sizes.touchTarget, minWidth: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons
                    name={isChecked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isChecked ? colors.primary.default : colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => selectRow(row)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={styles.rowTapArea}
              >
                <Ionicons
                  name={row.status === 'COMPLETED' ? 'checkmark-circle-outline' : 'ellipse-outline'}
                  size={18}
                  color={colors.text.secondary}
                />
                <Text style={[typography.body2, { color: colors.text.primary, marginLeft: spacing.sm, flex: 1 }]}>
                  {t('sessionInstructions.dayLabel', { day: row.day_number })}
                </Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>{statusLabel}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* T-FE-E.2a: bulk-apply toolbar -- only when at least one Session is checked */}
      {checkedCount > 0 && (
        <View style={[styles.bulkPanel, { marginTop: spacing.md, gap: spacing.sm, borderTopColor: colors.border.subtle, borderTopWidth: borderWidths.default, paddingTop: spacing.md }]}>
          <FieldInput
            label={t('sessionInstructions.fields.treatmentName')}
            value={bulkDraft.treatment_description}
            editable
            onChangeText={(v) => setBulkDraft((d) => ({ ...d, treatment_description: v }))}
          />
          <FieldInput
            label={t('sessionInstructions.fields.medicines')}
            value={bulkDraft.medicines_given}
            editable
            onChangeText={(v) => setBulkDraft((d) => ({ ...d, medicines_given: v }))}
          />
          <FieldInput
            label={t('sessionInstructions.fields.instructions')}
            value={bulkDraft.instructions}
            editable
            onChangeText={(v) => setBulkDraft((d) => ({ ...d, instructions: v }))}
            multiline
          />

          {bulkConfirming && (
            <View
              style={[
                styles.confirmBanner,
                { backgroundColor: colors.surface.muted, borderColor: colors.border.default, borderRadius: spacing.sm, padding: spacing.sm, gap: spacing.xs },
              ]}
              accessibilityRole="alert"
              accessibilityLabel={t('sessionInstructions.bulk.sessionsSelectedCount', { count: checkedCount })}
            >
              <Text style={[typography.body2, { color: colors.text.primary }]}>{t('sessionInstructions.bulk.confirmTitle')}</Text>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>{t('sessionInstructions.bulk.confirmReplaceNotice')}</Text>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>{t('sessionInstructions.bulk.confirmUnchangedNotice')}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => setBulkConfirming(false)}
                  accessibilityRole="button"
                  style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}
                >
                  <Text style={[typography.button, { color: colors.text.secondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitBulkApply}
                  disabled={bulkMutation.isPending}
                  accessibilityRole="button"
                  style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}
                >
                  <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {bulkError && (
            <Text style={[typography.body2, { color: colors.feedback.error }]} accessibilityRole="alert">
              {bulkError}
            </Text>
          )}
          {bulkSuccess && (
            <Text style={[typography.body2, { color: colors.feedback.success }]} accessibilityRole="alert">
              {t('sessionInstructions.bulk.appliedSuccess')}
            </Text>
          )}

          {!bulkConfirming && (
            <TouchableOpacity
              onPress={handleApplyPress}
              disabled={bulkMutation.isPending || bulkDraftIsEmpty}
              accessibilityRole="button"
              accessibilityLabel={t('sessionInstructions.bulk.applyToCount', { count: checkedCount })}
              accessibilityHint={bulkDraftIsEmpty ? t('sessionInstructions.bulk.emptyDraftDisallowed') : undefined}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.primary.default,
                  borderRadius: spacing.sm,
                  minHeight: sizes.touchTarget,
                  opacity: bulkDraftIsEmpty ? 0.5 : 1,
                },
              ]}
            >
              {bulkMutation.isPending ? (
                <ActivityIndicator color={colors.surface.default} />
              ) : (
                <Text style={[typography.button, { color: colors.surface.default }]}>
                  {t('sessionInstructions.bulk.applyToCount', { count: checkedCount })}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Existing single-Session edit flow -- UNCHANGED */}
      {selectedRow && (
        <View style={[styles.editor, { marginTop: spacing.md, gap: spacing.sm }]}>
          {selectedRow.status === 'COMPLETED' ? (
            <Text style={[typography.caption, { color: colors.text.secondary }]}>
              {t('sessionInstructions.completedReadOnly')}
            </Text>
          ) : null}
          <FieldInput
            label={t('sessionInstructions.fields.treatmentName')}
            value={draft.treatment_description}
            editable={selectedRow.status !== 'COMPLETED'}
            onChangeText={(v) => setDraft((d) => ({ ...d, treatment_description: v }))}
          />
          <FieldInput
            label={t('sessionInstructions.fields.medicines')}
            value={draft.medicines_given}
            editable={selectedRow.status !== 'COMPLETED'}
            onChangeText={(v) => setDraft((d) => ({ ...d, medicines_given: v }))}
          />
          <FieldInput
            label={t('sessionInstructions.fields.instructions')}
            value={draft.instructions}
            editable={selectedRow.status !== 'COMPLETED'}
            onChangeText={(v) => setDraft((d) => ({ ...d, instructions: v }))}
            multiline
          />

          {conflict && (
            <View
              style={[
                styles.conflictBanner,
                { backgroundColor: colors.feedback.errorLight, borderColor: colors.feedback.error, borderRadius: spacing.sm, padding: spacing.sm, gap: spacing.xs },
              ]}
              accessibilityRole="alert"
            >
              <Text style={[typography.body2, { color: colors.feedback.error }]}>{t('sessionInstructions.conflict.message')}</Text>
              <TouchableOpacity onPress={reloadAfterConflict} accessibilityRole="button" style={{ minHeight: sizes.touchTarget, justifyContent: 'center' }}>
                <Text style={[typography.button, { color: colors.primary.default }]}>{t('sessionInstructions.conflict.reload')}</Text>
              </TouchableOpacity>
            </View>
          )}
          {saveError && (
            <Text style={[typography.body2, { color: colors.feedback.error }]}>{saveError}</Text>
          )}

          {selectedRow.status !== 'COMPLETED' && (
            <TouchableOpacity
              onPress={saveDraft}
              disabled={updateRowMutation.isPending}
              accessibilityRole="button"
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.primary.default,
                  borderRadius: spacing.sm,
                  minHeight: sizes.touchTarget,
                },
              ]}
            >
              {updateRowMutation.isPending ? (
                <ActivityIndicator color={colors.surface.default} />
              ) : (
                <Text style={[typography.button, { color: colors.surface.default }]}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const FieldInput: React.FC<{
  label: string;
  value: string;
  editable: boolean;
  multiline?: boolean;
  onChangeText: (v: string) => void;
}> = ({ label, value, editable, multiline, onChangeText }) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  return (
    <View>
      <Text style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[
          {
            borderColor: colors.border.default,
            borderWidth: borderWidths.default,
            borderRadius: radii.small,
            padding: spacing.sm,
            color: editable ? colors.text.primary : colors.text.secondary,
            backgroundColor: editable ? colors.surface.default : colors.surface.muted,
            minHeight: multiline ? 80 : undefined,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  rowList: {},
  rowItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  rowTapArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bulkPanel: {},
  confirmBanner: { borderWidth: 1 },
  editor: {},
  conflictBanner: { borderWidth: 1 },
  saveButton: { alignItems: 'center', justifyContent: 'center' },
});
