/**
 * useAuth Hook
 * Main authentication hook for components
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { queryClient } from '../../../../core/api/queryClient';
import { setLoggingOut } from '../../../../core/api/authGuard';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuthStore } from '../providers/auth.store';
import { authSessionService } from '../../application/auth-session.service';
import { AuthUserSession, getLandingRoute } from '../../domain/entities/auth.entity';
import { clearWizardDraftStorageForIdentity } from '../../../onboarding/presentation/stores/wizard.store';

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

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const {
    currentUser,
    isAuthenticated,
    isLoading,
    selectedClinicId,
    setSelectedClinic,
    clearSession,
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
        navigateBasedOnStatus(userSession);
      } catch (error) {
        logError('auth.login', error);
        throw error;
      }
    },
    [router]
  );

  /**
   * Logout - clears ALL session state including selectedClinicId
   *
   * T-A.4 (FR-A5, ADR-P1-01, design.md §6.2): order is unauthenticated-flag
   * -> cancel -> clear -> navigate, with the remote Supabase signOut call
   * moved to best-effort AFTER local cleanup. Previously, signOut() was
   * awaited FIRST, so a signOut failure (e.g. network drop) meant
   * clearSession()/cancelQueries()/clear() were never reached at all —
   * the user was left fully authenticated locally despite attempting to
   * log out (see tests/features/auth/logoutBoundary.characterization.test.tsx's
   * baseline for this gap, T-0.4). Local logout must not depend on a
   * network call succeeding.
   */
  const logout = useCallback(async () => {
    // Step 1 (synchronous, unconditional): flip the shared flag axiosClient's
    // request interceptor checks, before anything else — closes the window
    // where an in-flight or React-Query-untracked request could still be
    // issued with a valid token during this transition.
    setLoggingOut(true);
    try {
      const outgoingTenantId = selectedClinicId || currentUser?.tenantId || null;
      const outgoingUserId = currentUser?.userId || currentUser?.id || null;

      // Step 2: clear local session (includes selectedClinicId reset) before
      // any asynchronous draft cleanup. clearSession() itself marks
      // isAuthenticated:false synchronously as its first action, immediately
      // disabling every authenticated query gate.
      const clearSessionPromise = clearSession();

      // Step 3: cancel any in-flight queries and wipe the cache. Without
      // this, a screen that's still mounted during the navigation
      // transition (e.g. one using useFocusEffect to call refetch()
      // directly) can still fire a request — refetch() bypasses each
      // query's `enabled` guard. Between this and the authGuard flag above,
      // any such request goes out unauthenticated and is rejected by the
      // backend with 401 "Authorization header required".
      await queryClient.cancelQueries();
      queryClient.clear();

      if (outgoingUserId) {
        await clearWizardDraftStorageForIdentity({
          tenantId: outgoingTenantId,
          userId: outgoingUserId,
        });
      }
      await clearSessionPromise;

      // Step 4: navigate after state updates settle so the root Stack stays
      // mounted.
      requestIdleCallback(() => {
        router.replace('/login');
      });

      // Best-effort remote signOut, AFTER local cleanup — its failure must
      // not prevent local logout, which has already completed above.
      try {
        await authSessionService.signOutProviderBestEffort();
      } catch (signOutError) {
        logError('auth.logout.provider_signout', signOutError);
      }
    } catch (error) {
      // A genuine failure in local cleanup itself (clearSession/cancelQueries/
      // clear) — distinct from the signOut failure handled above, which is
      // intentionally swallowed. Re-thrown so the UI can still surface it.
      logError('auth.logout', error);
      throw error;
    } finally {
      setLoggingOut(false);
    }
  }, [clearSession, currentUser, router, selectedClinicId]);

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

  /**
   * Navigate based on user status and permissions
   * Priority:
   * 1. Super admin → /super-admin
   * 2. Application status → onboarding flow or active
   * 3. Fallback → /
   */
  const navigateBasedOnStatus = (user: AuthUserSession) => {
    // Super admin always goes to super-admin dashboard
    if (user.isOrgAdmin) {
      router.replace('/super-admin');
      return;
    }

    // Route based on application status
    switch (user.applicationStatus) {
      case 'onboarding':
        if (user.tenantId) {
          router.replace(`/onboarding/wizard-flow?tenantId=${user.tenantId}`);
        } else {
          router.replace('/');
        }
        break;
        
      case 'approved':
        router.replace('/');
        break;
        
      case 'active':
        // Route to appropriate dashboard based on role
        const userRole = user.roles?.[0]?.toLowerCase() || '';
        
        if (userRole === 'doctor') {
          router.replace('/doctor');
        } else if (userRole === 'therapist') {
          router.replace('/therapist');
        } else if (['clinic owner', 'clinic_owner', 'clinic admin', 'clinic_admin', 'receptionist', 'tenant admin', 'tenant_admin'].includes(userRole)) {
          router.replace('/clinic-admin');
        } else {
          // Default to clinic-admin for unknown roles
          router.replace('/clinic-admin');
        }
        break;
        
      case 'pending_review':
        router.replace('/');
        break;
        
      case 'rejected':
        router.replace('/');
        break;
        
      case 'draft':
        router.replace('/');
        break;
        
      default:
        // No tenant or unknown status - fallback to index
        router.replace('/');
    }
  };

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
