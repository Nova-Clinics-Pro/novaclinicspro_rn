/**
 * Payment List Item Component
 * Displays a single payment in a list
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import {
  PaymentResponse,
  formatCurrency,
  formatDate,
  getPaymentMethodLabel,
} from '../../data/models/billing.dtos';

interface PaymentListItemProps {
  payment: PaymentResponse;
  onPress?: () => void;
}

export const PaymentListItem: React.FC<PaymentListItemProps> = ({
  payment,
  onPress,
}) => {
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
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Left: Payment method icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={getMethodIcon()} size={24} color={colors.success.main} />
      </View>

      {/* Middle: Payment info */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.methodText}>
            {getPaymentMethodLabel(payment.payment_method)}
          </Text>
          <PaymentStatusBadge status={payment.status} size="small" />
        </View>

        <Text style={styles.dateText}>
          {formatDate(payment.payment_date)}
        </Text>

        {!!payment.reference && (
          <Text style={styles.referenceText} numberOfLines={1}>
            Ref: {payment.reference}
          </Text>
        )}
      </View>

      {/* Right: Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>
          {formatCurrency(payment.amount)}
        </Text>
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.success.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  methodText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  referenceText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amount: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.success.main,
    marginBottom: 4,
  },
});
