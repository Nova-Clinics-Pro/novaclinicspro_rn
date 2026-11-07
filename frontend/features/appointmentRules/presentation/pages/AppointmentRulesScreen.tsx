/**
 * Appointment Rules Screen
 * Configure scheduling rules and constraints
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useAppointmentRulesListQuery,
  useUpsertAppointmentRuleMutation,
  useDeleteAppointmentRuleOverrideMutation,
} from '../../data/repositories/appointmentRules.repository.impl';
import {
  AppointmentRuleResponse,
  RuleCode,
  RULE_METADATA,
} from '../../data/models/appointmentRules.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import type { SemanticColors } from '../../../../core/theme/semanticColors';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';

// ============================================
// RULE CARD COMPONENT
// ============================================

interface RuleCardProps {
  rule: AppointmentRuleResponse;
  onEdit: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit }) => {
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const metadata = RULE_METADATA[rule.rule_code];
  if (!metadata) return null;

  const isOverridden = rule.is_override_active && rule.tenant_override_config;
  const effectiveValue = rule.effective_config?.value ?? rule.org_default_config?.value;

  const formatValue = () => {
    if (metadata.valueType === 'boolean') {
      return effectiveValue ? 'Enabled' : 'Disabled';
    }
    if (metadata.valueType === 'number') {
      return `${effectiveValue}${metadata.unit ? ` ${metadata.unit}` : ''}`;
    }
    return 'Custom';
  };

  return (
    <TouchableOpacity
      style={[styles.ruleCard, isOverridden && styles.ruleCardOverridden]}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={[styles.ruleIcon, { backgroundColor: metadata.color + '15' }]}>
        <Ionicons name={metadata.icon as any} size={24} color={metadata.color} />
      </View>
      <View style={styles.ruleInfo}>
        <View style={styles.ruleHeader}>
          <Text style={styles.ruleName}>{metadata.label}</Text>
          {isOverridden && (
            <View style={styles.overrideBadge}>
              <Text style={styles.overrideBadgeText}>Custom</Text>
            </View>
          )}
        </View>
        <Text style={styles.ruleDescription} numberOfLines={1}>
          {metadata.description}
        </Text>
        <Text style={[styles.ruleValue, { color: metadata.color }]}>{formatValue()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

// ============================================
// EDIT MODAL COMPONENT
// ============================================

interface EditModalProps {
  visible: boolean;
  rule: AppointmentRuleResponse | null;
  onClose: () => void;
  onSave: (ruleCode: string, value: any) => Promise<void>;
  onReset: (ruleCode: string) => Promise<void>;
  isSaving: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  rule,
  onClose,
  onSave,
  onReset,
  isSaving,
}) => {
  const { t } = useTranslation();
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const metadata = rule ? RULE_METADATA[rule.rule_code] : null;
  const [value, setValue] = useState<any>(null);

  // Reset value when modal opens with new rule
  React.useEffect(() => {
    if (visible && rule) {
      const effectiveValue = rule.effective_config?.value ?? rule.org_default_config?.value;
      setValue(effectiveValue);
    }
  }, [visible, rule]);

  if (!rule || !metadata) return null;

  const hasOverride = rule.is_override_active && rule.tenant_override_config;
  const defaultValue = rule.org_default_config?.value;

  const handleSave = async () => {
    await onSave(rule.rule_code, value);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Default',
      `This will remove your custom setting and use the organization default (${defaultValue}${metadata.unit ? ` ${metadata.unit}` : ''}).`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => onReset(rule.rule_code),
        },
      ]
    );
  };

  const renderValueInput = () => {
    switch (metadata.valueType) {
      case 'boolean':
        return (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{value ? 'Enabled' : 'Disabled'}</Text>
            <Switch
              value={value}
              onValueChange={setValue}
              trackColor={{ false: '#E5E7EB', true: metadata.color + '50' }}
              thumbColor={value ? metadata.color : '#9CA3AF'}
            />
          </View>
        );

      case 'number':
        return (
          <View style={styles.numberInputContainer}>
            <TextInput
              style={styles.numberInput}
              value={String(value ?? '')}
              onChangeText={(text) => setValue(parseInt(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
            />
            {metadata.unit && <Text style={styles.unitLabel}>{metadata.unit}</Text>}
          </View>
        );

      case 'object':
        return (
          <View style={styles.objectInputContainer}>
            <Text style={styles.objectInputLabel}>Advanced configuration</Text>
            <Text style={styles.objectInputHint}>
              Contact support to customize complex rules
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: metadata.color + '15' }]}>
              <Ionicons name={metadata.icon as any} size={24} color={metadata.color} />
            </View>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>{metadata.label}</Text>
              <Text style={styles.modalSubtitle}>{metadata.description}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Default Value Info */}
            <View style={styles.defaultValueBox}>
              <Ionicons name="information-circle" size={18} color="#6B7280" />
              <Text style={styles.defaultValueText}>
                Organization default:{' '}
                <Text style={styles.defaultValueHighlight}>
                  {metadata.valueType === 'boolean'
                    ? defaultValue
                      ? 'Enabled'
                      : 'Disabled'
                    : `${defaultValue}${metadata.unit ? ` ${metadata.unit}` : ''}`}
                </Text>
              </Text>
            </View>

            {/* Value Input */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Your Setting</Text>
              {renderValueInput()}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {hasOverride && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                disabled={isSaving}
              >
                <Ionicons name="refresh" size={18} color="#6B7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving || metadata.valueType === 'object'}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.text.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const AppointmentRulesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [editingRule, setEditingRule] = useState<AppointmentRuleResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Query rules
  const rulesQuery = useAppointmentRulesListQuery(tenantId, {
    enabled: !!tenantId,
  });

  const upsertMutation = useUpsertAppointmentRuleMutation(tenantId);
  const deleteMutation = useDeleteAppointmentRuleOverrideMutation(tenantId);

  const handleRefresh = useCallback(() => {
    rulesQuery.refetch();
  }, [rulesQuery]);

  const handleEditRule = useCallback((rule: AppointmentRuleResponse) => {
    setEditingRule(rule);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingRule(null);
  }, []);

  const handleSave = useCallback(
    async (ruleCode: string, value: any) => {
      try {
        await upsertMutation.mutateAsync({
          ruleCode,
          data: {
            override_config: { value },
            is_override_active: true,
          },
        });
        Alert.alert(t('common.success'), 'Rule updated successfully');
        handleCloseModal();
      } catch (error: any) {
        console.error('Save error:', error);
        Alert.alert(t('common.error'), error?.message || 'Failed to save rule');
      }
    },
    [upsertMutation, handleCloseModal, t]
  );

  const handleReset = useCallback(
    async (ruleCode: string) => {
      try {
        await deleteMutation.mutateAsync(ruleCode);
        Alert.alert(t('common.success'), 'Rule reset to default');
        handleCloseModal();
      } catch (error: any) {
        console.error('Reset error:', error);
        Alert.alert(t('common.error'), error?.message || 'Failed to reset rule');
      }
    },
    [deleteMutation, handleCloseModal, t]
  );

  // Count custom rules
  const customRulesCount =
    rulesQuery.data?.items.filter((r) => r.is_override_active && r.tenant_override_config).length ||
    0;

  // Group rules by category
  const timeRules =
    rulesQuery.data?.items.filter((r) =>
      ['slot_duration', 'buffer_time', 'cancellation_window_hours', 'reschedule_window_hours'].includes(
        r.rule_code
      )
    ) || [];

  const bookingRules =
    rulesQuery.data?.items.filter((r) =>
      ['max_advance_booking_days', 'min_advance_booking_hours', 'overbooking_limit'].includes(
        r.rule_code
      )
    ) || [];

  const assignmentRules =
    rulesQuery.data?.items.filter((r) =>
      ['gender_matching', 'therapist_assignment', 'room_assignment'].includes(r.rule_code)
    ) || [];

  // No tenant context
  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Appointment Rules"
          subtitle="Configure scheduling"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No clinic context available</Text>
          <Text style={styles.errorSubtext}>Please select a clinic first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Appointment Rules"
        subtitle={`${customRulesCount} custom rules`}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={rulesQuery.isRefetching}
            onRefresh={handleRefresh}
            colors={['#2F6F4E']}
            tintColor="#2F6F4E"
          />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="bulb-outline" size={20} color="#C28A4B" />
          <Text style={styles.infoBannerText}>
            Customize scheduling rules for your clinic. Changes override organization defaults.
          </Text>
        </View>

        {rulesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F6F4E" />
            <Text style={styles.loadingText}>Loading rules...</Text>
          </View>
        ) : rulesQuery.isError ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={24} color="#EF4444" />
            <Text style={styles.errorBoxText}>Failed to load rules</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : rulesQuery.data?.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Rules Configured</Text>
            <Text style={styles.emptyStateText}>
              Appointment rules will appear here once your organization configures them.
            </Text>
          </View>
        ) : (
          <>
            {/* Time & Duration Rules */}
            {timeRules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time & Duration</Text>
                {timeRules.map((rule) => (
                  <RuleCard key={rule.rule_code} rule={rule} onEdit={() => handleEditRule(rule)} />
                ))}
              </View>
            )}

            {/* Booking Rules */}
            {bookingRules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booking Constraints</Text>
                {bookingRules.map((rule) => (
                  <RuleCard key={rule.rule_code} rule={rule} onEdit={() => handleEditRule(rule)} />
                ))}
              </View>
            )}

            {/* Assignment Rules */}
            {assignmentRules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assignment & Matching</Text>
                {assignmentRules.map((rule) => (
                  <RuleCard key={rule.rule_code} rule={rule} onEdit={() => handleEditRule(rule)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <EditModal
        visible={modalVisible}
        rule={editingRule}
        onClose={handleCloseModal}
        onSave={handleSave}
        onReset={handleReset}
        isSaving={upsertMutation.isPending || deleteMutation.isPending}
      />
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  errorSubtext: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    ...typography.body2,
    color: '#92400E',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  ruleCard: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ruleCardOverridden: {
    borderColor: '#2F6F4E',
    borderWidth: 2,
  },
  ruleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ruleName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  overrideBadge: {
    backgroundColor: '#2F6F4E15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overrideBadgeText: {
    ...typography.caption,
    color: '#2F6F4E',
    fontWeight: '600',
  },
  ruleDescription: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
  },
  ruleValue: {
    ...typography.body2,
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  errorBoxText: {
    ...typography.body2,
    color: '#991B1B',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  emptyStateText: {
    ...typography.body2,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface.elevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: spacing.sm,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    ...typography.h6,
    color: '#1F2937',
  },
  modalSubtitle: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.md,
  },
  defaultValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  defaultValueText: {
    ...typography.caption,
    color: '#6B7280',
  },
  defaultValueHighlight: {
    fontWeight: '600',
    color: '#1F2937',
  },
  formSection: {
    marginTop: spacing.lg,
  },
  formSectionTitle: {
    ...typography.body2,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 12,
  },
  toggleLabel: {
    ...typography.body1,
    color: '#1F2937',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.h5,
    color: '#1F2937',
    textAlign: 'center',
  },
  unitLabel: {
    ...typography.body1,
    color: '#6B7280',
  },
  objectInputContainer: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 12,
  },
  objectInputLabel: {
    ...typography.body1,
    color: '#1F2937',
  },
  objectInputHint: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: spacing.sm,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  resetButtonText: {
    ...typography.body2,
    color: '#6B7280',
  },
  modalActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    ...typography.body1,
    color: '#6B7280',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#2F6F4E',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body1,
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
});

export default AppointmentRulesScreen;
