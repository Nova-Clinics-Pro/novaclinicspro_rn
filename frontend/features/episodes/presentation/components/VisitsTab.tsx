/**
 * VisitsTab
 *
 * Single responsibility: render the Visits tab panel.
 * Shows all visits (appointments) for the episode sorted newest-first,
 * each with prescription and payment action buttons — matching the
 * behaviour that previously lived in EpisodeDetailScreen's VisitItem.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { VisitInfo } from '../../data/models/episodes.dtos';
import { formatTime } from '../../../../core/utils/dateTimeUtils';
import { SectionSkeleton, cardStyles, formatDisplayDate } from './EpisodeWorkspaceShared';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisitsTabProps {
  visits: VisitInfo[];
  isLoading: boolean;
  canWriteRx: boolean;
  onViewPrescription: (prescriptionId: string) => void;
  onCreatePrescription: (appointmentId: string) => void;
  onVisitPress?: (appointmentId: string) => void;
}

// ─── VisitCard ────────────────────────────────────────────────────────────────

interface VisitCardProps {
  visit: VisitInfo;
  canWriteRx: boolean;
  onVisitPress?: () => void;
  onViewPrescription: () => void;
  onCreatePrescription: () => void;
}

const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  canWriteRx,
  onVisitPress,
  onViewPrescription,
  onCreatePrescription,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  const statusColor = getVisitStatusColor(visit.appointment_status, colors);
  const hasPrescription = visit.prescription?.exists ?? false;
  const hasPayment = visit.payment?.exists ?? false;

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
      {/* Header row — date/time + status */}
      <TouchableOpacity
        style={styles.visitHeader}
        onPress={onVisitPress}
        activeOpacity={onVisitPress ? 0.7 : 1}
        accessibilityRole={onVisitPress ? 'button' : 'text'}
      >
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.text.tertiary} />
          <Text style={[typography.body2, { color: colors.text.primary, fontWeight: '600' }]}>
            {formatDisplayDate(visit.appointment_date)}
          </Text>
          {visit.appointment_time ? (
            <>
              <Ionicons name="time-outline" size={15} color={colors.text.tertiary} />
              <Text style={[typography.caption, { color: colors.text.secondary }]}>
                {formatTime(`${visit.appointment_date}T${visit.appointment_time}Z`)}
              </Text>
            </>
          ) : null}
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '18', borderRadius: spacing.xs },
          ]}
        >
          <Text style={[typography.caption, { color: statusColor, fontWeight: '600' }]}>
            {formatStatus(visit.appointment_status)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Staff name */}
      {!!visit.staff_name && (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={colors.text.tertiary} />
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            {visit.staff_name}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {/* Prescription */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { borderColor: colors.border.default, borderRadius: spacing.xs },
          ]}
          onPress={hasPrescription ? onViewPrescription : (canWriteRx ? onCreatePrescription : undefined)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            hasPrescription
              ? t('episodeWorkspace.visits.viewPrescription')
              : t('episodeWorkspace.visits.addPrescription')
          }
        >
          <Ionicons
            name={hasPrescription ? 'document-text' : 'add-circle-outline'}
            size={18}
            color={colors.primary.default}
          />
          <Text style={[typography.caption, { color: colors.primary.default, fontWeight: '600' }]}>
            {hasPrescription
              ? t('episodeWorkspace.visits.viewPrescription')
              : t('episodeWorkspace.visits.addPrescription')}
          </Text>
        </TouchableOpacity>

        {/* Payment */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { borderColor: colors.border.default, borderRadius: spacing.xs },
          ]}
          onPress={() =>
            Alert.alert(
              t('episodeWorkspace.visits.paymentDetails'),
              t('episodeWorkspace.visits.paymentNotImplemented')
            )
          }
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('episodeWorkspace.visits.paymentDetails')}
        >
          <Ionicons
            name={hasPayment ? 'cash' : 'cash-outline'}
            size={18}
            color={hasPayment ? colors.feedback.success : colors.text.secondary}
          />
          <Text
            style={[
              typography.caption,
              {
                color: hasPayment ? colors.feedback.success : colors.text.secondary,
                fontWeight: '600',
              },
            ]}
          >
            {t('episodeWorkspace.visits.paymentDetails')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── VisitsTab ────────────────────────────────────────────────────────────────

export const VisitsTab: React.FC<VisitsTabProps> = ({
  visits,
  isLoading,
  canWriteRx,
  onViewPrescription,
  onCreatePrescription,
  onVisitPress,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  if (isLoading) return <SectionSkeleton />;

  if (visits.length === 0) {
    return (
      <View
        style={[
          cardStyles.emptySection,
          { paddingVertical: spacing.xxl, gap: spacing.md, paddingHorizontal: spacing.md },
        ]}
      >
        <Ionicons name="calendar-outline" size={40} color={colors.text.disabled} />
        <Text
          style={[
            typography.body2,
            { color: colors.text.secondary, textAlign: 'center', maxWidth: 260 },
          ]}
        >
          {t('episodeWorkspace.visits.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md, padding: spacing.md }}>
      {visits.map((visit) => (
        <VisitCard
          key={visit.appointment_id}
          visit={visit}
          canWriteRx={canWriteRx}
          onVisitPress={
            onVisitPress ? () => onVisitPress(visit.appointment_id) : undefined
          }
          onViewPrescription={() => {
            if (visit.prescription?.id) {
              onViewPrescription(visit.prescription.id);
            }
          }}
          onCreatePrescription={() => onCreatePrescription(visit.appointment_id)}
        />
      ))}
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatStatus = (status: string): string => {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ');
};

const getVisitStatusColor = (status: string, colors: any): string => {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed') return colors.feedback.success;
  if (s === 'cancelled' || s === 'no_show') return colors.feedback.error;
  if (s === 'in_progress') return colors.feedback.info;
  return colors.primary.default;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
  },
});
