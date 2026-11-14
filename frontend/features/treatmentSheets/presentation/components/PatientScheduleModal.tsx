/**
 * PatientScheduleModal — Phase 1
 *
 * Shows a formatted schedule of all scheduled rows from a TreatmentOrderResponse.
 * Uses getScheduledRows() helper (rows with scheduled_date, sorted ASC).
 * Actions: Copy to clipboard.
 *
 * Shown when state === 'SCHEDULED' && scheduling_status === 'FULLY_SCHEDULED'.
 * No additional API call — uses rows already in cache.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  TreatmentOrderResponse,
  getScheduledRows,
} from '../../data/models/treatmentOrders.dtos';

// ============================================
// HELPERS
// ============================================

/** Format "YYYY-MM-DD" → "22 Mar" */
const formatScheduleDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

/** Format "HH:MM:SS" → "10:00 AM" */
const formatScheduleTime = (timeStr: string | null): string => {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
};

// ============================================
// PROPS
// ============================================

interface PatientScheduleModalProps {
  visible: boolean;
  order: TreatmentOrderResponse;
  onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const PatientScheduleModal: React.FC<PatientScheduleModalProps> = ({
  visible,
  order,
  onClose,
}) => {
  const scheduledRows = useMemo(() => getScheduledRows(order), [order]);

  /** Plain-text schedule for clipboard */
  const scheduleText = useMemo(() => {
    const lines = scheduledRows.map((row) => {
      const date = formatScheduleDate(row.scheduled_date!);
      const time = formatScheduleTime(row.scheduled_time);
      const treatment = row.treatment_name ?? 'Treatment';
      return `${date}${time ? ` – ${time}` : ''} – ${treatment}`;
    });
    return `Your therapy schedule:\n${lines.join('\n')}`;
  }, [scheduledRows]);

  const handleCopy = useCallback(() => {
    Clipboard.setString(scheduleText);
    Alert.alert('Copied', 'Schedule copied to clipboard.');
  }, [scheduleText]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Patient Schedule</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Schedule rows */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {scheduledRows.length === 0 ? (
              <Text style={styles.emptyText}>No scheduled sessions found.</Text>
            ) : (
              scheduledRows.map((row, i) => (
                <View key={row.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowDay}>Day {row.day_number}</Text>
                    <Text style={styles.rowDate}>{formatScheduleDate(row.scheduled_date!)}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    {!!row.scheduled_time && (
                      <Text style={styles.rowTime}>{formatScheduleTime(row.scheduled_time)}</Text>
                    )}
                    {!!row.treatment_name && (
                      <Text style={styles.rowTreatment} numberOfLines={1}>
                        {row.treatment_name}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Copy schedule to clipboard"
            >
              <Ionicons name="copy-outline" size={18} color={colors.common.white} />
              <Text style={styles.copyBtnText}>Copy Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    ...typography.h6,
    color: colors.text.primary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowDay: {
    ...typography.caption,
    color: colors.text.secondary,
    minWidth: 40,
  },
  rowDate: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowTime: {
    ...typography.body2,
    color: colors.primary.main,
    fontWeight: '600',
  },
  rowTreatment: {
    ...typography.caption,
    color: colors.text.secondary,
    maxWidth: 160,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    borderRadius: 10,
    paddingVertical: spacing.md,
  },
  copyBtnText: {
    ...typography.button,
    color: colors.common.white,
  },
});

export default PatientScheduleModal;
