import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import {
  useMultiDayAppointmentSettingQuery,
  useUpdateMultiDayAppointmentSettingMutation,
} from '../../data/repositories/clinicAppointmentSettings.repository.impl';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';

/**
 * The normal clinic-configuration surface for the template-supported
 * ``appointments.multiday`` preference. It never calls the rollout-gated
 * generic Capability Platform endpoint.
 */
export const MultiDayAppointmentsSetting = () => {
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId ?? '';
  const settingQuery = useMultiDayAppointmentSettingQuery(tenantId);
  const updateMutation = useUpdateMultiDayAppointmentSettingMutation(tenantId);
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (settingQuery.isLoading || !settingQuery.data?.available) return null;

  const isSaving = updateMutation.isPending;
  const errorMessage = updateMutation.isError ? t('clinicConfiguration.multiday.error') : null;

  return (
    <View style={styles.container} testID="multiday-appointments-setting">
      <View style={styles.copy}>
        <Text style={styles.title}>{t('clinicConfiguration.multiday.title')}</Text>
        <Text style={styles.description}>{t('clinicConfiguration.multiday.description')}</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
      {isSaving ? (
        <ActivityIndicator color={theme.colors.primary.default} testID="multiday-appointments-saving" />
      ) : (
        <Switch
          value={settingQuery.data.enabled}
          onValueChange={enabled => updateMutation.mutate({ enabled, version: settingQuery.data.version })}
          accessibilityRole="switch"
          accessibilityLabel={t('clinicConfiguration.multiday.title')}
          accessibilityState={{ checked: settingQuery.data.enabled }}
        />
      )}
    </View>
  );
};

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface.elevated,
    borderColor: theme.colors.border.default,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  copy: { flex: 1, marginRight: theme.spacing.md },
  title: { ...theme.typography.body1, color: theme.colors.text.primary },
  description: { ...theme.typography.caption, color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
  error: { ...theme.typography.caption, color: theme.colors.feedback.error, marginTop: theme.spacing.xs },
});
