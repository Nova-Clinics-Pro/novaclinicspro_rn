/**
 * RolePermissionsScreen - the owner customizes what each role can do in the clinic.
 *
 * Every role starts from the platform's default permissions; the owner adds or revokes operational
 * permissions to fit the clinic's policy. The backend decides what is locked (clinical authoring, role
 * management, the Owner role); locked rows are shown disabled with the reason, never hidden, so the owner
 * can see why. Everything on screen is localized, including refusals.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { ApiErrorState } from '../../../../core/components/ui/ApiErrorState';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { classifyApiError } from '../../../../core/api/apiErrorPresentation';
import { describePermissionAction } from '../../../../core/localization/apiErrorMessages';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { useTenantRolesQuery } from '../../data/repositories/rbac.repository.impl';
import {
  useResetRolePermissionsMutation,
  useRolePermissionsQuery,
  useSetRolePermissionMutation,
} from '../../data/repositories/rolePermissions.repository';
import { customizationCount, groupRolePermissions } from '../../domain/rolePermissionPresentation';

const OWNER_ROLE_NAME = 'Clinic Owner';

/** Localized text for a failed change: the backend's refusal code first, then the generic API explanation. */
export const changeErrorMessage = (t: (k: string, p?: Record<string, string | number>) => string, error: unknown): string => {
  const detail = (error as { response?: { data?: { detail?: { error_code?: unknown } } } })?.response?.data?.detail;
  const code = typeof detail?.error_code === 'string' ? detail.error_code : undefined;
  if (code) {
    const key = `rolePermissions.errors.${code}`;
    const text = t(key);
    if (text !== key) return text;
  }
  const info = classifyApiError(error);
  return info.kind === 'permission_denied' || info.kind === 'entitlement_required' || info.kind === 'network' || info.kind === 'server'
    ? t(`errors.apiState.${info.kind === 'network' ? 'network' : info.kind === 'server' ? 'server' : 'unknown'}`)
    : t('rolePermissions.saveFailed');
};

export const RolePermissionsScreen: React.FC = () => {
  const router = useRouter();
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const tenantId = useAuthStore(state => state.currentUser?.tenantId) ?? '';
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const rolesQuery = useTenantRolesQuery(tenantId, { limit: 50 }, { enabled: Boolean(tenantId) });
  const roles = useMemo(() => rolesQuery.data?.items ?? [], [rolesQuery.data]);
  // Open on the first role that can be edited; the Owner role is protected and only explains itself.
  const activeRoleId = selectedRoleId ?? roles.find(role => role.name !== OWNER_ROLE_NAME)?.id ?? roles[0]?.id ?? null;
  const permissionsQuery = useRolePermissionsQuery(tenantId, activeRoleId);
  const setPermission = useSetRolePermissionMutation(tenantId, activeRoleId ?? '');
  const resetRole = useResetRolePermissionsMutation(tenantId, activeRoleId ?? '');

  const view = permissionsQuery.data;
  const groups = useMemo(() => (view ? groupRolePermissions(t, view.items) : []), [view, t]);
  const customized = view ? customizationCount(view.items) : 0;
  const isOwnerRole = view?.role_name === OWNER_ROLE_NAME;

  const apply = (code: string, enabled: boolean) =>
    setPermission.mutate({ code, enabled }, { onError: (error) => Alert.alert(t('rolePermissions.title'), changeErrorMessage(t, error)) });

  const onToggle = (code: string, label: string, enabled: boolean) => {
    if (enabled || !view) return apply(code, enabled);
    // Taking a permission away from a whole role deserves a second look.
    Alert.alert(
      t('rolePermissions.revoke.title'),
      t('rolePermissions.revoke.message', { role: view.role_name, action: describePermissionAction(t, code) === t('errors.permissionDenied.genericAction') ? label : describePermissionAction(t, code) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('rolePermissions.revoke.confirm'), style: 'destructive', onPress: () => apply(code, false) },
      ],
    );
  };

  const onReset = () => {
    if (!view) return;
    Alert.alert(t('rolePermissions.reset.title', { role: view.role_name }), t('rolePermissions.reset.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('rolePermissions.reset.confirm'),
        style: 'destructive',
        onPress: () => resetRole.mutate(undefined, {
          onSuccess: () => Alert.alert(t('rolePermissions.title'), t('rolePermissions.reset.done', { role: view.role_name })),
          onError: (error) => Alert.alert(t('rolePermissions.title'), changeErrorMessage(t, error)),
        }),
      },
    ]);
  };

  const loadError = rolesQuery.isError ? rolesQuery.error : permissionsQuery.isError ? permissionsQuery.error : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface.default }} edges={['top']}>
      <DashboardHeader title={t('rolePermissions.title')} subtitle={t('rolePermissions.subtitle')} onBackPress={() => router.back()} />
      {loadError ? (
        <ApiErrorState error={loadError} onRetry={() => { void rolesQuery.refetch(); void permissionsQuery.refetch(); }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
          <Text style={{ ...theme.typography.body2, color: theme.colors.text.secondary }}>{t('rolePermissions.intro')}</Text>

          <Text accessibilityRole="header" style={{ ...theme.typography.h3, color: theme.colors.text.primary }}>{t('rolePermissions.selectRole')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
            {roles.map(role => {
              const selected = role.id === activeRoleId;
              return (
                <TouchableOpacity
                  key={role.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedRoleId(role.id)}
                  style={{
                    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.medium,
                    borderWidth: 1, borderColor: selected ? theme.colors.primary.default : theme.colors.border.default,
                    backgroundColor: selected ? theme.colors.primary.soft : theme.colors.surface.default,
                  }}
                >
                  <Text style={{ ...theme.typography.button, color: selected ? theme.colors.primary.default : theme.colors.text.primary }}>{role.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {rolesQuery.isSuccess && roles.length === 0 ? (
            <Text style={{ color: theme.colors.text.secondary }}>{t('rolePermissions.empty')}</Text>
          ) : null}

          {permissionsQuery.isLoading ? <ActivityIndicator /> : null}

          {view ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ ...theme.typography.body2, color: theme.colors.text.secondary }}>
                  {customized > 0 ? t('rolePermissions.customizedCount', { count: customized }) : t('rolePermissions.defaultsOnly')}
                </Text>
                {!isOwnerRole && customized > 0 ? (
                  <TouchableOpacity accessibilityRole="button" onPress={onReset} disabled={resetRole.isPending}>
                    <Text style={{ ...theme.typography.button, color: theme.colors.text.link }}>{t('rolePermissions.reset.button')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {isOwnerRole ? (
                <Text style={{ ...theme.typography.body2, color: theme.colors.text.secondary }}>{t('rolePermissions.ownerRoleNote')}</Text>
              ) : null}

              {groups.map(group => (
                <View key={group.module} style={{ gap: theme.spacing.xs }}>
                  <Text accessibilityRole="header" style={{ ...theme.typography.h3, color: theme.colors.text.primary }}>{group.title}</Text>
                  {group.rows.map(row => (
                    <View
                      key={row.code}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm,
                        paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...theme.typography.body1, color: theme.colors.text.primary }}>{row.label}</Text>
                        {row.badge ? (
                          <Text style={{ ...theme.typography.caption, color: theme.colors.text.secondary }}>
                            {t(`rolePermissions.badges.${row.badge}`)}
                          </Text>
                        ) : null}
                        {row.locked ? (
                          <Text style={{ ...theme.typography.caption, color: theme.colors.text.secondary }}>
                            {t('rolePermissions.lockedExplanation')}
                          </Text>
                        ) : null}
                      </View>
                      {row.locked ? <Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.secondary} accessibilityLabel={t('rolePermissions.locked')} /> : null}
                      <Switch
                        accessibilityLabel={row.label}
                        value={row.effective}
                        disabled={row.locked || setPermission.isPending}
                        onValueChange={(value) => onToggle(row.code, row.label, value)}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
