/**
 * useAuth Hook
 * Main authentication hook for components
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { setLoggingOut } from '../../../../core/api/authGuard';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuthStore } from '../providers/auth.store';
import { authSessionService } from '../../application/auth-session.service';
import { unifiedLogoutService } from '../../application/unified-logout.service';
import { AuthUserSession, getLandingRoute } from '../../domain/entities/auth.entity';

interface UseAuthReturn {
  currentUser: AuthUserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedClinicId: string | null;
  setSelectedClinic: (clinicId: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapSession: () => Promise<{ authenticated: boolean; session: AuthUserSession | null }>;
  /** Refreshes the backend-authoritative application context. */
  refreshSession: () => Promise<AuthUserSession>;
  navigateToLanding: () => void;
}

function navigateBasedOnStatus(
  router: { replace: (route: any) => void },
  user: AuthUserSession
): void {
  if (user.isOrgAdmin) {
    router.replace('/super-admin');
    return;
  }

  switch (user.applicationStatus) {
    case 'onboarding':
      router.replace(user.tenantId ? `/onboarding/wizard-flow?tenantId=${user.tenantId}` : '/');
      break;
    case 'approved':
    case 'pending_review':
    case 'rejected':
    case 'draft':
      router.replace('/');
      break;
    case 'active': {
      const userRole = user.roles?.[0]?.toLowerCase() || '';
      if (userRole === 'doctor') router.replace('/doctor');
      else if (userRole === 'therapist') router.replace('/therapist');
      else router.replace('/clinic-admin');
      break;
    }
    default:
      router.replace('/');
  }
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    selectedClinicId,
    setSelectedClinic,
  } = useAuthStore();

  /**
   * Navigate to the appropriate landing page based on user context
   * Uses centralized logic from auth.entity.ts
   */
  const navigateToLanding = useCallback(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    
    const route = getLandingRoute(currentUser);
    router.replace(route as any);
  }, [currentUser, router]);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string) => {
      // T-A.4: defensive reset — the authGuard flag is set/cleared around
      // logout()'s own lifecycle, but a fresh login should never be
      // suppressed by it regardless.
      setLoggingOut(false);
      try {
        const userSession = await authSessionService.login(email, password);
        navigateBasedOnStatus(router, userSession);
      } catch (error) {
        logError('auth.login', error);
        throw error;
      }
    },
    [router]
  );

  /** Presentation-compatible entry point for the canonical explicit-user logout command. */
  const logout = useCallback(async () => {
    return unifiedLogoutService.logout({
      navigateToLogin: () => {
        requestIdleCallback(() => {
        router.replace('/login');
        });
      },
    });
  }, [router]);

  /**
   * Bootstrap session on app start
   */
  const bootstrapSession = useCallback(async () => {
    return authSessionService.bootstrap();
  }, []);

  /**
   * Refresh session to get updated JWT token with tenant_id
   * CRITICAL: Must be called after demo creation to get tenant_id in token
   */
  const refreshSession = useCallback(async () => {
    try {
      return await authSessionService.refresh();
    } catch (error) {
      logError('auth.refresh', error);
      throw error;
    }
  }, []);

  return {
    currentUser,
    isAuthenticated,
    isLoading,
    selectedClinicId,
    setSelectedClinic,
    login,
    logout,
    bootstrapSession,
    refreshSession,
    navigateToLanding,
  };
};

/**
 * Hook for post-login redirect logic
 * Can be used by any component that needs to redirect after auth state changes
 */
export const usePostLoginRedirect = () => {
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAuthStore();

  const redirect = useCallback(() => {
    if (!isAuthenticated || !currentUser) {
      router.replace('/login');
      return;
    }

    const route = getLandingRoute(currentUser);
    router.replace(route as any);
  }, [currentUser, isAuthenticated, router]);

  return { redirect, targetRoute: currentUser ? getLandingRoute(currentUser) : '/login' };
};
