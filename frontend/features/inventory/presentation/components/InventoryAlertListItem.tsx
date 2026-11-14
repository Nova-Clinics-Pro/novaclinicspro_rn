/**
 * Inventory Alert List Item Component
 * Displays a single inventory alert with severity indicator and acknowledge action
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  AlertResponse,
  getAlertTypeLabel,
  getSeverityColor,
  formatDateTime,
} from '../../data/models/inventory.dtos';

interface InventoryAlertListItemProps {
  alert: AlertResponse;
  onAcknowledge?: () => void;
  onPress?: () => void;
}

export const InventoryAlertListItem: React.FC<InventoryAlertListItemProps> = ({
  alert,
  onAcknowledge,
  onPress,
}) => {
  const severityColor = getSeverityColor(alert.severity);

  const getAlertIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (alert.alert_type) {
      case 'LOW_STOCK':
        return 'trending-down';
      case 'EXPIRY_WARNING':
        return 'time-outline';
      case 'EXPIRED':
        return 'alert-circle';
      case 'OVER_STOCK':
        return 'trending-up';
      default:
        return 'warning';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        alert.is_acknowledged && styles.acknowledgedContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Severity indicator bar */}
      <View style={[styles.severityBar, { backgroundColor: severityColor }]} />

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: severityColor + '15' }]}>
        <Ionicons name={getAlertIcon()} size={24} color={severityColor} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, { backgroundColor: severityColor + '15' }]}>
            <Text style={[styles.typeText, { color: severityColor }]}>
              {getAlertTypeLabel(alert.alert_type)}
            </Text>
          </View>
          <Text style={[styles.severityText, { color: severityColor }]}>
            {alert.severity}
          </Text>
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {alert.message}
        </Text>

        <Text style={styles.timestamp}>
          {formatDateTime(alert.created_at)}
        </Text>

        {!!(alert.is_acknowledged && alert.acknowledged_at) && (
          <Text style={styles.acknowledgedText}>
            Acknowledged: {formatDateTime(alert.acknowledged_at)}
          </Text>
        )}
      </View>

      {/* Acknowledge button */}
      {!alert.is_acknowledged && onAcknowledge && (
        <TouchableOpacity
          style={styles.acknowledgeButton}
          onPress={onAcknowledge}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="checkmark-circle" size={28} color={colors.success.main} />
        </TouchableOpacity>
      )}

      {alert.is_acknowledged && (
        <View style={styles.acknowledgedIcon}>
          <Ionicons name="checkmark-done" size={24} color={colors.success.main} />
        </View>
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
    alignItems: 'center',
  },
  acknowledgedContainer: {
    opacity: 0.7,
    backgroundColor: colors.grey[50],
  },
  severityBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginVertical: spacing.md,
  },
  contentContainer: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  severityText: {
    ...typography.caption,
    fontWeight: '700',
  },
  message: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: 4,
  },
  timestamp: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  acknowledgedText: {
    ...typography.caption,
    color: colors.success.main,
    marginTop: 2,
  },
  acknowledgeButton: {
    padding: spacing.md,
  },
  acknowledgedIcon: {
    padding: spacing.md,
  },
});
