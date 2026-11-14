/**
 * RoleListItem Component
 * Displays a single tenant role in a list
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TenantRoleResponse } from '../../data/models/rbac.dtos';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface RoleListItemProps {
  role: TenantRoleResponse;
  onPress: (role: TenantRoleResponse) => void;
  onEdit?: (role: TenantRoleResponse) => void;
  onDelete?: (role: TenantRoleResponse) => void;
}

export const RoleListItem: React.FC<RoleListItemProps> = ({
  role,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors, getRoleTypeColor } = useRbacTheme();
  const roleColor = getRoleTypeColor(role.is_system, role.is_active);

  const accessibilityProps: AccessibilityProps = {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: `${role.name} role${role.is_system ? ', system role' : ''}${!role.is_active ? ', inactive' : ''}`,
    accessibilityHint: 'Double tap to view role details',
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(role)}
      activeOpacity={0.7}
      {...accessibilityProps}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: roleColor + '20' }]}>
          <Ionicons
            name={role.is_system ? 'shield-checkmark' : 'people'}
            size={24}
            color={roleColor}
          />
        </View>

        {/* Role Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {role.name}
            </Text>
            {role.is_system && (
              <View style={[styles.badge, { backgroundColor: colors.roles.system + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.roles.system }]}>
                  System
                </Text>
              </View>
            )}
            {!role.is_active && (
              <View style={[styles.badge, { backgroundColor: colors.status.inactive + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.status.inactive }]}>
                  Inactive
                </Text>
              </View>
            )}
          </View>
          {!!role.description && (
            <Text style={styles.description} numberOfLines={2}>
              {role.description}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {onEdit && !role.is_system && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(role)}
              accessibilityLabel={`Edit ${role.name} role`}
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={18} color={colors.primary.main} />
            </TouchableOpacity>
          )}
          {onDelete && !role.is_system && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(role)}
              accessibilityLabel={`Delete ${role.name} role`}
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color={colors.feedback.error} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  name: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  description: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
