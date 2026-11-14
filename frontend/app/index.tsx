/**
 * Index Page - Permission-based Dashboard Redirect
 * Automatically redirects authenticated users to their appropriate dashboard
 * 
 * Logic:
 * - isOrgAdmin = true -> Super Admin dashboard
 * - tenantId exists -> Clinic Admin dashboard (user belongs to a tenant/clinic)
 * - No tenantId -> Show message to contact admin
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../features/auth/presentation/hooks/useAuth';
import { useRegistrationStatus } from '../features/registration/presentation/hooks/useRegistrationStatus';
import { useOnboardingStatusQuery } from '../features/onboarding/data/repositories/onboarding.repository.impl';
import { colors } from '../core/theme/colors';
import { typography } from '../core/theme/typography';
import { spacing } from '../core/theme/spacing';
import { logError } from '../core/utils/errorHandler';
import { useTranslation } from '../core/localization/useTranslation';
import { resolveDashboardRoute } from '../features/auth/domain/dashboardRoute';
import { resolveRegistrationStatusRoute } from '../features/registration/presentation/registrationStatusRouting';

export default function Index() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, currentUser, logout } = useAuth();
  
  // Fetch registration status only when user has no tenant and is not org admin
  const { data: regStatus, isLoading: isLoadingRegStatus } = useRegistrationStatus({
    enabled: !!currentUser && !currentUser.tenantId && !currentUser.isOrgAdmin,
  });

  // Fetch onboarding status if user has a tenant
  // Note: This query may fail for users without tenant.read permission, which is OK
  const { data: onboardingStatus, isLoading: isLoadingOnboarding } = useOnboardingStatusQuery(
    currentUser?.tenantId || '',
    {
      // Only needed to pick a destination when /auth/me gave no application status. A user without tenant.read (for
      // example Staff) is refused: that is expected here and must not raise the global "unexpected error" dialog.
      enabled: !!currentUser?.tenantId && !currentUser?.applicationStatus,
      retry: false,
      meta: { apiFailurePresentation: 'feature' },
    }
  );
  const registrationRoute = regStatus ? resolveRegistrationStatusRoute(regStatus) : null;

  useEffect(() => {
    // Wait for auth and registration status to be determined
    // Don't wait for onboarding status if user has applicationStatus (it's redundant)
    if (isLoading || isLoadingRegStatus) {
      return;
    }
    
    // Only wait for onboarding status if we don't have applicationStatus
    if (!currentUser?.applicationStatus && isLoadingOnboarding) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !currentUser) {
      router.replace('/login');
      return;
    }

    // Priority 1: Org Admin (Super Admin) always goes to super-admin
    if (currentUser.isOrgAdmin) {
      router.replace('/super-admin');
      return;
    }

    // Priority 2: Route based on application_status from /auth/me.
    // Status pages and the approval choice screen need application_id, which
    // /auth/me does not provide. For no-tenant users, use registration status.
    if (currentUser.applicationStatus) {
      switch (currentUser.applicationStatus) {
        case 'onboarding':
          if (currentUser.tenantId) {
            router.replace(`/onboarding/setup-wizard?tenantId=${currentUser.tenantId}`);
            return;
          }
          break;
        case 'active':
          // Route to the dashboard of the user's role; a role without a dashboard is explained below (no redirect).
          {
            const target = resolveDashboardRoute(currentUser.roles);
            if (target) router.replace(target);
          }
          return;
        case 'approved':
          break;
        case 'pending_review':
          break;
        case 'rejected':
          break;
        case 'draft':
          break;
      }
    }

    // Priority 3: Fallback to tenant-based routing (for backward compatibility)
    if (currentUser.tenantId) {
      // If onboarding status query failed or is still loading, don't make routing decisions yet
      if (isLoadingOnboarding) {
        return;
      }
      
      // User has a tenant - check if onboarding is complete
      if (onboardingStatus && !onboardingStatus.is_ready_to_go_live) {
        router.replace(`/onboarding/setup-wizard?tenantId=${currentUser.tenantId}`);
      } else if (onboardingStatus && onboardingStatus.is_ready_to_go_live) {
        // Route to the dashboard of the user's role; a role without a dashboard is explained below (no redirect).
        const target = resolveDashboardRoute(currentUser.roles);
        if (target) router.replace(target);
      } else {
        // onboardingStatus is null/undefined (query failed)
        // Assume onboarding is not complete and route to wizard
        router.replace(`/onboarding/setup-wizard?tenantId=${currentUser.tenantId}`);
      }
      return;
    }

    // Priority 4: Handle registration status routing (legacy flow)
    if (regStatus) {
      if (registrationRoute) {
        router.replace(registrationRoute);
      }
      return;
    }
    // If no tenantId, not org admin, and no regStatus, show the "no tenant" state in render
    
  }, [isAuthenticated, isLoading, isLoadingRegStatus, isLoadingOnboarding, currentUser, regStatus, onboardingStatus, registrationRoute, router]);

  // Show loading while determining auth and redirecting
  if (isLoading || isLoadingRegStatus || isLoadingOnboarding) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.text}>{t('applicationStatus.loading')}</Text>
      </View>
    );
  }

  // If authenticated but no tenant and not org admin, show message
  if (isAuthenticated && currentUser && !currentUser.isOrgAdmin && !currentUser.tenantId && registrationRoute) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.text}>{t('applicationStatus.loading')}</Text>
      </View>
    );
  }

  if (isAuthenticated && currentUser && !currentUser.isOrgAdmin && !currentUser.tenantId) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={64} color={colors.warning.main} />
        <Text style={styles.title}>{t('applicationStatus.noClinic.title')}</Text>
        <Text style={styles.text}>
          {t('applicationStatus.noClinic.description')}
        </Text>
        <Text style={styles.email}>{t('applicationStatus.noClinic.loggedInAs', { email: currentUser.email })}</Text>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={async () => {
            try {
              await logout();
            } catch (error) {
              logError('index.logout', error);
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error.main} />
          <Text style={styles.logoutText}>{t('applicationStatus.actions.signOut')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // A user whose roles have no dashboard (e.g. "Staff") is told so instead of being redirected around in a loop.
  const dashboardWouldOpen =
    currentUser?.applicationStatus === 'active' ||
    (!currentUser?.applicationStatus && !!onboardingStatus?.is_ready_to_go_live);
  if (
    isAuthenticated &&
    currentUser &&
    !currentUser.isOrgAdmin &&
    !!currentUser.tenantId &&
    dashboardWouldOpen &&
    resolveDashboardRoute(currentUser.roles) === null
  ) {
    return (
      <View style={styles.container}>
        <Ionicons name="information-circle" size={64} color={colors.warning.main} />
        <Text style={styles.title}>{t('applicationStatus.noDashboard.title')}</Text>
        <Text style={styles.text}>{t('applicationStatus.noDashboard.description')}</Text>
        <Text style={styles.email}>{t('applicationStatus.noClinic.loggedInAs', { email: currentUser.email })}</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            try {
              await logout();
            } catch (error) {
              logError('index.logout', error);
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error.main} />
          <Text style={styles.logoutText}>{t('applicationStatus.actions.signOut')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Default loading state while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.main} />
      <Text style={styles.text}>{t('applicationStatus.loadingDashboard')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    padding: spacing.xl,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
    maxWidth: 300,
  },
  email: {
    ...typography.body2,
    color: colors.text.disabled,
    marginTop: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.error.main + '15',
    borderRadius: 8,
    marginTop: spacing.xl,
  },
  logoutText: {
    ...typography.button,
    color: colors.error.main,
    marginLeft: spacing.sm,
  },
});
