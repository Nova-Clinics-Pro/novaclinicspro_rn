import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { spacing } from '../../../../../core/theme/spacing';
import { TreatmentSheetResponse } from '../../../data/models/treatmentSheets.dtos';
import {
  getLifecycleStatusColor,
  getLifecycleStatusLabel,
  TreatmentOrderResponse,
} from '../../../data/models/treatmentOrders.dtos';

interface Props {
  treatmentSheet?: TreatmentSheetResponse;
  /** Phase 4 (R4) · T-F.2b (ADR-R4-03) — the header shows the resolver's own
   * lifecycle_status_label here, never TreatmentSheet.status (DRAFT/FINAL/
   * SIGNED is a backward-compat-only document field, never a workflow
   * state). Optional because the order projection can still be loading when
   * the header first mounts. */
  treatmentOrder?: TreatmentOrderResponse;
  rowsCount: number;
  isPrinting: boolean;
  isArchiving: boolean;
  onBack: () => void;
  onPrint: () => void;
  onArchive: () => void;
}

export const TreatmentSheetDetailHeader: React.FC<Props> = ({
  treatmentSheet,
  treatmentOrder,
  rowsCount,
  isPrinting,
  isArchiving,
  onBack,
  onPrint,
  onArchive,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();

  const confirmArchive = () => {
    Alert.alert(
      'Archive Treatment Sheet',
      'This will archive the treatment sheet. It will no longer appear in the active list. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: onArchive },
      ]
    );
  };

  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Treatment Sheet</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
          {treatmentSheet?.duration_days || rowsCount || 0} Days
        </Text>
      </View>
      {treatmentSheet && (
        <View style={styles.headerActions}>
          <LifecycleStatusPill order={treatmentOrder} />
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.colors.background.elevated }]}
            onPress={onPrint}
            disabled={isPrinting}
            accessibilityRole="button"
            accessibilityLabel={t('print.print')}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color={theme.colors.primary.default} />
            ) : (
              <Ionicons name="print-outline" size={20} color={theme.colors.text.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.colors.background.elevated }]}
            onPress={confirmArchive}
            disabled={isArchiving}
            accessibilityRole="button"
            accessibilityLabel={t('common.archive')}
          >
            <Ionicons name="archive-outline" size={20} color={theme.colors.feedback.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/** Phase 4 (R4) · T-F.2b (ADR-R4-03) — displays the resolver's own
 * lifecycle_status_label (falling back to "Status Pending Review" for the
 * still-open T-B.2 unresolved case, via the existing shared helper) — never
 * TreatmentSheet.status, never a re-derivation of the resolver's own logic. */
const LifecycleStatusPill: React.FC<{ order?: TreatmentOrderResponse }> = ({ order }) => {
  const theme = useClinicTheme();
  const label = getLifecycleStatusLabel(order?.lifecycle_status_label, order?.lifecycle_status_unresolved);
  const color = getLifecycleStatusColor(order?.lifecycle_status, order?.lifecycle_status_unresolved);

  return (
    <View style={[styles.lifecyclePill, { backgroundColor: color + '20' }]}>
      <Ionicons
        name={order?.lifecycle_status_unresolved ? 'help-circle-outline' : 'ellipse'}
        size={order?.lifecycle_status_unresolved ? 14 : 8}
        color={color}
      />
      <Text style={[styles.lifecyclePillText, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconButton: {
    padding: spacing.xs,
    borderRadius: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifecyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lifecyclePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
