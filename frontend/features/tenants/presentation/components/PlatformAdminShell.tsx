import React, { PropsWithChildren } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { ConfirmationDialog } from '../../../../core/components/ConfirmationDialog';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useLogoutConfirmation } from '../../../../core/hooks/useLogoutConfirmation';
import { useBackNavigation } from '../../../../core/hooks/useBackNavigation';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { platformTenantRoutes } from '../../application/platformTenantRoutes';
import { t } from '../../../../core/localization';

export function PlatformAdminShell({ children, showBack = false }: PropsWithChildren<{ showBack?: boolean }>) {
  const theme = useClinicTheme();
  const { logout, currentUser } = useAuth();
  const confirmation = useLogoutConfirmation(logout);
  const back = useBackNavigation(platformTenantRoutes.dashboard);
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.default }}>
    <DashboardHeader showActionLabels title={t('platformAdmin.title')} userName={currentUser?.fullName} showNotifications={false} onLogoutPress={confirmation.requestLogout} onBackPress={showBack ? back : undefined} />
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>{children}</ScrollView>
    <ConfirmationDialog {...confirmation.dialog} />
  </SafeAreaView>;
}
