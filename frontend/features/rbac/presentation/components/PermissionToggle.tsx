/**
 * PermissionToggle Component
 * Toggle switch for enabling/disabling a tenant permission
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { TenantPermissionResponse } from '../../data/models/rbac.dtos';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

interface PermissionToggleProps {
  permission: TenantPermissionResponse;
  isLoading?: boolean;
  onToggle: (permissionId: string, isActive: boolean) => void;
}

export const PermissionToggle: React.FC<PermissionToggleProps> = ({
  permission,
  isLoading = false,
  onToggle,
}) => {
  const { colors, getModuleColor } = useRbacTheme();
  const moduleColor = getModuleColor(permission.module);

  const handleToggle = (value: boolean) => {
    onToggle(permission.id, value);
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={{ checked: permission.is_active }}
      accessibilityLabel={`${permission.name} permission`}
      accessibilityHint={`Double tap to ${permission.is_active ? 'disable' : 'enable'} this permission`}
    >
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name}>{permission.name}</Text>
          <View style={[styles.moduleBadge, { backgroundColor: moduleColor + '20' }]}>
            <Text style={[styles.moduleText, { color: moduleColor }]}>
              {permission.module}
            </Text>
          </View>
        </View>
        <Text style={styles.code}>{permission.code}</Text>
        {!!permission.description && (
          <Text style={styles.description} numberOfLines={2}>
            {permission.description}
          </Text>
        )}
      </View>

      <View style={styles.toggleContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary.main} />
        ) : (
          <Switch
            value={permission.is_active}
            onValueChange={handleToggle}
            trackColor={{
              false: colors.border.light,
              true: colors.primary.main + '60',
            }}
            thumbColor={permission.is_active ? colors.primary.main : '#F4F3F4'}
            ios_backgroundColor={colors.border.light}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  name: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  moduleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moduleText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 10,
  },
  code: {
    ...typography.caption,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  description: {
    ...typography.body2,
    color: '#6B7280',
  },
  toggleContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
