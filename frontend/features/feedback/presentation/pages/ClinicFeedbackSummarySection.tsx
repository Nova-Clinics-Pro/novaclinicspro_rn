/**
 * Clinic Feedback Summary Section
 * Component to display clinic-wide feedback summary for admin dashboard
 */

import { t } from '../../../../core/localization';
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { StarRatingDisplay } from '../components/StarRatingDisplay';
import { RatingDistributionBars } from '../components/RatingDistributionBars';
import { StaffPerformanceTable } from '../components/StaffPerformanceTable';
import { PeriodSelector } from '../components/PeriodSelector';
import { useClinicFeedbackSummaryQuery } from '../../data/repositories/feedback.repository.impl';
import {
  getRatingDistributionPercentages,
  getAmbienceScoreItems,
  formatPercentage,
} from '../../domain/entities/feedback.entity';
import type { KPIPeriod, StaffType } from '../../data/models/feedback.dtos';

interface ClinicFeedbackSummarySectionProps {
  tenantId: string;
  onStaffPress?: (staffId: string, staffType: StaffType) => void;
  testID?: string;
}

export const ClinicFeedbackSummarySection: React.FC<ClinicFeedbackSummarySectionProps> = ({
  tenantId,
  onStaffPress,
  testID,
}) => {
  const theme = useClinicTheme();
  const ratingColor = (rating: number) =>
    rating >= 4 ? theme.colors.feedback.success : rating >= 3 ? theme.colors.feedback.warning : rating > 0 ? theme.colors.feedback.error : theme.colors.text.secondary;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [period, setPeriod] = useState<KPIPeriod>('30d');

  // Calculate date range from period
  const dateRange = React.useMemo(() => {
    const today = new Date();
    let fromDate: Date;
    
    switch (period) {
      case '7d':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case '90d':
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 90);
        break;
      case '30d':
      default:
        fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 30);
        break;
    }

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: today.toISOString().split('T')[0],
    };
  }, [period]);

  // Query
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useClinicFeedbackSummaryQuery(
    tenantId,
    dateRange,
    {
      enabled: !!tenantId,
    }
  );

  const handlePeriodChange = useCallback((newPeriod: KPIPeriod) => {
    setPeriod(newPeriod);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary.default} />
          <Text style={styles.loadingText}>Loading feedback summary...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.feedback.error} />
          <Text style={styles.errorText}>{t('clinicAdmin.feedbackSummary.summaryLoadFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t('clinicAdmin.feedbackSummary.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const ratingDistribution = getRatingDistributionPercentages(
    data.rating_distribution,
    data.total_responses
  );
  const ambienceItems = getAmbienceScoreItems(data.ambience_scores);

  return (
    <View style={styles.container} testID={testID}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.feedback.warningLight }]}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.feedback.warning} />
          </View>
          <Text style={styles.sectionTitle}>{t('clinicAdmin.feedbackSummary.title')}</Text>
        </View>
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          testID={`${testID}-period`}
        />
      </View>

      {/* Overall Rating Card */}
      <View style={styles.overallCard} testID={`${testID}-overall`}>
        <View style={styles.overallRatingRow}>
          <View style={styles.overallRatingLeft}>
            <Text style={styles.overallRatingValue}>
              {(data.overall_rating || 0).toFixed(1)}
            </Text>
            <StarRatingDisplay rating={data.overall_rating || 0} showNumeric={false} size={18} />
          </View>
          <View style={styles.overallRatingRight}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.total_responses || 0}</Text>
              <Text style={styles.statLabel}>{t('clinicAdmin.feedbackSummary.colResponses')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatPercentage(data.response_rate)}</Text>
              <Text style={styles.statLabel}>{t('clinicAdmin.feedbackSummary.responseRate')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Rating Distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('clinicAdmin.feedbackSummary.ratingDistribution')}</Text>
        <RatingDistributionBars
          distribution={ratingDistribution}
          testID={`${testID}-distribution`}
        />
      </View>

      {/* Google Reviews Card */}
      <View style={styles.card} testID={`${testID}-google`}>
        <View style={styles.cardHeader}>
          <Ionicons name="logo-google" size={20} color="#4285F4" />
          <Text style={styles.cardTitle}>{t('clinicAdmin.feedbackSummary.googleReviews')}</Text>
        </View>
        <View style={styles.googleStatsRow}>
          <View style={styles.googleStat}>
            <Text style={styles.googleStatValue}>{data.google_review_stats?.prompted || 0}</Text>
            <Text style={styles.googleStatLabel}>{t('clinicAdmin.feedbackSummary.prompted')}</Text>
          </View>
          <View style={styles.googleStatDivider} />
          <View style={styles.googleStat}>
            <Text style={styles.googleStatValue}>{data.google_review_stats?.posted || 0}</Text>
            <Text style={styles.googleStatLabel}>{t('clinicAdmin.feedbackSummary.posted')}</Text>
          </View>
          <View style={styles.googleStatDivider} />
          <View style={styles.googleStat}>
            <Text style={[
              styles.googleStatValue,
              { color: ratingColor((data.google_review_stats?.conversion_rate || 0) / 20) }
            ]}>
              {formatPercentage(data.google_review_stats?.conversion_rate || 0)}
            </Text>
            <Text style={styles.googleStatLabel}>{t('clinicAdmin.feedbackSummary.conversion')}</Text>
          </View>
        </View>
      </View>

      {/* Staff Performance */}
      <View style={styles.staffSection}>
        <Text style={styles.cardTitle}>{t('clinicAdmin.feedbackSummary.staffPerformance')}</Text>
        <StaffPerformanceTable
          doctors={data.staff_performance?.doctors || []}
          therapists={data.staff_performance?.therapists || []}
          onStaffPress={onStaffPress}
          testID={`${testID}-staff`}
        />
      </View>

      {/* Ambience Scores */}
      <View style={styles.card} testID={`${testID}-ambience`}>
        <Text style={styles.cardTitle}>{t('clinicAdmin.feedbackSummary.ambienceScores')}</Text>
        <View style={styles.ambienceGrid}>
          {ambienceItems.map((item) => (
            <View key={item.key} style={styles.ambienceItem}>
              <View style={styles.ambienceIconContainer}>
                <Ionicons
                  name={item.icon as any}
                  size={16}
                  color={ratingColor(item.score)}
                />
              </View>
              <View style={styles.ambienceContent}>
                <Text style={styles.ambienceLabel}>{t('clinicAdmin.feedbackSummary.ambience_' + item.key)}</Text>
                <Text style={[
                  styles.ambienceScore,
                  { color: ratingColor(item.score) }
                ]}>
                  {item.score > 0 ? item.score.toFixed(1) : t('clinicAdmin.feedbackSummary.notAvailable')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  retryButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    ...typography.button,
    color: theme.colors.primary.default,
  },
  sectionHeader: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.h5,
    color: theme.colors.text.primary,
  },
  card: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.subtitle1,
    color: theme.colors.text.primary,
    marginBottom: spacing.sm,
  },
  overallCard: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  overallRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overallRatingLeft: {
    alignItems: 'center',
  },
  overallRatingValue: {
    ...typography.h2,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  overallRatingRight: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h5,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  googleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  googleStat: {
    alignItems: 'center',
    flex: 1,
  },
  googleStatValue: {
    ...typography.h6,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  googleStatLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  googleStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border.subtle,
  },
  staffSection: {
    gap: spacing.sm,
  },
  ambienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ambienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ambienceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.background.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambienceContent: {
    flex: 1,
  },
  ambienceLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  ambienceScore: {
    ...typography.body2,
    fontWeight: '600',
  },
});

export default ClinicFeedbackSummarySection;
