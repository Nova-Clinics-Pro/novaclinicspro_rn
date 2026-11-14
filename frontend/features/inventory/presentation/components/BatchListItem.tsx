/**
 * Batch List Item Component
 * Displays a single inventory batch with expiry status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  BatchResponse,
  formatStock,
  formatDate,
  formatCurrency,
  isExpiringSoon,
  isExpired,
} from '../../data/models/inventory.dtos';

interface BatchListItemProps {
  batch: BatchResponse;
  onPress?: () => void;
  onEdit?: () => void;
}

export const BatchListItem: React.FC<BatchListItemProps> = ({
  batch,
  onPress,
  onEdit,
}) => {
  const expired = isExpired(batch.expiry_date);
  const expiringSoon = isExpiringSoon(batch.expiry_date);
  const quantity = parseFloat(batch.quantity_available) || 0;

  const getExpiryColor = () => {
    if (expired) return colors.error.main;
    if (expiringSoon) return colors.warning.main;
    return colors.success.main;
  };

  const getExpiryLabel = () => {
    if (expired) return 'Expired';
    if (expiringSoon) return 'Expiring Soon';
    return 'Valid';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !batch.is_active && styles.inactiveContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Expiry indicator bar */}
      <View style={[styles.expiryBar, { backgroundColor: getExpiryColor() }]} />

      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.batchInfo}>
            <Text style={styles.batchNumber}>{batch.batch_number}</Text>
            {!batch.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </View>
          <View style={[styles.expiryBadge, { backgroundColor: getExpiryColor() + '15' }]}>
            <Ionicons
              name={expired ? 'alert-circle' : expiringSoon ? 'time' : 'checkmark-circle'}
              size={14}
              color={getExpiryColor()}
            />
            <Text style={[styles.expiryText, { color: getExpiryColor() }]}>
              {getExpiryLabel()}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{formatStock(batch.quantity_available)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Expiry</Text>
            <Text style={[styles.detailValue, { color: getExpiryColor() }]}>
              {formatDate(batch.expiry_date)}
            </Text>
          </View>
          {batch.mrp !== null && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>MRP</Text>
              <Text style={styles.detailValue}>{formatCurrency(batch.mrp)}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.dateText}>
            Manufactured: {formatDate(batch.manufacture_date)}
          </Text>
          {!!batch.purchase_date && (
            <Text style={styles.dateText}>
              Purchased: {formatDate(batch.purchase_date)}
            </Text>
          )}
        </View>
      </View>

      {/* Edit button */}
      {onEdit && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary.main} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  inactiveContainer: {
    opacity: 0.6,
    backgroundColor: colors.grey[50],
  },
  expiryBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  contentContainer: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  batchNumber: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.grey[200],
  },
  inactiveText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.secondary,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryText: {
    ...typography.caption,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailItem: {},
  detailLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  detailValue: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  editButton: {
    padding: spacing.md,
    justifyContent: 'center',
  },
});
