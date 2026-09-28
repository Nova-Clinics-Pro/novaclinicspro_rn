/**
 * useAuth Hook
 * Main authentication hook for components
 */

import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../core/api/supabaseClient';
import { queryClient } from '../../../../core/api/queryClient';
import { setLoggingOut } from '../../../../core/api/authGuard';
import { logError } from '../../../../core/utils/errorHandler';
import { useAuthStore } from '../providers/auth.store';
import { authRepository } from '../../data/repositories/auth.repository.impl';
import { BootstrapSessionUseCase } from '../../domain/usecases/bootstrap-session.usecase';
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
    setTokens,
    setCurrentUser,
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
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Map Supabase error codes to user-friendly messages
          let friendlyMessage = error.message;
          if (error.message.includes('Invalid login credentials')) {
            friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
          } else if (error.message.includes('Email not confirmed')) {
            friendlyMessage = 'Please verify your email address before logging in.';
          } else if (error.message.includes('Too many requests')) {
            friendlyMessage = 'Too many login attempts. Please wait a few minutes and try again.';
          }
          throw new Error(friendlyMessage);
        }

        if (!data.session) {
          throw new Error('No session returned from login');
        }

        // Store tokens
        await setTokens(data.session.access_token, data.session.refresh_token);

        // Fetch user context from backend — retry once on network drop
        // (backend may return 200 but connection drops before body arrives)
        const fetchUserWithRetry = async (): Promise<ReturnType<typeof authRepository.getCurrentUser>> => {
          try {
            return await authRepository.getCurrentUser();
          } catch (firstErr: any) {
            const isNetworkDrop = firstErr?.isAxiosError && !firstErr?.response;
            if (isNetworkDrop) {
              await new Promise(resolve => setTimeout(resolve, 800));
              return await authRepository.getCurrentUser();
            }
            throw firstErr;
          }
        };

        try {
          const userSession = await fetchUserWithRetry();
          setCurrentUser(userSession);

          // Navigate based on status
          navigateBasedOnStatus(userSession);
        } catch (backendError: any) {
          logError('auth.login.backend_context', backendError);
          // If backend fails, sign out from Supabase to avoid inconsistent state
          await supabase.auth.signOut();
          await clearSession();
          
          // Provide meaningful error based on status code
          if (backendError?.response?.status === 401) {
            throw new Error('Your account is not authorized. Please contact support.');
          } else if (backendError?.response?.status === 403) {
            throw new Error('Access denied. Your account may be suspended.');
          } else if (backendError?.response?.status === 404) {
            throw new Error('User profile not found. Please contact support to set up your account.');
          } else if (backendError?.isAxiosError && !backendError?.response) {
            throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
          } else {
            throw new Error('Unable to load your profile. Please try again later.');
          }
        }
      } catch (error) {
        logError('auth.login', error);
        throw error;
      }
    },
    [setTokens, setCurrentUser, clearSession, router]
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
        await supabase.auth.signOut();
      } catch (signOutError) {
        logError('auth.logout.supabase_signout', signOutError);
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
    const useCase = new BootstrapSessionUseCase(authRepository);
    const result = await useCase.execute();

    if (result.authenticated && result.session) {
      setCurrentUser(result.session);
    }
    
    return result;
  }, [setCurrentUser]);

  /**
   * Refresh session to get updated JWT token with tenant_id
   * CRITICAL: Must be called after demo creation to get tenant_id in token
   */
  const refreshSession = useCallback(async () => {
    try {
      // Refresh the Supabase session to get new JWT with tenant_id
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logError('auth.refresh.token', error);
        throw new Error('Failed to refresh session');
      }

      if (!data.session) {
        throw new Error('No session returned from refresh');
      }

      // Store new tokens
      await setTokens(data.session.access_token, data.session.refresh_token);

      // Fetch updated user context from backend (now includes tenant_id)
      const userSession = await authRepository.getCurrentUser();
      setCurrentUser(userSession);
      return userSession;
    } catch (error) {
      logError('auth.refresh', error);
      throw error;
    }
  }, [setTokens, setCurrentUser]);

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
