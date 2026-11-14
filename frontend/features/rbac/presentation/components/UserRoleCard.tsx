/**
 * UserRoleCard Component
 * Displays a user with their assigned roles
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TenantUserRoleResponse, TenantRoleResponse } from '../../data/models/rbac.dtos';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface UserRoleCardProps {
  assignment: TenantUserRoleResponse;
  role?: TenantRoleResponse;
  userName?: string;
  userEmail?: string;
  onPress?: (assignment: TenantUserRoleResponse) => void;
  onRemove?: (assignment: TenantUserRoleResponse) => void;
}

export const UserRoleCard: React.FC<UserRoleCardProps> = ({
  assignment,
  role,
  userName,
  userEmail,
  onPress,
  onRemove,
}) => {
  const { colors, getStatusColor } = useRbacTheme();
  
  const isExpired = assignment.expires_at 
    ? new Date(assignment.expires_at) < new Date() 
    : false;
  const statusColor = getStatusColor(assignment.is_active, isExpired);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(assignment)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${role?.name || 'Role'} assigned to ${userName || 'user'}${isExpired ? ', expired' : ''}`}
    >
      <View style={styles.content}>
        {/* User Icon */}
        <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
          <Ionicons
            name={isExpired ? 'time-outline' : 'person'}
            size={24}
            color={statusColor}
          />
        </View>

        {/* Assignment Info */}
        <View style={styles.info}>
          <View style={styles.headerRow}>
            <Text style={styles.roleName} numberOfLines={1}>
              {role?.name || 'Unknown Role'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {isExpired ? 'Expired' : assignment.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {!!((userName || userEmail)) && (
            <Text style={styles.userInfo} numberOfLines={1}>
              {userName || userEmail}
            </Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Assigned: {formatDate(assignment.assigned_at)}
            </Text>
            {!!assignment.expires_at && (
              <Text style={[styles.metaText, isExpired && styles.expiredText]}>
                {isExpired ? 'Expired' : 'Expires'}: {formatDate(assignment.expires_at)}
              </Text>
            )}
          </View>
        </View>

        {/* Remove Button */}
        {onRemove && assignment.is_active && !isExpired && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(assignment)}
            accessibilityLabel={`Remove ${role?.name} role`}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={24} color={colors.feedback.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  roleName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  userInfo: {
    ...typography.body2,
    color: '#4B5563',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: '#9CA3AF',
  },
  expiredText: {
    color: '#EF4444',
  },
  removeButton: {
    padding: spacing.xs,
  },
});
