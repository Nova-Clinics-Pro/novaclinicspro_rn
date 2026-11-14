/**
 * Invoice List Item Component
 * Displays a single invoice in a list
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import {
  InvoiceResponse,
  formatCurrency,
  formatDate,
  isInvoiceOverdue,
} from '../../data/models/billing.dtos';

interface InvoiceListItemProps {
  invoice: InvoiceResponse;
  onPress: () => void;
}

export const InvoiceListItem: React.FC<InvoiceListItemProps> = ({
  invoice,
  onPress,
}) => {
  const isOverdue = isInvoiceOverdue(invoice);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOverdue && styles.overdueContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Invoice icon */}
      <View style={[styles.iconContainer, isOverdue && styles.iconContainerOverdue]}>
        <Ionicons
          name="document-text"
          size={24}
          color={isOverdue ? colors.error.main : colors.primary.main}
        />
      </View>

      {/* Middle: Invoice info */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <InvoiceStatusBadge status={invoice.status} size="small" />
        </View>

        <Text style={styles.dateText}>
          Date: {formatDate(invoice.invoice_date)}
        </Text>

        {!!invoice.due_date && (
          <Text style={[styles.dueText, isOverdue && styles.dueDateOverdue]}>
            Due: {formatDate(invoice.due_date)}
            {isOverdue && ' (Overdue)'}
          </Text>
        )}
      </View>

      {/* Right: Amount */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, isOverdue && styles.amountOverdue]}>
          {formatCurrency(invoice.total_amount, invoice.currency)}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
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
  overdueContainer: {
    borderColor: colors.error.main + '30',
    backgroundColor: colors.error.main + '05',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerOverdue: {
    backgroundColor: colors.error.main + '15',
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
  invoiceNumber: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  dueText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  dueDateOverdue: {
    color: colors.error.main,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  amount: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  amountOverdue: {
    color: colors.error.main,
  },
});
