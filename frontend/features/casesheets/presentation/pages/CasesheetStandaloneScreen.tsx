/**
 * CasesheetStandaloneScreen (R3B · T-B.2, ADR-R3B-05, design.md §8 step 3)
 *
 * Thin standalone host for the canonical Case Sheet editing core (T-B.1) —
 * `ChiefComplaintSection`/`ClinicalNotesSection`/`CaseSheetExtensionsSection`
 * — unifying `CasesheetEditScreen` (edit an existing casesheet) and
 * `CreateCasesheetScreen` (create a new one) into one wrapper. Deliberately
 * does NOT render `CasesheetForm.tsx` — that file is the OLD standalone
 * implementation, staying fully intact as the OFF-path (Group B's own
 * restructuring rule) until a future flag-gated route switch (T-B.3). This
 * screen hosts the SAME canonical core `CaseSheetModule` hosts, exactly as
 * ADR-R3B-05 requires ("there is one editing core; `CaseSheetModule` and the
 * standalone wrapper are hosts, not editors in their own right").
 *
 * No Persistent Context, no autosave: this screen owns its own local
 * `casesheetData` state and an explicit Save button — mirroring
 * `CasesheetEditScreen`/`CreateCasesheetScreen`'s own existing explicit-save
 * behavior (design §9 — there is no active Visit here to autosave against).
 * The extensions section runs in `allowAddRemove` mode with all four
 * templates offered (`vitals`/`prakriti`/`nadi_pariksha`/`custom`) —
 * reproducing `CasesheetForm.tsx`'s own dynamic add/remove UX, the first
 * host to actually exercise that mode built in T-B.1.
 *
 * Takes identifiers as PROPS rather than calling `useLocalSearchParams()`
 * itself — matching the pattern already used by the episode-flow entry-point
 * routes (`start-consultation.tsx` etc., confirmed in T-0.1's audit), where
 * the route file reads params and passes them down. This also keeps the
 * screen directly renderable in a test (T-B.2's own verify line), with no
 * `expo-router` param mocking required. Not yet wired to any route — that is
 * T-B.3's job (flag-gated route switch).
 *
 * Host-level concerns replicated from the old screens (confirmed by T-0.2's
 * own characterization as real, non-core behavior the standalone context
 * must carry — the canonical core itself has no reason to know about any of
 * this):
 *  - Edit mode's status/role edit-gate (DRAFT always editable; SIGNED only
 *    by a DOCTOR-role user; FINAL never) — `CasesheetEditScreen`'s own
 *    check, unchanged.
 *  - Create mode's "one casesheet per episode" guard — redirects straight
 *    to the existing casesheet instead of rendering an empty form,
 *    `CreateCasesheetScreen`'s own check, unchanged.
 *  - Both modes reuse the existing `useCasesheetDetailQuery`/
 *    `useUpdateCasesheetMutation`/`useCreateCasesheetMutation` hooks
 *    unchanged — including their always-on cache invalidation, which has
 *    never been gated by `isFreshnessV1Enabled` (design §9's own T-B.2
 *    correction — that claim was false; this wrapper preserves the real,
 *    ungated behavior rather than inventing a new flag check).
 *
 * One deliberate departure from `CreateCasesheetScreen`'s own current
 * behavior, in NEW code only: this screen passes the clinic's real
 * `features.clinic_type` on create, not a hardcoded `'ayurveda'`.
 * `CreateCasesheetScreen.tsx` hardcodes `'ayurveda'` — a confirmed,
 * pre-existing bug (T-0.2, logged as Engineering Debt) — but that file
 * itself is left untouched (it remains the OFF-path implementation, per
 * Group B's own restructuring rule). Not repeating a known bug in freshly-
 * written code is not the same as fixing the old file; the ED item stays
 * open until the old screens are formally retired.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useFeatures } from '../../../../core/hooks/useFeatures';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useCasesheetDetailQuery,
  useCreateCasesheetMutation,
  useUpdateCasesheetMutation,
} from '../../data/repositories/casesheets.repository.impl';
import { isEditable } from '../../data/models/casesheets.dtos';
import type { CasesheetFormData } from '../components/CasesheetForm';
import { CasesheetStatusBadge } from '../components/CasesheetStatusBadge';
import { EmptyCasesheetsState } from '../components/EmptyCasesheetsState';
import { ChiefComplaintSection } from '../components/ChiefComplaintSection';
import { ClinicalNotesSection } from '../components/ClinicalNotesSection';
import { CaseSheetExtensionsSection, CASE_SHEET_EXTENSION_TEMPLATES } from '../components/CaseSheetExtensionsSection';
import { useAppointmentDetailQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { useEpisodeQuery, useEpisodeDetailsQuery } from '../../../episodes/data/repositories/episodes.repository.impl';

export interface CasesheetStandaloneScreenProps {
  clientId: string;
  /** Present → edit mode. Absent → create mode. */
  casesheetId?: string;
  /** Create mode only. */
  appointmentId?: string;
  /** Create mode only. */
  episodeId?: string;
}

const EMPTY_CASESHEET_DATA: CasesheetFormData = { basic: {}, extensions: [] };
const ALL_EXTENSION_TEMPLATE_IDS = CASE_SHEET_EXTENSION_TEMPLATES.map((t) => t.id);

// Shared field-editing core, identical in both modes — local state only, no
// autosave, no context hooks (props in, onChange callbacks out).
const CaseSheetCoreFields: React.FC<{
  data: CasesheetFormData;
  onFieldChange: (field: string, value: string) => void;
  onExtensionFieldChange: (templateId: string, fieldId: string, value: string) => void;
  onAddExtension: (templateId: string) => void;
  onRemoveExtension: (templateId: string) => void;
  disabled: boolean;
}> = ({ data, onFieldChange, onExtensionFieldChange, onAddExtension, onRemoveExtension }) => (
  <>
    <ChiefComplaintSection
      value={data.basic.chief_complaint ?? ''}
      onChange={(value) => onFieldChange('chief_complaint', value)}
      progress="empty"
      saveStatus="idle"
    />
    <ClinicalNotesSection
      data={data.basic}
      onChange={onFieldChange}
      progress="empty"
      saveStatus="idle"
    />
    <CaseSheetExtensionsSection
      title="Additional Clinical Data"
      extensions={data.extensions}
      activeTemplateIds={ALL_EXTENSION_TEMPLATE_IDS}
      allowAddRemove
      onChange={onExtensionFieldChange}
      onAddExtension={onAddExtension}
      onRemoveExtension={onRemoveExtension}
      progress="empty"
      saveStatus="idle"
    />
  </>
);

function useCasesheetDraft(initial: CasesheetFormData = EMPTY_CASESHEET_DATA) {
  const [data, setData] = useState<CasesheetFormData>(initial);

  const onFieldChange = useCallback((field: string, value: string) => {
    setData((prev) => ({ ...prev, basic: { ...prev.basic, [field]: value } }));
  }, []);

  const onExtensionFieldChange = useCallback((templateId: string, fieldId: string, value: string) => {
    setData((prev) => {
      const extensions = prev.extensions ? [...prev.extensions] : [];
      const idx = extensions.findIndex((e) => e.template_id === templateId);
      if (idx >= 0) {
        extensions[idx] = { ...extensions[idx], data: { ...extensions[idx].data, [fieldId]: value } };
      } else {
        extensions.push({ template_id: templateId, data: { [fieldId]: value } });
      }
      return { ...prev, extensions };
    });
  }, []);

  const onAddExtension = useCallback((templateId: string) => {
    setData((prev) => ({
      ...prev,
      extensions: [...(prev.extensions ?? []), { template_id: templateId, data: {} }],
    }));
  }, []);

  const onRemoveExtension = useCallback((templateId: string) => {
    setData((prev) => ({
      ...prev,
      extensions: (prev.extensions ?? []).filter((e) => e.template_id !== templateId),
    }));
  }, []);

  return { data, setData, onFieldChange, onExtensionFieldChange, onAddExtension, onRemoveExtension };
}

export const CasesheetStandaloneScreen: React.FC<CasesheetStandaloneScreenProps> = ({
  clientId,
  casesheetId,
  appointmentId,
  episodeId: episodeIdFromProps,
}) => {
  const router = useRouter();
  const { currentUser } = useAuth();
  const features = useFeatures();
  const tenantId = currentUser?.tenantId || '';
  const isDoctor = currentUser?.roles?.includes('DOCTOR') || false;
  const isEditMode = !!casesheetId;

  return isEditMode ? (
    <EditModeContent tenantId={tenantId} casesheetId={casesheetId!} isDoctor={isDoctor} router={router} />
  ) : (
    <CreateModeContent
      tenantId={tenantId}
      clientId={clientId}
      appointmentId={appointmentId}
      episodeIdFromProps={episodeIdFromProps}
      clinicType={features.clinic_type}
      router={router}
    />
  );
};

// ─────────────────────────────── Edit mode ──────────────────────────────

const EditModeContent: React.FC<{
  tenantId: string;
  casesheetId: string;
  isDoctor: boolean;
  router: ReturnType<typeof useRouter>;
}> = ({ tenantId, casesheetId, isDoctor, router }) => {
  const { data: casesheet, isLoading, isError, error, refetch } = useCasesheetDetailQuery(tenantId, casesheetId);
  const updateMutation = useUpdateCasesheetMutation(tenantId, casesheetId);
  const draft = useCasesheetDraft();

  useEffect(() => {
    if (!casesheet) return;
    draft.setData({
      basic: {
        chief_complaint: casesheet.chief_complaint || '',
        provisional_diagnosis: casesheet.provisional_diagnosis || '',
        final_diagnosis: casesheet.final_diagnosis || '',
        ...casesheet.data_json?.basic,
      },
      extensions: casesheet.data_json?.extensions || [],
    });
    // Only re-sync when a different casesheet loads — not on every draft edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casesheet?.id]);

  const handleSubmit = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({ data_json: draft.data });
      Alert.alert('Success', 'Casesheet updated successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update casesheet.';
      if (errorMessage.includes('DOCTOR')) {
        Alert.alert('Permission Denied', 'Only doctors can edit signed casesheets.');
      } else if (errorMessage.includes('FINAL')) {
        Alert.alert('Cannot Edit', 'Final casesheets cannot be edited.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  }, [updateMutation, draft.data, router]);

  const handleCancel = useCallback(() => {
    Alert.alert('Discard Changes', 'Are you sure you want to discard your changes?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="standalone-casesheet-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Edit Casesheet</Text>
        <Text style={styles.headerSubtitle}>v{casesheet?.document_version || 1}</Text>
      </View>
      {casesheet && <CasesheetStatusBadge status={casesheet.status} size="medium" />}
    </View>
  );

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading casesheet...</Text>
      </View>
    );
  } else if (isError || !casesheet) {
    content = (
      <EmptyCasesheetsState
        variant="error"
        title="Unable to Load Casesheet"
        message={
          error?.message?.includes('401')
            ? 'Authentication failed. Please try logging in again.'
            : 'Could not load this casesheet. Please try again.'
        }
        actionLabel="Retry"
        onActionPress={() => refetch()}
      />
    );
  } else {
    const canEdit = isEditable(casesheet.status) || (casesheet.status === 'SIGNED' && isDoctor);
    if (!canEdit) {
      content = (
        <EmptyCasesheetsState
          variant="error"
          title="Cannot Edit Casesheet"
          message={
            casesheet.status === 'FINAL'
              ? 'Final casesheets cannot be edited. They can only be transitioned to Signed.'
              : 'Only doctors can edit signed casesheets.'
          }
          actionLabel="Go Back"
          onActionPress={() => router.back()}
        />
      );
    } else {
      content = (
        <ScrollView contentContainerStyle={styles.scrollContent} testID="standalone-casesheet-form">
          <CaseSheetCoreFields
            data={draft.data}
            onFieldChange={draft.onFieldChange}
            onExtensionFieldChange={draft.onExtensionFieldChange}
            onAddExtension={draft.onAddExtension}
            onRemoveExtension={draft.onRemoveExtension}
            disabled={false}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
            onPress={handleSubmit}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            testID="standalone-casesheet-submit"
          >
            <Text style={[typography.button, { color: colors.common.white }]}>Update Casesheet</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
};

// ────────────────────────────── Create mode ─────────────────────────────

const CreateModeContent: React.FC<{
  tenantId: string;
  clientId: string;
  appointmentId?: string;
  episodeIdFromProps?: string;
  clinicType: string;
  router: ReturnType<typeof useRouter>;
}> = ({ tenantId, clientId, appointmentId, episodeIdFromProps, clinicType, router }) => {
  const createMutation = useCreateCasesheetMutation(tenantId, clientId);
  const draft = useCasesheetDraft();

  const { data: appointment } = useAppointmentDetailQuery(tenantId, appointmentId || '', { enabled: !!appointmentId });
  const episodeId = episodeIdFromProps || appointment?.episode_id || undefined;
  const { data: episode } = useEpisodeQuery(tenantId, episodeId || '', { enabled: !!episodeId });

  // Guard against creating a duplicate casesheet — identical to
  // CreateCasesheetScreen's own existing guard (T-0.2, confirmed
  // equivalent, not a gap): an episode may only have one casesheet.
  const { data: episodeDetailsForGuard, isLoading: isCheckingExistingCasesheet } = useEpisodeDetailsQuery(
    tenantId,
    episodeId || '',
    { enabled: !!episodeId && !!tenantId },
  );
  const existingCasesheetId = episodeDetailsForGuard?.documents?.casesheet?.exists
    ? episodeDetailsForGuard.documents.casesheet.id
    : null;

  useEffect(() => {
    if (existingCasesheetId && clientId) {
      router.replace(`/clinic-admin/clients/${clientId}/casesheets/${existingCasesheetId}` as any);
    }
  }, [existingCasesheetId, clientId, router]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await createMutation.mutateAsync({
        clinic_type: clinicType as any,
        data_json: draft.data,
        appointment_id: appointmentId,
        episode_id: episodeId,
      });

      if (result?.id) {
        router.replace(`/clinic-admin/clients/${clientId}/casesheets/${result.id}` as any);
      } else if (episodeId) {
        router.replace(`/clinic-admin/episodes/${episodeId}` as any);
      } else {
        router.replace({ pathname: '/clinic-admin/clients/[clientId]/casesheets', params: { clientId } });
      }
    } catch (err: any) {
      if (err.error_code === 'EPISODE_MISMATCH' || err.message?.includes('episode_id must match')) {
        Alert.alert('Episode Mismatch', 'Document episode must match appointment episode. Please try again.', [
          { text: 'OK' },
        ]);
      } else if (err.error_code === 'EPISODE_ALREADY_HAS_CASESHEET' || err.message?.includes('already has a casesheet')) {
        Alert.alert('Duplicate Casesheet', 'This episode already has a casesheet. Only one casesheet per episode is allowed.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', err.message || 'Failed to create casesheet.');
      }
    }
  }, [createMutation, clientId, appointmentId, episodeId, clinicType, draft.data, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="standalone-casesheet-create-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>New Casesheet</Text>
        {episode ? (
          <View style={styles.episodeContext}>
            <Ionicons name="folder-outline" size={14} color={colors.primary.main} />
            <Text style={styles.episodeContextText}>Episode: {episode.title}</Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>Create a new clinical record</Text>
        )}
      </View>
    </View>
  );

  const isBlockedByExistingCasesheet = !!episodeId && (isCheckingExistingCasesheet || !!existingCasesheetId);

  if (isBlockedByExistingCasesheet) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={[styles.content, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} testID="standalone-casesheet-form">
          <CaseSheetCoreFields
            data={draft.data}
            onFieldChange={draft.onFieldChange}
            onExtensionFieldChange={draft.onExtensionFieldChange}
            onAddExtension={draft.onAddExtension}
            onRemoveExtension={draft.onRemoveExtension}
            disabled={false}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            accessibilityRole="button"
            testID="standalone-casesheet-submit"
          >
            <Text style={[typography.button, { color: colors.common.white }]}>Create Casesheet</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h5, color: colors.text.primary },
  headerSubtitle: { ...typography.caption, color: colors.text.secondary },
  episodeContext: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  episodeContextText: { ...typography.caption, color: colors.primary.main, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  centerContent: { alignItems: 'center', justifyContent: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { ...typography.body2, color: colors.text.secondary, marginTop: spacing.md },
  submitButton: { minHeight: 48, borderRadius: spacing.sm, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
});

export default CasesheetStandaloneScreen;
