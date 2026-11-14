/**
 * TherapistKpiSection
 *
 * Renders the KPI metrics section with a period selector (7d, 30d, 90d, custom).
 * Calls useGetTherapistKpis with the selected period params and displays:
 *   - Completion rate
 *   - Retention rate
 *   - Satisfaction score
 *   - Rating distribution
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { DateField } from '../../../../core/components/DateField';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { useGetTherapistKpis } from '../../domain/usecases/get-therapist-kpis.usecase';
import { KpiQueryParams } from '../../../staffDashboards/data/models/staffDashboards.dtos';

// ============================================
// TYPES
// ============================================

type Period = '7d' | '30d' | '90d' | 'custom';

interface TherapistKpiSectionProps {
  tenantId: string;
  staffId: string;
  isLoading: boolean;
}

// ============================================
// PERIOD SELECTOR BUTTON
// ============================================

interface PeriodButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

const PeriodButton: React.FC<PeriodButtonProps> = ({
  label,
  active,
  onPress,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    style={[styles.periodButton, active && styles.periodButtonActive]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.periodButtonText, active && styles.periodButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ============================================
// METRIC CARD
// ============================================

interface MetricCardProps {
  label: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const TherapistKpiSection: React.FC<TherapistKpiSectionProps> = ({
  tenantId,
  staffId,
  isLoading: parentIsLoading,
}) => {
  const [period, setPeriod] = useState<Period>('30d');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Build query params based on selected period — memoized to keep a stable reference
  const kpiParams: KpiQueryParams = useMemo(() => {
    if (period === 'custom' && customRange) {
      return { start_date: customRange.start, end_date: customRange.end };
    }
    if (period !== 'custom') {
      return { period };
    }
    return {};
  }, [period, customRange]);

  // Disable query when custom is selected but range is not yet provided
  const queryEnabled = period !== 'custom' || (customRange !== null);

  const { data, isLoading: kpiLoading, isError, refetch } = useGetTherapistKpis(
    queryEnabled ? tenantId : '',
    queryEnabled ? staffId : '',
    kpiParams
  );

  const isLoading = parentIsLoading || kpiLoading;

  // Apply custom range when both dates are filled
  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      setCustomRange({ start: customStart, end: customEnd });
    }
  };

  // ---- Render ----

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centeredContainer} accessibilityLabel="Loading KPI data">
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>Failed to load KPI data.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading KPI data"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyText}>No KPI data available for this period.</Text>
        </View>
      );
    }

    const {
      completionRate,
      retentionRate,
      satisfactionScore,
    } = data;

    return (
      <View style={styles.metricsGrid}>
        <MetricCard
          label="Completion"
          value={completionRate != null ? `${completionRate}%` : 'N/A'}
        />
        <MetricCard
          label="Retention"
          value={retentionRate != null ? `${retentionRate}%` : 'N/A'}
        />
        <MetricCard
          label="Satisfaction"
          value={satisfactionScore != null ? satisfactionScore.toFixed(1) : 'N/A'}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <Text style={styles.sectionTitle}>Performance KPIs</Text>

      {/* Period selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodSelectorScroll}
        contentContainerStyle={styles.periodSelector}
        accessibilityRole="toolbar"
        accessibilityLabel="KPI period selector"
      >
        <PeriodButton
          label="7 Days"
          active={period === '7d'}
          onPress={() => setPeriod('7d')}
          accessibilityLabel="Show KPIs for last 7 days"
        />
        <PeriodButton
          label="30 Days"
          active={period === '30d'}
          onPress={() => setPeriod('30d')}
          accessibilityLabel="Show KPIs for last 30 days"
        />
        <PeriodButton
          label="90 Days"
          active={period === '90d'}
          onPress={() => setPeriod('90d')}
          accessibilityLabel="Show KPIs for last 90 days"
        />
        <PeriodButton
          label="Custom"
          active={period === 'custom'}
          onPress={() => setPeriod('custom')}
          accessibilityLabel="Show KPIs for custom date range"
        />
      </ScrollView>

      {/* Custom date range inputs */}
      {period === 'custom' && (
        <View style={styles.customRangeContainer}>
          <View style={styles.customRangeRow}>
            <View style={styles.customRangeField}>
              <Text style={styles.customRangeLabel}>Start Date</Text>
              <DateField value={customStart} onChange={setCustomStart} accessibilityLabel="Custom range start date" />
            </View>
            <View style={styles.customRangeField}>
              <Text style={styles.customRangeLabel}>End Date</Text>
              <DateField value={customEnd} onChange={setCustomEnd} accessibilityLabel="Custom range end date" />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.applyRangeButton,
              (!customStart || !customEnd) && styles.applyRangeButtonDisabled,
            ]}
            onPress={handleApplyCustomRange}
            disabled={!customStart || !customEnd}
            accessibilityRole="button"
            accessibilityLabel="Apply custom date range"
          >
            <Text style={styles.applyRangeButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Metrics content */}
      <View style={styles.metricsContainer}>{renderContent()}</View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  // Period selector
  periodSelectorScroll: {
    marginBottom: spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.background.paper,
  },
  periodButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  periodButtonText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.common.white,
    fontWeight: '600',
  },
  // Custom range
  customRangeContainer: {
    marginBottom: spacing.md,
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  customRangeField: {
    flex: 1,
  },
  customRangeLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  customRangeInput: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.text.primary,
  },
  applyRangeButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  applyRangeButtonDisabled: {
    opacity: 0.5,
  },
  applyRangeButtonText: {
    color: colors.common.white,
    fontWeight: '600',
    fontSize: 14,
  },
  // Metrics grid
  metricsContainer: {
    marginTop: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.background.paper,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 72,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  centeredContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error.main,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.common.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TherapistKpiSection;
