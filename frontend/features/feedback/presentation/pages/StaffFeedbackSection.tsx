/**
 * Staff Feedback Section Component
 * Displays patient feedback summary and link to view all feedback
 * Used in both Doctor and Therapist dashboards
 */

import { t } from '../../../../core/localization';
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  StarRatingDisplay,
  RatingDistributionBars,
  PeriodSelector,
  FeedbackKpiCard,
} from '../components';
import { useStaffKpisQuery } from '../../data/repositories/feedback.repository.impl';
import { getRatingDistributionPercentages, formatPercentage } from '../../domain/entities/feedback.entity';
import { getTrendIcon } from '../../data/models/feedback.dtos';
import type { KPIPeriod, StaffType } from '../../data/models/feedback.dtos';

interface StaffFeedbackSectionProps {
  tenantId: string;
  staffId: string;
  staffType: StaffType;
  testID?: string;
}

export const StaffFeedbackSection: React.FC<StaffFeedbackSectionProps> = ({
  tenantId,
  staffId,
  staffType,
  testID,
}) => {
  const theme = useClinicTheme();
  const trendColor = (trend: string) =>
    trend === 'up' ? theme.colors.feedback.success : trend === 'down' ? theme.colors.feedback.error : theme.colors.text.secondary;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const [period, setPeriod] = useState<KPIPeriod>('30d');

  // Query
  const {
    data: kpiData,
    isLoading,
    isError,
    refetch,
  } = useStaffKpisQuery(
    tenantId,
    staffId,
    {
      period,
      staffType,
    },
    {
      enabled: !!tenantId && !!staffId,
    }
  );

  const handlePeriodChange = useCallback((newPeriod: KPIPeriod) => {
    setPeriod(newPeriod);
  }, []);

  const handleViewAllFeedback = useCallback(() => {
    // @ts-ignore - Route exists but TypeScript types not auto-generated yet
    router.push(`/clinic-admin/feedback?staffId=${staffId}&staffType=${staffType}`);
  }, [router, staffId, staffType]);

  // Derived data
  const satisfaction = kpiData?.patient_satisfaction;
  const ratingDistribution = useMemo(() => {
    if (!satisfaction) return [];
    return getRatingDistributionPercentages(
      satisfaction.rating_distribution,
      satisfaction.total_responses
    );
  }, [satisfaction]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.feedback.warning} />
            <Text style={styles.title}>{t('clinicAdmin.feedbackSummary.title')}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary.default} />
          <Text style={styles.loadingText}>{t('clinicAdmin.feedbackSummary.loading')}</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError || !kpiData) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.feedback.warning} />
            <Text style={styles.title}>{t('clinicAdmin.feedbackSummary.title')}</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.text.tertiary} />
          <Text style={styles.errorText}>{t('clinicAdmin.feedbackSummary.loadFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>{t('clinicAdmin.feedbackSummary.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No feedback state
  if (!satisfaction || satisfaction.total_responses === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="chatbubbles" size={20} color={theme.colors.feedback.warning} />
            <Text style={styles.title}>{t('clinicAdmin.feedbackSummary.title')}</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={32} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('clinicAdmin.feedbackSummary.emptyTitle')}</Text>
          <Text style={styles.emptyMessage}>
            No patient feedback received for this period.
          </Text>
        </View>
      </View>
    );
  }

  // At this point satisfaction is guaranteed to be defined
  const satisfactionData = satisfaction;

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="chatbubbles" size={20} color={theme.colors.feedback.warning} />
          <Text style={styles.title}>{t('clinicAdmin.feedbackSummary.title')}</Text>
        </View>
        <TouchableOpacity onPress={handleViewAllFeedback} testID={`${testID}-view-all`}>
          <Text style={styles.viewAllText}>{t('clinicAdmin.feedbackSummary.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Period Filter */}
      <View style={styles.periodContainer}>
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          testID={`${testID}-period`}
        />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.ratingRow}>
          <View style={styles.ratingLeft}>
            <Text style={styles.ratingValue}>{satisfactionData.average_rating.toFixed(1)}</Text>
            <StarRatingDisplay rating={satisfactionData.average_rating} showNumeric={false} size={16} />
          </View>
          <View style={styles.ratingRight}>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>{satisfactionData.total_responses}</Text>
              <Text style={styles.statLabel}>{t('clinicAdmin.feedbackSummary.responses')}</Text>
            </View>
            <View style={styles.trendRow}>
              <Ionicons
                name={getTrendIcon(satisfactionData.trend) as any}
                size={14}
                color={trendColor(satisfactionData.trend)}
              />
              <Text style={[styles.trendText, { color: trendColor(satisfactionData.trend) }]}>
                {t(satisfactionData.trend === 'up' ? 'clinicAdmin.feedbackSummary.trendUp' : satisfactionData.trend === 'down' ? 'clinicAdmin.feedbackSummary.trendDown' : 'clinicAdmin.feedbackSummary.trendStable')}
              </Text>
            </View>
          </View>
        </View>

        {/* Response Rate */}
        <View style={styles.responseRateRow}>
          <Text style={styles.responseRateLabel}>{t('clinicAdmin.feedbackSummary.responseRate')}</Text>
          <Text style={styles.responseRateValue}>{formatPercentage(satisfactionData.response_rate)}</Text>
        </View>
      </View>

      {/* Rating Distribution */}
      <View style={styles.distributionContainer}>
        <Text style={styles.distributionTitle}>{t('clinicAdmin.feedbackSummary.ratingDistribution')}</Text>
        <RatingDistributionBars distribution={ratingDistribution} testID={`${testID}-distribution`} />
      </View>

      {/* Question Scores (if available) */}
      {Object.keys(satisfactionData.question_scores).length > 0 && (
        <View style={styles.scoresContainer}>
          <Text style={styles.scoresTitle}>{t('clinicAdmin.feedbackSummary.detailedScores')}</Text>
          <View style={styles.scoresGrid}>
            {Object.entries(satisfactionData.question_scores).map(([key, score]) => (
              <View key={key} style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
                <Text style={styles.scoreValue}>{(score as number).toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* View All Button */}
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={handleViewAllFeedback}
        testID={`${testID}-view-all-button`}
      >
        <Ionicons name="list" size={18} color={theme.colors.primary.default} />
        <Text style={styles.viewAllButtonText}>{t('clinicAdmin.feedbackSummary.viewAllFeedback')}</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.primary.default} />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle1,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  viewAllText: {
    ...typography.body2,
    color: theme.colors.primary.default,
    fontWeight: '600',
  },
  periodContainer: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.lg,
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
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.subtitle2,
    color: theme.colors.text.secondary,
  },
  emptyMessage: {
    ...typography.caption,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: theme.colors.background.muted,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLeft: {
    alignItems: 'center',
  },
  ratingValue: {
    ...typography.h3,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  ratingRight: {
    alignItems: 'flex-end',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    ...typography.h6,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trendText: {
    ...typography.caption,
    fontWeight: '500',
  },
  responseRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  responseRateLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  responseRateValue: {
    ...typography.body2,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  distributionContainer: {
    marginBottom: spacing.md,
  },
  distributionTitle: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  scoresContainer: {
    marginBottom: spacing.md,
  },
  scoresTitle: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    width: '48%',
  },
  scoreLabel: {
    ...typography.caption,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  scoreValue: {
    ...typography.body2,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primary.soft,
    borderRadius: 8,
  },
  viewAllButtonText: {
    ...typography.button,
    color: theme.colors.primary.default,
  },
});

export default StaffFeedbackSection;
