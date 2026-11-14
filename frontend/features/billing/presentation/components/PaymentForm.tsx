/**
 * Payment Form Component
 * Form for recording payments
 */

import { DateField } from '../../../../core/components/DateField';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  PaymentCreateRequest,
  PAYMENT_METHODS,
  getTodayISO,
  formatCurrency,
  parseAmount,
} from '../../data/models/billing.dtos';

interface PaymentFormProps {
  invoiceId: string;
  clientId: string;
  remainingAmount?: number;
  onSubmit: (data: PaymentCreateRequest) => void;
  isLoading?: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  invoiceId,
  clientId,
  remainingAmount = 0,
  onSubmit,
  isLoading = false,
}) => {
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const amountValue = parseAmount(amount);
  const isValid = amountValue > 0 && paymentDate && paymentMethod;

  const handleSubmit = () => {
    if (!isValid) return;

    const data: PaymentCreateRequest = {
      invoice_id: invoiceId,
      client_id: clientId,
      payment_date: paymentDate,
      amount: amountValue,
      payment_method: paymentMethod,
      reference: reference.trim() || null,
      status: 'SUCCESS',
    };
    onSubmit(data);
  };

  return (
    <View style={styles.container}>
      {/* Remaining amount hint */}
      {remainingAmount > 0 && (
        <View style={styles.hintCard}>
          <Ionicons name="information-circle" size={20} color={colors.info.main} />
          <Text style={styles.hintText}>
            Remaining balance: {formatCurrency(remainingAmount)}
          </Text>
        </View>
      )}

      {/* Amount */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Payment Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Date *</Text>
        <DateField value={paymentDate} onChange={setPaymentDate} />
      </View>

      {/* Payment Method */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Method *</Text>
        <View style={styles.methodContainer}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodChip,
                paymentMethod === method.value && styles.methodChipActive,
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <Text
                style={[
                  styles.methodChipText,
                  paymentMethod === method.value && styles.methodChipTextActive,
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reference */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reference / Transaction ID</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Enter reference number"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.light} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color={colors.text.light} />
            <Text style={styles.submitButtonText}>Record Payment</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info.main + '15',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  hintText: {
    ...typography.body2,
    color: colors.info.dark,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.h5,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...typography.h5,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.grey[100],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  methodChipActive: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
  },
  methodChipText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  methodChipTextActive: {
    color: colors.text.light,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
});
