/**
 * Tenant Payment Detail Screen
 * Displays payment details
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { usePaymentDetailQuery } from '../../data/repositories/billing.repository.impl';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPaymentMethodLabel,
} from '../../data/models/billing.dtos';

export const TenantPaymentDetailScreen: React.FC = () => {
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Fetch payment details
  const {
    data: payment,
    isLoading,
    isError,
    error,
    refetch,
  } = usePaymentDetailQuery(tenantId, paymentId || '');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !payment) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Unable to Load Payment</Text>
          <Text style={styles.errorSubtitle}>
            {error?.message || 'Please check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getMethodIcon = (): keyof typeof Ionicons.glyphMap => {
    const method = payment.payment_method?.toUpperCase();
    switch (method) {
      case 'CASH':
        return 'cash';
      case 'CARD':
        return 'card';
      case 'UPI':
        return 'phone-portrait';
      case 'BANK_TRANSFER':
        return 'business';
      case 'RAZORPAY':
        return 'logo-usd';
      default:
        return 'wallet';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Payment Details</Text>
          <PaymentStatusBadge status={payment.status} size="small" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountIconContainer}>
            <Ionicons name={getMethodIcon()} size={32} color={colors.success.main} />
          </View>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
          <Text style={styles.methodText}>
            via {getPaymentMethodLabel(payment.payment_method)}
          </Text>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Date</Text>
              <Text style={styles.detailValue}>{formatDate(payment.payment_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {getPaymentMethodLabel(payment.payment_method)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <PaymentStatusBadge status={payment.status} size="small" />
            </View>
            {!!payment.reference && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference</Text>
                <Text style={styles.detailValue}>{payment.reference}</Text>
              </View>
            )}
            {!!payment.razorpay_payment_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Razorpay ID</Text>
                <Text style={[styles.detailValue, styles.monoText]}>
                  {payment.razorpay_payment_id}
                </Text>
              </View>
            )}
            {!!payment.razorpay_order_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Razorpay Order</Text>
                <Text style={[styles.detailValue, styles.monoText]}>
                  {payment.razorpay_order_id}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Link to Invoice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Related Invoice</Text>
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push(`/clinic-admin/billing/invoices/${payment.invoice_id}`)}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="document-text" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>View Invoice</Text>
              <Text style={styles.linkSubtitle}>See full invoice details</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.metadataText}>
                Recorded: {formatDateTime(payment.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  amountCard: {
    backgroundColor: colors.success.main + '10',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success.main + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  amountValue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.success.main,
  },
  methodText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  linkSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  metadataCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metadataText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
