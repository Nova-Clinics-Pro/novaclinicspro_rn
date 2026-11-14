/**
 * Subscription Summary Card Component
 * Displays billing summary derived from invoices
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { SubscriptionSummary, formatCurrency, formatDate } from '../../data/models/billing.dtos';

interface SubscriptionSummaryCardProps {
  summary: SubscriptionSummary | null;
  isLoading?: boolean;
  isError?: boolean;
}

export const SubscriptionSummaryCard: React.FC<SubscriptionSummaryCardProps> = ({
  summary,
  isLoading = false,
  isError = false,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading billing summary...</Text>
        </View>
      </View>
    );
  }

  if (isError || !summary) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.error.main} />
          <Text style={styles.errorText}>Unable to load billing summary</Text>
        </View>
      </View>
    );
  }

  const hasOutstanding = summary.outstandingBalance > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="card" size={24} color={colors.primary.main} />
        </View>
        <Text style={styles.headerTitle}>Billing Summary</Text>
      </View>

      {/* Outstanding Balance */}
      <View style={[styles.balanceCard, hasOutstanding && styles.balanceCardAlert]}>
        <Text style={styles.balanceLabel}>Outstanding Balance</Text>
        <Text style={[styles.balanceAmount, hasOutstanding && styles.balanceAmountAlert]}>
          {formatCurrency(summary.outstandingBalance)}
        </Text>
        {!!(hasOutstanding && summary.nextDueDate) && (
          <Text style={styles.nextDueText}>
            Next due: {formatDate(summary.nextDueDate)} ({formatCurrency(summary.nextDueAmount)})
          </Text>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalInvoices}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success.main }]}>
            {summary.paidInvoices}
          </Text>
          <Text style={styles.statLabel}>Paid</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning.main }]}>
            {summary.unpaidInvoices}
          </Text>
          <Text style={styles.statLabel}>Unpaid</Text>
        </View>
      </View>

      {/* Last Payment */}
      {!!summary.lastPaymentDate && (
        <View style={styles.lastPaymentRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
          <Text style={styles.lastPaymentText}>
            Last payment: {formatCurrency(summary.lastPaymentAmount)} on{' '}
            {formatDate(summary.lastPaymentDate)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error.main,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  balanceCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceCardAlert: {
    backgroundColor: colors.warning.main + '10',
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  balanceAmount: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.text.primary,
  },
  balanceAmountAlert: {
    color: colors.warning.main,
  },
  nextDueText: {
    ...typography.caption,
    color: colors.warning.dark,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.h5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  lastPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  lastPaymentText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
