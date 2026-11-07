/**
 * TenantRbacOverviewScreen
 * Main RBAC dashboard for a tenant
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { StatCard } from '../../../../core/components/StatCard';
import { QuickActionButton } from '../../../../core/components/QuickActionButton';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useRbacTheme } from '../hooks/useRbacTheme';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import {
  useTenantRolesQuery,
  useTenantPermissionsQuery,
  useTenantUsersQuery,
  useTenantUserRolesQuery,
} from '../../data/repositories/rbac.repository.impl';
import { useTenantQuery } from '../../../tenants/data/repositories/tenants.repository.impl';
import { useOrganizationTenantScope } from '../../../tenants/presentation/hooks/useOrganizationTenantScope';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

export const TenantRbacOverviewScreen: React.FC = () => {
  const router = useRouter();
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const { colors } = useRbacTheme();
  const { createQueryErrorHandler } = useApiErrorHandler();
  const { organizationId } = useOrganizationTenantScope();

  // Fetch tenant info
  const tenantQuery = useTenantQuery(organizationId, tenantId || '', {
    enabled: Boolean(tenantId && organizationId),
  });

  // Fetch RBAC data
  const rolesQuery = useTenantRolesQuery(tenantId || '', { limit: 100 }, {
    enabled: !!tenantId,
  });

  const permissionsQuery = useTenantPermissionsQuery(tenantId || '', { limit: 100 }, {
    enabled: !!tenantId,
  });

  const usersQuery = useTenantUsersQuery(tenantId || '', { limit: 100 }, {
    enabled: !!tenantId,
  });

  const userRolesQuery = useTenantUserRolesQuery(tenantId || '', { limit: 100 }, {
    enabled: !!tenantId,
  });

  const isLoading = rolesQuery.isLoading || permissionsQuery.isLoading || 
                    usersQuery.isLoading || userRolesQuery.isLoading;
  const isError = rolesQuery.isError || permissionsQuery.isError ||
                  usersQuery.isError || userRolesQuery.isError;
  const isRefreshing = rolesQuery.isRefetching || permissionsQuery.isRefetching ||
                       usersQuery.isRefetching || userRolesQuery.isRefetching;

  const handleRefresh = () => {
    rolesQuery.refetch();
    permissionsQuery.refetch();
    usersQuery.refetch();
    userRolesQuery.refetch();
  };

  // Calculate stats
  const totalRoles = rolesQuery.data?.total || 0;
  const activeRoles = rolesQuery.data?.items.filter(r => r.is_active).length || 0;
  const totalPermissions = permissionsQuery.data?.total || 0;
  const activePermissions = permissionsQuery.data?.items.filter(p => p.is_active).length || 0;
  const totalUsers = usersQuery.data?.total || 0;
  const activeAssignments = userRolesQuery.data?.items.filter(a => a.is_active).length || 0;

  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState
          title="No Tenant Selected"
          message="Please select a tenant to manage RBAC."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader
          title="RBAC Management"
          subtitle="Loading..."
          onBackPress={() => router.back()}
        />
        <LoadingState message="Loading RBAC data..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader
          title="RBAC Management"
          subtitle="Error"
          onBackPress={() => router.back()}
        />
        <ErrorState
          title="Failed to Load RBAC Data"
          message="Could not load RBAC information for this tenant."
          onRetry={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="RBAC Management"
        subtitle={tenantQuery.data?.name || 'Tenant'}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <StatCard
                title="Tenant Roles"
                value={totalRoles.toString()}
                icon="shield-checkmark"
                color={colors.primary.main}
                trend={{
                  value: `${activeRoles} active`,
                  isPositive: activeRoles > 0,
                }}
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Permissions"
                value={totalPermissions.toString()}
                icon="key"
                color={colors.secondary.main}
                trend={{
                  value: `${activePermissions} enabled`,
                  isPositive: activePermissions > 0,
                }}
              />
            </View>
            <View style={styles.statItem}>
              <StatCard
                title="Tenant Users"
                value={totalUsers.toString()}
                icon="people"
                color="#3B82F6"
                trend={{
                  value: `${activeAssignments} role assignments`,
                  isPositive: activeAssignments > 0,
                }}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage RBAC</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="shield-checkmark"
              label="Manage Roles"
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/roles`)}
              color={colors.primary.main}
            />
            <QuickActionButton
              icon="key"
              label="Permissions"
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/permissions`)}
              color={colors.secondary.main}
            />
            <QuickActionButton
              icon="person-add"
              label="User Roles"
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/users`)}
              color="#3B82F6"
            />
            <QuickActionButton
              icon="time"
              label="Audit History"
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/audit`)}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Recent Roles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Roles</Text>
            <TouchableOpacity
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/roles`)}
            >
              <Text style={[styles.viewAll, { color: colors.primary.main }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {rolesQuery.data?.items.slice(0, 3).map((role) => (
            <TouchableOpacity
              key={role.id}
              style={styles.roleItem}
              onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac/roles`)}
            >
              <View style={styles.roleInfo}>
                <View style={[
                  styles.roleIcon,
                  { backgroundColor: role.is_system ? '#6366F1' + '20' : colors.primary.main + '20' }
                ]}>
                  <Ionicons
                    name={role.is_system ? 'shield-checkmark' : 'people'}
                    size={20}
                    color={role.is_system ? '#6366F1' : colors.primary.main}
                  />
                </View>
                <View style={styles.roleDetails}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleType}>
                    {role.is_system ? 'System Role' : 'Custom Role'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: role.is_active ? colors.status.active + '20' : colors.status.inactive + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: role.is_active ? colors.status.active : colors.status.inactive }
                ]}>
                  {role.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: '#1F2937',
    marginBottom: spacing.md,
  },
  viewAll: {
    ...typography.body2,
    fontWeight: '600',
  },
  statsGrid: {
    gap: spacing.md,
  },
  statItem: {
    marginBottom: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleDetails: {
    flex: 1,
  },
  roleName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  roleType: {
    ...typography.caption,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default TenantRbacOverviewScreen;
