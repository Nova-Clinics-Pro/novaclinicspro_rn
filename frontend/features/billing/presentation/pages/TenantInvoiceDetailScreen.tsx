/**
 * Tenant Invoice Detail Screen
 * Displays invoice details with payment history
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useInvoiceDetailQuery, usePaymentsForInvoiceQuery } from '../../data/repositories/billing.repository.impl';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { PaymentListItem } from '../components/PaymentListItem';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  parseAmount,
  isInvoiceOverdue,
  isInvoicePaid,
} from '../../data/models/billing.dtos';

export const TenantInvoiceDetailScreen: React.FC = () => {
  const router = useRouter();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Fetch invoice details
  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInvoiceDetailQuery(tenantId, invoiceId || '');

  // Fetch payments for this invoice
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
  } = usePaymentsForInvoiceQuery(tenantId, invoiceId || '');

  const payments = paymentsData?.items || [];
  const isPaid = invoice ? isInvoicePaid(invoice) : false;
  const isOverdue = invoice ? isInvoiceOverdue(invoice) : false;

  // What has been collected and what is still owed come from the server (it counts only collected payments); the payment list
  // is only the fallback for a backend that does not send them yet.
  const totalAmount = invoice ? parseAmount(invoice.total_amount) : 0;
  const totalPaid = invoice?.amount_paid != null ? parseAmount(invoice.amount_paid) : payments.reduce((sum, p) => sum + parseAmount(p.amount), 0);
  const remainingBalance = invoice?.balance_due != null ? parseAmount(invoice.balance_due) : totalAmount - totalPaid;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !invoice) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Unable to Load Invoice</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{invoice.invoice_number}</Text>
          <InvoiceStatusBadge status={invoice.status} size="small" />
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/clinic-admin/billing/invoices/${invoiceId}/edit`)}
        >
          <Ionicons name="create-outline" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Overdue Banner */}
        {isOverdue && (
          <View style={styles.overdueBanner}>
            <Ionicons name="warning" size={20} color={colors.error.main} />
            <Text style={styles.overdueText}>This invoice is overdue</Text>
          </View>
        )}

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={[styles.amountValue, isOverdue && { color: colors.error.main }]}>
            {formatCurrency(invoice.total_amount, invoice.currency)}
          </Text>
          {!isPaid && remainingBalance > 0 && (
            <Text style={styles.remainingText}>
              Remaining: {formatCurrency(remainingBalance, invoice.currency)}
            </Text>
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.invoice_date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={[styles.detailValue, isOverdue && { color: colors.error.main }]}>
                {formatDate(invoice.due_date)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subtotal</Text>
              <Text style={styles.detailValue}>{formatCurrency(invoice.subtotal_amount, invoice.currency)}</Text>
            </View>
            {parseAmount(invoice.tax_amount) > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tax</Text>
                <Text style={styles.detailValue}>{formatCurrency(invoice.tax_amount, invoice.currency)}</Text>
              </View>
            )}
            {parseAmount(invoice.discount_amount) > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount</Text>
                <Text style={styles.detailValue}>-{formatCurrency(invoice.discount_amount, invoice.currency)}</Text>
              </View>
            )}
            <View style={[styles.detailRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount, invoice.currency)}</Text>
            </View>
          </View>
        </View>

        {/* Line Items */}
        {invoice.lines && invoice.lines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            {invoice.lines.map((line, index) => (
              <View key={line.id || index} style={styles.lineItem}>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineDescription}>{line.description || `Item ${index + 1}`}</Text>
                  <Text style={styles.lineQuantity}>
                    {parseAmount(line.quantity)} x {formatCurrency(line.unit_price)}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{formatCurrency(line.line_total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payments</Text>
            {!isPaid && remainingBalance > 0 && (
              <TouchableOpacity
                onPress={() => router.push(`/clinic-admin/billing/invoices/${invoiceId}/record-payment`)}
              >
                <Text style={styles.addPaymentText}>+ Record Payment</Text>
              </TouchableOpacity>
            )}
          </View>

          {paymentsLoading ? (
            <View style={styles.paymentsLoading}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.noPayments}>
              <Ionicons name="card-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.noPaymentsText}>No payments recorded</Text>
              {!isPaid && (
                <TouchableOpacity
                  style={styles.recordPaymentButton}
                  onPress={() => router.push(`/clinic-admin/billing/invoices/${invoiceId}/record-payment`)}
                >
                  <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            payments.map((payment) => (
              <PaymentListItem
                key={payment.id}
                payment={payment}
                onPress={() => router.push(`/clinic-admin/billing/payments/${payment.id}`)}
              />
            ))
          )}
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.metadataText}>Created: {formatDateTime(invoice.created_at)}</Text>
            </View>
            {invoice.updated_at !== invoice.created_at && (
              <View style={styles.metadataRow}>
                <Ionicons name="pencil-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.metadataText}>Updated: {formatDateTime(invoice.updated_at)}</Text>
              </View>
            )}
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
  editButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error.main + '15',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  overdueText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.error.main,
  },
  amountCard: {
    backgroundColor: colors.primary.main + '10',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  amountValue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary.main,
  },
  remainingText: {
    ...typography.body2,
    color: colors.warning.main,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  addPaymentText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.success.main,
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
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  totalLabel: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.primary.main,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  lineInfo: {
    flex: 1,
  },
  lineDescription: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  lineQuantity: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  lineTotal: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
  },
  paymentsLoading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noPayments: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  noPaymentsText: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  recordPaymentButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  recordPaymentButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.light,
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
    marginBottom: spacing.xs,
  },
  metadataText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
