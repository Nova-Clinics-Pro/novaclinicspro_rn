/**
 * KPI Period Selector Component
 * Reusable period selector for dashboards with custom date range support
 */

import { DateField } from '../../../../core/components/DateField';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import type { KPIPeriodType } from '../../data/models/doctorKpis.dtos';
import { validateCustomDateRange } from '../../data/models/doctorKpis.dtos';

interface KpiPeriodSelectorProps {
  value: KPIPeriodType;
  customFromDate?: string;
  customToDate?: string;
  onChange: (period: KPIPeriodType, fromDate?: string, toDate?: string) => void;
  disabled?: boolean;
  testID?: string;
}

const PERIOD_OPTIONS: { value: KPIPeriodType; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'custom', label: 'Custom' },
];

export const KpiPeriodSelector: React.FC<KpiPeriodSelectorProps> = ({
  value,
  customFromDate,
  customToDate,
  onChange,
  disabled = false,
  testID,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [fromDate, setFromDate] = useState(customFromDate || '');
  const [toDate, setToDate] = useState(customToDate || '');
  const [dateError, setDateError] = useState<string | null>(null);

  const handlePeriodSelect = useCallback(
    (period: KPIPeriodType) => {
      if (period === 'custom') {
        // Reset dates when opening modal
        setFromDate(customFromDate || '');
        setToDate(customToDate || '');
        setDateError(null);
        setShowCustomModal(true);
      } else {
        onChange(period);
      }
    },
    [customFromDate, customToDate, onChange]
  );

  const handleCustomSubmit = useCallback(() => {
    const validation = validateCustomDateRange(fromDate, toDate);
    if (!validation.valid) {
      setDateError(validation.error || 'Invalid date range');
      return;
    }
    setDateError(null);
    setShowCustomModal(false);
    onChange('custom', fromDate, toDate);
  }, [fromDate, toDate, onChange]);

  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.segmentContainer}>
        {PERIOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              value === option.value && styles.segmentActive,
              disabled && styles.segmentDisabled,
            ]}
            onPress={() => handlePeriodSelect(option.value)}
            disabled={disabled}
            testID={`${testID}-${option.value}`}
          >
            <Text
              style={[
                styles.segmentText,
                value === option.value && styles.segmentTextActive,
                disabled && styles.segmentTextDisabled,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Show custom date range if selected */}
      {!!(value === 'custom' && customFromDate && customToDate) && (
        <TouchableOpacity
          style={styles.customDateDisplay}
          onPress={() => setShowCustomModal(true)}
          disabled={disabled}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.primary.main} />
          <Text style={styles.customDateText}>
            {formatDateForDisplay(customFromDate)} - {formatDateForDisplay(customToDate)}
          </Text>
          <Ionicons name="pencil" size={12} color={colors.primary.main} />
        </TouchableOpacity>
      )}

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <TouchableOpacity
                onPress={() => setShowCustomModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <DateField value={fromDate} onChange={setFromDate} testID={`${testID}-from-date`} />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <DateField value={toDate} onChange={setToDate} testID={`${testID}-to-date`} />
            </View>

            {!!dateError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error.main} />
                <Text style={styles.errorText}>{dateError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleCustomSubmit}
                testID={`${testID}-apply`}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.grey[100],
    borderRadius: 8,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.background.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  segmentTextDisabled: {
    color: colors.text.disabled,
  },
  customDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: 6,
  },
  customDateText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  modalClose: {
    padding: spacing.xs,
  },
  dateInputContainer: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  dateInput: {
    backgroundColor: colors.grey[100],
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error[50],
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
  },
  applyButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
});

export default KpiPeriodSelector;
