/**
 * Staff Performance Table Component
 * Displays staff performance with ratings and trends
 */

import { t } from '../../../../core/localization';
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { StarRatingDisplay } from './StarRatingDisplay';
import { getTrendIcon } from '../../data/models/feedback.dtos';
import type { StaffPerformanceItem, StaffType } from '../../data/models/feedback.dtos';

interface StaffPerformanceTableProps {
  doctors: StaffPerformanceItem[];
  therapists: StaffPerformanceItem[];
  onStaffPress?: (staffId: string, staffType: StaffType) => void;
  testID?: string;
}

type TabType = 'doctors' | 'therapists';

export const StaffPerformanceTable: React.FC<StaffPerformanceTableProps> = ({
  doctors,
  therapists,
  onStaffPress,
  testID,
}) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<TabType>('doctors');

  const currentList = activeTab === 'doctors' ? doctors : therapists;

  return (
    <View style={styles.container} testID={testID}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'doctors' && styles.tabActive]}
          onPress={() => setActiveTab('doctors')}
          testID={`${testID}-tab-doctors`}
        >
          <Text style={[styles.tabText, activeTab === 'doctors' && styles.tabTextActive]}>
            {t('clinicAdmin.feedbackSummary.tabDoctors', { count: doctors.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'therapists' && styles.tabActive]}
          onPress={() => setActiveTab('therapists')}
          testID={`${testID}-tab-therapists`}
        >
          <Text style={[styles.tabText, activeTab === 'therapists' && styles.tabTextActive]}>
            {t('clinicAdmin.feedbackSummary.tabTherapists', { count: therapists.length })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      {currentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={32} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>
            {t(activeTab === 'doctors' ? 'clinicAdmin.feedbackSummary.noDoctorsData' : 'clinicAdmin.feedbackSummary.noTherapistsData')}
          </Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.nameCell]}>{t('clinicAdmin.feedbackSummary.colName')}</Text>
            <Text style={[styles.headerCell, styles.ratingCell]}>{t('clinicAdmin.feedbackSummary.colRating')}</Text>
            <Text style={[styles.headerCell, styles.responsesCell]}>{t('clinicAdmin.feedbackSummary.colResponses')}</Text>
            <Text style={[styles.headerCell, styles.trendCell]}>{t('clinicAdmin.feedbackSummary.colTrend')}</Text>
          </View>

          {/* Rows */}
          {currentList.map((staff) => (
            <TouchableOpacity
              key={staff.staff_id}
              style={styles.tableRow}
              onPress={() => onStaffPress?.(staff.staff_id, staff.staff_type)}
              disabled={!onStaffPress}
              testID={`${testID}-row-${staff.staff_id}`}
            >
              <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                {staff.name}
              </Text>
              <View style={styles.ratingCellView}>
                <StarRatingDisplay rating={staff.average_rating} size={12} />
              </View>
              <Text style={[styles.cell, styles.responsesCell]}>
                {staff.total_responses}
              </Text>
              <View style={styles.trendCellView}>
                <Ionicons
                  name={getTrendIcon(staff.trend) as any}
                  size={16}
                  color={(staff.trend === 'up' ? theme.colors.feedback.success : staff.trend === 'down' ? theme.colors.feedback.error : theme.colors.text.secondary)}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.default,
  },
  tabText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.primary.default,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body2,
    color: theme.colors.text.tertiary,
  },
  tableContainer: {
    paddingVertical: spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.background.muted,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  headerCell: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.muted,
    alignItems: 'center',
  },
  cell: {
    ...typography.body2,
    color: theme.colors.text.primary,
  },
  nameCell: {
    flex: 2,
    marginRight: spacing.sm,
  },
  ratingCell: {
    flex: 1.5,
    marginRight: spacing.sm,
  },
  ratingCellView: {
    flex: 1.5,
    marginRight: spacing.sm,
  },
  responsesCell: {
    flex: 1,
    textAlign: 'center',
  },
  trendCell: {
    width: 32,
    alignItems: 'center' as const,
  },
  trendCellView: {
    width: 32,
    alignItems: 'center' as const,
  },
});

export default StaffPerformanceTable;
