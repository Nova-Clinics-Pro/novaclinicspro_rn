/**
 * Tenant Record Payment Screen
 * Screen for recording a payment against an invoice
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useInvoiceDetailQuery,
  usePaymentsForInvoiceQuery,
  useCreatePaymentMutation,
} from '../../data/repositories/billing.repository.impl';
import { PaymentForm } from '../components/PaymentForm';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  PaymentCreateRequest,
  formatCurrency,
  parseAmount,
} from '../../data/models/billing.dtos';

export const TenantRecordPaymentScreen: React.FC = () => {
  const router = useRouter();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // Fetch invoice details
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
    error,
  } = useInvoiceDetailQuery(tenantId, invoiceId || '');

  // Fetch existing payments
  const { data: paymentsData } = usePaymentsForInvoiceQuery(tenantId, invoiceId || '');

  const payments = paymentsData?.items || [];
  // What has been collected and what is still owed come from the server (it counts only collected payments); the payment list
  // is only the fallback for a backend that does not send them yet.
  const totalAmount = invoice ? parseAmount(invoice.total_amount) : 0;
  const totalPaid = invoice?.amount_paid != null ? parseAmount(invoice.amount_paid) : payments.reduce((sum, p) => sum + parseAmount(p.amount), 0);
  const remainingBalance = invoice?.balance_due != null ? parseAmount(invoice.balance_due) : totalAmount - totalPaid;

  const createMutation = useCreatePaymentMutation(tenantId, {
    onSuccess: () => {
      Alert.alert('Success', 'Payment recorded successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      Alert.alert('Error', err.message || 'Failed to record payment');
    },
  });

  const handleSubmit = (data: PaymentCreateRequest) => {
    createMutation.mutate(data);
  };

  if (invoiceLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Payment</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error.main} />
          <Text style={styles.errorTitle}>Unable to Load Invoice</Text>
          <Text style={styles.errorSubtitle}>
            {error?.message || 'Please check your connection and try again.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Record Payment</Text>
            <Text style={styles.headerSubtitle}>{invoice.invoice_number}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Invoice Summary */}
          <View style={styles.invoiceSummary}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons name="document-text" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>{invoice.invoice_number}</Text>
                <InvoiceStatusBadge status={invoice.status} size="small" />
              </View>
            </View>

            <View style={styles.summaryAmounts}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Invoice Total</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(invoice.total_amount, invoice.currency)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Already Paid</Text>
                <Text style={[styles.summaryValue, { color: colors.success.main }]}>
                  -{formatCurrency(totalPaid, invoice.currency)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Remaining Balance</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(remainingBalance, invoice.currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <PaymentForm
              invoiceId={invoice.id}
              clientId={invoice.client_id}
              remainingAmount={remainingBalance}
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  keyboardView: {
    flex: 1,
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
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  invoiceSummary: {
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryTitle: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryAmounts: {},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  balanceLabel: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  balanceValue: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.warning.main,
  },
  formSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
