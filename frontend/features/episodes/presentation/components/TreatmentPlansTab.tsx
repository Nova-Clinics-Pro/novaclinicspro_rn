/**
 * TreatmentPlansTab
 *
 * Single responsibility: render the Treatment Plans tab panel.
 * CTA logic uses treatment order execution state, not only sheet.status.
 * The documentation lifecycle can remain DRAFT after a plan has already been
 * sent to scheduling, so scheduling actions must read the backend order state.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import {
  TreatmentSheetResponse,
  getStatusLabel,
  getStatusColor,
} from '../../../treatmentSheets/data/models/treatmentSheets.dtos';
import {
  useSendToSchedulingMutation,
  useTreatmentOrderQuery,
} from '../../../treatmentSheets/data/repositories/treatmentOrders.repository.impl';
import {
  getLifecycleStatusColor,
  getLifecycleStatusLabel,
} from '../../../treatmentSheets/data/models/treatmentOrders.dtos';
import { useCreateTreatmentSheetMutation } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { treatmentErrorMessage } from '../../../treatmentSheets/application/treatmentErrorPresentation';
import {
  SectionSkeleton,
  SectionError,
  useCtaStyles,
  StatusChip,
  cardStyles,
  formatDisplayDate,
} from './EpisodeWorkspaceShared';

// ─── Duration options ─────────────────────────────────────────────────────────

const DURATION_OPTIONS = [7, 14, 21, 30, 45, 60];

// ─── CreateTreatmentSheetModal ────────────────────────────────────────────────

interface CreateModalProps {
  visible: boolean;
  casesheetId: string;
  onClose: () => void;
  onCreated: (sheetId: string) => void;
}

const CreateTreatmentSheetModal: React.FC<CreateModalProps> = ({
  visible,
  casesheetId,
  onClose,
  onCreated,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const [selectedDays, setSelectedDays] = useState(14);
  const [customDays, setCustomDays] = useState('');
  const createMutation = useCreateTreatmentSheetMutation(casesheetId);

  const handleCreate = async () => {
    const days = customDays ? parseInt(customDays, 10) : selectedDays;
    if (!days || days < 1) {
      Alert.alert('Error', 'Please select a valid duration.');
      return;
    }
    try {
      const result = await createMutation.mutateAsync({ duration_days: days });
      onClose();
      onCreated(result.id);
    } catch (error: unknown) {
      Alert.alert('Error', treatmentErrorMessage(error, 'Failed to create treatment sheet.'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.background.elevated, borderRadius: spacing.md, padding: spacing.lg },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[typography.h6, { color: colors.text.primary, flex: 1 }]}>
              Create Treatment Sheet
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={[typography.body2, { color: colors.text.secondary, marginBottom: spacing.sm }]}>
            Select treatment duration
          </Text>

          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((d) => {
              const active = d === selectedDays && !customDays;
              return (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    {
                      borderColor: active ? colors.primary.default : colors.border.default,
                      backgroundColor: active ? colors.primary.default + '18' : 'transparent',
                      borderRadius: spacing.xs,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                  onPress={() => { setSelectedDays(d); setCustomDays(''); }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? colors.primary.default : colors.text.secondary, fontWeight: active ? '700' : '400' },
                    ]}
                  >
                    {d} Days
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[
              styles.customInput,
              {
                borderColor: colors.border.default,
                borderRadius: spacing.xs,
                color: colors.text.primary,
                padding: spacing.sm,
                marginTop: spacing.sm,
              },
            ]}
            placeholder="Or enter custom days (e.g. 90)"
            placeholderTextColor={colors.text.disabled}
            keyboardType="number-pad"
            maxLength={3}
            value={customDays}
            onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, ''))}
          />

          <View style={[styles.modalActions, { marginTop: spacing.md, gap: spacing.sm }]}>
            <TouchableOpacity
              style={[styles.modalBtn, { borderColor: colors.border.default, borderRadius: spacing.xs }]}
              onPress={onClose}
            >
              <Text style={[typography.body2, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary.default, borderRadius: spacing.xs }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              <Text style={[typography.body2, { color: colors.primary.onPrimary, fontWeight: '600' }]}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── TreatmentSheetCard ───────────────────────────────────────────────────────

interface TreatmentSheetCardProps {
  sheet: TreatmentSheetResponse;
  tenantId: string;
  canSchedule: boolean;
  onOpen: (id: string) => void;
  onSchedule: (id: string) => void;
  onRefresh: () => void;
}

const TreatmentSheetCard: React.FC<TreatmentSheetCardProps> = ({
  sheet,
  tenantId,
  canSchedule,
  onOpen,
  onSchedule,
  onRefresh,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const cta = useCtaStyles();

  const sendToScheduling = useSendToSchedulingMutation(tenantId);
  const {
    data: treatmentOrder,
    isFetched: isTreatmentOrderFetched,
    isError: isTreatmentOrderError,
    refetch: refetchTreatmentOrder,
  } = useTreatmentOrderQuery(sheet.id, tenantId, {
    enabled: !!tenantId && !!sheet.id,
    retry: false,
  });
  const [sentSuccessfully, setSentSuccessfully] = useState(false);

  const orderState = treatmentOrder?.state;
  const hasOrderState = isTreatmentOrderFetched && !isTreatmentOrderError && !!treatmentOrder;
  const isSentToScheduling = !!treatmentOrder?.is_order && orderState !== 'DRAFT';
  // Phase 4 (R4) · T-E.1 (ADR-R4-02) — once an order exists, its display
  // status is the backend's own lifecycle_status_label (T-C.2), never
  // re-derived from raw state here. Before any order exists (no execution
  // lifecycle has started yet), the document's own DRAFT/FINAL/SIGNED
  // status remains a legitimate, separate fallback -- this is the
  // documentation lifecycle, not a re-derivation of the execution one.
  const displayStatusColor = hasOrderState
    ? getLifecycleStatusColor(treatmentOrder?.lifecycle_status, treatmentOrder?.lifecycle_status_unresolved)
    : getStatusColor(sheet.status);
  const displayStatusLabel = hasOrderState
    ? getLifecycleStatusLabel(treatmentOrder?.lifecycle_status_label, treatmentOrder?.lifecycle_status_unresolved)
    : getStatusLabel(sheet.status);

  const handleSendToScheduling = () => {
    sendToScheduling.mutate({ sheetId: sheet.id, version: sheet.version ?? 1 });
  };

  React.useEffect(() => {
    if (sendToScheduling.status === 'conflict') {
      Alert.alert(
        'Plan Updated',
        sendToScheduling.errorMessage ?? 'This plan was updated elsewhere. Please review and try again.',
        [{ text: 'OK', onPress: () => { sendToScheduling.reset(); onRefresh(); } }]
      );
    } else if (sendToScheduling.status === 'error') {
      Alert.alert('Error', sendToScheduling.errorMessage ?? 'Failed to send to scheduling.');
      sendToScheduling.reset();
    } else if (sendToScheduling.status === 'success') {
      setSentSuccessfully(true);
      sendToScheduling.reset();
      refetchTreatmentOrder();
      onRefresh();
    }
  }, [sendToScheduling.status]);

  const isSending = sendToScheduling.status === 'sending';
  const showSendButton = hasOrderState && sheet.status === 'DRAFT' && !isSentToScheduling && !sentSuccessfully && !canSchedule;
  const showScheduleButton = hasOrderState && canSchedule && isSentToScheduling && ['ORDERED', 'SCHEDULED', 'IN_PROGRESS'].includes(orderState ?? '');
  const isTerminal = ['COMPLETED', 'SIGNED', 'FINAL', 'CANCELLED'].includes(sheet.status) || orderState === 'COMPLETED' || orderState === 'CANCELLED';

  const renderCta = () => (
    <View style={{ gap: 8 }}>
      {/* Primary: always open the sheet */}
      <TouchableOpacity
        style={[cta.primaryCta, { backgroundColor: colors.primary.default }]}
        onPress={() => onOpen(sheet.id)}
        accessibilityRole="button"
      >
        <Ionicons name="document-text-outline" size={16} color={colors.primary.onPrimary} />
        <Text style={[cta.primaryCtaText, { color: colors.primary.onPrimary }]}>
          {isTerminal
            ? t('episodeWorkspace.treatmentPlans.viewCompleted')
            : t('episodeWorkspace.treatmentPlans.openActivePlan')}
        </Text>
      </TouchableOpacity>

      {/* Admin: Schedule Plan / View Schedule */}
      {showScheduleButton && (
        <TouchableOpacity
          style={[cta.primaryCta, { backgroundColor: colors.feedback.info }]}
          onPress={() => onSchedule(sheet.id)}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-number-outline" size={16} color={colors.text.inverse} />
          <Text style={[cta.primaryCtaText, { color: colors.text.inverse }]}>
            {orderState === 'ORDERED'
              ? t('episodeWorkspace.treatmentPlans.schedulePlan')
              : t('episodeWorkspace.treatmentPlans.viewSchedule')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Doctor: Send to Scheduling (DRAFT only, hidden once sent) */}
      {showSendButton && (
        <TouchableOpacity
          style={[
            cta.secondaryCta,
            {
              borderColor: isSending ? colors.border.subtle : colors.feedback.info,
              opacity: isSending ? 0.6 : 1,
            },
          ]}
          onPress={handleSendToScheduling}
          disabled={isSending}
          accessibilityRole="button"
        >
          <Ionicons name="send-outline" size={16} color={isSending ? colors.text.secondary : colors.feedback.info} />
          <Text style={[cta.secondaryCtaText, { color: isSending ? colors.text.secondary : colors.feedback.info }]}>
            {isSending ? 'Sending…' : t('episodeWorkspace.treatmentPlans.sendToScheduling')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View
      style={[
        cardStyles.docCard,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
          borderRadius: spacing.sm,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <View style={cardStyles.cardHeader}>
        <Ionicons name="calendar" size={18} color={displayStatusColor} />
        <Text style={[typography.subtitle1, { color: colors.text.primary, flex: 1 }]}>
          {sheet.duration_days
            ? t('episodeWorkspace.treatmentPlans.sessions', { count: sheet.duration_days })
            : t('episodeWorkspace.treatmentPlans.title')}
        </Text>
        <StatusChip label={displayStatusLabel} color={displayStatusColor} />
      </View>

      <Text style={[typography.caption, { color: colors.text.tertiary }]}>
        {formatDisplayDate(sheet.recorded_at)}
      </Text>

      {renderCta()}
    </View>
  );
};

// ─── TreatmentPlansTab ────────────────────────────────────────────────────────

interface TreatmentPlansTabProps {
  sheet: TreatmentSheetResponse | undefined;
  sheets?: TreatmentSheetResponse[];
  hasTreatmentSheet: boolean;
  isLoading: boolean;
  isError: boolean;
  canCreate: boolean;
  canSchedule: boolean;
  tenantId: string;
  casesheetId: string | null;
  onRetry: () => void;
  onOpenSheet: (id: string) => void;
  onScheduleSheet: (id: string) => void;
  onSheetCreated: (sheetId: string) => void;
  onRefreshSheet: () => void;
}

export const TreatmentPlansTab: React.FC<TreatmentPlansTabProps> = ({
  sheet,
  sheets = [],
  hasTreatmentSheet,
  isLoading,
  isError,
  canCreate,
  canSchedule,
  tenantId,
  casesheetId,
  onRetry,
  onOpenSheet,
  onScheduleSheet,
  onSheetCreated,
  onRefreshSheet,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const cta = useCtaStyles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const visibleSheets = sheets.length > 0 ? sheets : sheet ? [sheet] : [];

  if (isLoading) return <SectionSkeleton />;
  if (isError)
    return (
      <SectionError
        message={t('errors.episodeWorkspace.treatmentSheetsLoadFailed')}
        onRetry={onRetry}
      />
    );

  return (
    <>
      {casesheetId && (
        <CreateTreatmentSheetModal
          visible={showCreateModal}
          casesheetId={casesheetId}
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => { onSheetCreated(id); }}
        />
      )}

      {visibleSheets.length === 0 ? (
        <View
          style={[
            cardStyles.emptySection,
            { paddingVertical: spacing.xxl, gap: spacing.md, paddingHorizontal: spacing.md },
          ]}
        >
          <Ionicons name="calendar-outline" size={40} color={colors.text.disabled} />
          <Text
            style={[typography.body2, { color: colors.text.secondary, textAlign: 'center', maxWidth: 260 }]}
          >
            {t('episodeWorkspace.treatmentPlans.empty')}
          </Text>
          {canCreate && casesheetId && (
            <TouchableOpacity
              style={[cta.primaryCta, { backgroundColor: colors.primary.default }]}
              onPress={() => setShowCreateModal(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary.onPrimary} />
              <Text style={[cta.primaryCtaText, { color: colors.primary.onPrimary }]}>
                {t('episodeWorkspace.treatmentPlans.createPlan')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ gap: spacing.md, padding: spacing.md }}>
          {visibleSheets.map((item) => (
            <TreatmentSheetCard
              key={item.id}
              sheet={item}
              tenantId={tenantId}
              canSchedule={canSchedule}
              onOpen={onOpenSheet}
              onSchedule={onScheduleSheet}
              onRefresh={onRefreshSheet}
            />
          ))}
          {canCreate && casesheetId && (
            <TouchableOpacity
              style={[cta.secondaryCta, { borderColor: colors.primary.default, marginTop: spacing.xs }]}
              onPress={() => setShowCreateModal(true)}
              accessibilityRole="button"
            >
              <Ionicons name="add-outline" size={16} color={colors.primary.default} />
              <Text style={[cta.secondaryCtaText, { color: colors.primary.default }]}>
                {t('episodeWorkspace.treatmentPlans.createPlan')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  customInput: {
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
