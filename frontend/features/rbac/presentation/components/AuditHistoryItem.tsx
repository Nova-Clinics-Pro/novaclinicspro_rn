/**
 * AuditHistoryItem Component
 * Displays a single RBAC audit history entry
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TenantUserRoleHistoryResponse } from '../../data/models/rbac.dtos';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface AuditHistoryItemProps {
  item: TenantUserRoleHistoryResponse;
  roleName?: string;
  performedByName?: string;
  onPress?: (item: TenantUserRoleHistoryResponse) => void;
}

export const AuditHistoryItem: React.FC<AuditHistoryItemProps> = ({
  item,
  roleName,
  performedByName,
  onPress,
}) => {
  const { colors, getActionColor } = useRbacTheme();
  const actionColor = getActionColor(item.action);

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    switch (action) {
      case 'assigned':
        return 'add-circle';
      case 'removed':
        return 'remove-circle';
      case 'updated':
        return 'refresh-circle';
      case 'expired':
        return 'time';
      default:
        return 'ellipse';
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'assigned':
        return 'Role Assigned';
      case 'removed':
        return 'Role Removed';
      case 'updated':
        return 'Role Updated';
      case 'expired':
        return 'Role Expired';
      default:
        return action;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${getActionLabel(item.action)} on ${formatDateTime(item.performed_at)}`}
    >
      {/* Timeline indicator */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: actionColor }]} />
        <View style={styles.timelineLine} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
            <Ionicons
              name={getActionIcon(item.action)}
              size={14}
              color={actionColor}
            />
            <Text style={[styles.actionText, { color: actionColor }]}>
              {getActionLabel(item.action)}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {formatDateTime(item.performed_at)}
          </Text>
        </View>

        <Text style={styles.roleName}>
          {roleName || `Role ID: ${item.role_id.slice(0, 8)}...`}
        </Text>

        {!!performedByName && (
          <Text style={styles.performedBy}>
            By: {performedByName}
          </Text>
        )}

        {!!item.reason && (
          <View style={styles.reasonContainer}>
            <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" />
            <Text style={styles.reason} numberOfLines={2}>
              {item.reason}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionText: {
    ...typography.caption,
    fontWeight: '600',
  },
  timestamp: {
    ...typography.caption,
    color: '#9CA3AF',
  },
  roleName: {
    ...typography.body2,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  performedBy: {
    ...typography.caption,
    color: '#6B7280',
    marginBottom: 4,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reason: {
    ...typography.caption,
    color: '#6B7280',
    flex: 1,
    fontStyle: 'italic',
  },
});
