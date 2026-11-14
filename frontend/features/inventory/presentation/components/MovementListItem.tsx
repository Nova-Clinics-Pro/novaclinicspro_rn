/**
 * Movement List Item Component
 * Displays a single inventory movement record
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  MovementResponse,
  getMovementTypeLabel,
  getMovementTypeColor,
  parseStock,
  formatCurrency,
  formatDateTime,
} from '../../data/models/inventory.dtos';

interface MovementListItemProps {
  movement: MovementResponse;
}

export const MovementListItem: React.FC<MovementListItemProps> = ({ movement }) => {
  const typeColor = getMovementTypeColor(movement.movement_type);
  const quantity = parseStock(movement.quantity);
  const isIncoming = movement.movement_type === 'IN' || movement.movement_type === 'RETURN';

  const getMovementIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (movement.movement_type) {
      case 'IN':
        return 'arrow-down-circle';
      case 'OUT':
        return 'arrow-up-circle';
      case 'ADJUSTMENT':
        return 'swap-horizontal';
      case 'TRANSFER':
        return 'swap-vertical';
      case 'RETURN':
        return 'return-down-back';
      default:
        return 'ellipse';
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: typeColor + '15' }]}>
        <Ionicons name={getMovementIcon()} size={24} color={typeColor} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {getMovementTypeLabel(movement.movement_type)}
            </Text>
          </View>
          <Text style={styles.date}>
            {formatDateTime(movement.movement_date)}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={[styles.quantity, { color: typeColor }]}>
            {isIncoming ? '+' : '-'}{quantity}
          </Text>
          {movement.stock_before !== null && movement.stock_after !== null && (
            <Text style={styles.stockChange}>
              {movement.stock_before} → {movement.stock_after}
            </Text>
          )}
        </View>

        {!!movement.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {movement.notes}
          </Text>
        )}

        {movement.unit_cost !== null && (
          <Text style={styles.cost}>
            Unit Cost: {formatCurrency(movement.unit_cost)}
            {movement.total_value !== null && ` • Total: ${formatCurrency(movement.total_value)}`}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  date: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 4,
  },
  quantity: {
    ...typography.h5,
    fontWeight: '700',
  },
  stockChange: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  notes: {
    ...typography.body2,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cost: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
