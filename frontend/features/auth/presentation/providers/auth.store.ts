/**
 * Auth Store - Zustand
 * Client-side auth state management with platform-aware secure token storage
 */

import { create } from 'zustand';
import { supabase } from '../../../../core/api/supabaseClient';
import { secureStorage } from '../../../../core/utils/secureStorage';
import { AuthUserSession } from '../../domain/entities/auth.entity';
import { logError } from '../../../../core/utils/errorHandler';

const ACCESS_TOKEN_KEY = 'supabase_access_token';
const REFRESH_TOKEN_KEY = 'supabase_refresh_token';
const SELECTED_CLINIC_KEY = 'selected_clinic_id';

/** Prevent two app bootstrap paths from consuming the same refresh token. */
let storageBootstrap: Promise<void> | null = null;

interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: AuthUserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Currently selected clinic ID for multi-clinic owners.
   * Single source of truth for the active clinic context in clinic admin / staff screens.
   */
  selectedClinicId: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setCurrentUser: (user: AuthUserSession) => void;
  setSelectedClinic: (clinicId: string | null) => void;
  clearSession: () => Promise<void>;
  initializeFromStorage: () => Promise<void>;
  completeBootstrap: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  accessToken: null,
  refreshToken: null,
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
  selectedClinicId: null,

  // Set tokens and persist to secure storage
  setTokens: async (accessToken: string, refreshToken: string) => {
    try {
      await secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      set({ accessToken, refreshToken });
    } catch (error) {
      logError('auth.token_persistence.save', error);
      // Don't throw - allow login to continue even if storage fails
      // Set tokens in memory even if persistence fails
      set({ accessToken, refreshToken });
    }
  },

  // Set current user
  setCurrentUser: (user: AuthUserSession) => {
    const currentState = get();
    const ownedClinicIds = new Set(user.ownedClinics.map(clinic => clinic.tenantId));

    // Never carry a selected tenant across an authoritative session change
    // unless that tenant remains owned by the resolved user context.  Keeping
    // the prior id even briefly allows mounted tenant queries to address a
    // clinic from a previous login or registration handoff.
    let selectedClinicId =
      currentState.selectedClinicId && ownedClinicIds.has(currentState.selectedClinicId)
        ? currentState.selectedClinicId
        : null;

    // Auto-select clinic if user has exactly one owned clinic and none selected
    if (!selectedClinicId && user.ownedClinics.length === 1) {
      selectedClinicId = user.ownedClinics[0].tenantId;
    } else if (!selectedClinicId && user.tenantId) {
      selectedClinicId = user.tenantId;
    }
    
    set({ 
      currentUser: user, 
      isAuthenticated: true, 
      isLoading: false,
      selectedClinicId,
    });
  },

  // Set selected clinic
  setSelectedClinic: (clinicId: string | null) => {
    set({ selectedClinicId: clinicId });
    // Persist selected clinic
    if (clinicId) {
      secureStorage.setItem(SELECTED_CLINIC_KEY, clinicId).catch(error => logError('auth.selected_clinic.save', error));
    } else {
      secureStorage.removeItem(SELECTED_CLINIC_KEY).catch(error => logError('auth.selected_clinic.clear', error));
    }
  },

  // Clear session - resets ALL state including selectedClinicId
  //
  // T-A.4 (FR-A5, design.md §6.2): `set()` runs FIRST and synchronously,
  // before the awaited storage removals below — Zustand notifies
  // subscribers immediately, so any component reading `isAuthenticated`
  // (e.g. a guarded useFocusEffect) sees `false` right away, rather than
  // only after 3 sequential awaited secureStorage calls resolve. The
  // storage cleanup that follows is important (don't leave tokens on
  // disk) but must not gate the in-memory flag flip.
  clearSession: async () => {
    set({
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      selectedClinicId: null, // Reset on logout to avoid stale context
    });
    try {
      await secureStorage.removeItem(ACCESS_TOKEN_KEY);
      await secureStorage.removeItem(REFRESH_TOKEN_KEY);
      await secureStorage.removeItem(SELECTED_CLINIC_KEY);
    } catch (error) {
      logError('auth.session_storage.clear', error);
      // In-memory state is already cleared above regardless of storage outcome.
    }
  },

  // Initialize from storage on app start
  initializeFromStorage: async () => {
    if (storageBootstrap) return storageBootstrap;

    storageBootstrap = (async () => {
      try {
      // Supabase is the runtime session authority.  If it already has a
      // session, never replay the separately persisted refresh token.
      const selectedClinicId = await secureStorage.getItem(SELECTED_CLINIC_KEY);
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        set({ selectedClinicId });
        await get().setTokens(existing.session.access_token, existing.session.refresh_token);
        return;
      }
      const accessToken = await secureStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);

      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, selectedClinicId });
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          throw error;
        }
        if (!data.session) {
          throw new Error('Supabase did not restore a session');
        }
        // setSession may rotate the refresh token.  Persist the exact
        // authoritative result before /auth/me can make another request.
        await get().setTokens(data.session.access_token, data.session.refresh_token);
      }
    } catch (error) {
      // A consumed/reused refresh token is terminal. Remove it once rather
      // than retrying the same token or leaving a future cold start poisoned.
      await get().clearSession();
    } finally {
      // Storage hydration is only the first half of bootstrap.  Keep the
      // application routing gate closed until AuthProvider has also resolved
      // the Supabase session and the authoritative /auth/me context.
      }
    })().finally(() => {
      storageBootstrap = null;
    });
    return storageBootstrap;
  },

  completeBootstrap: () => set({ isLoading: false }),
}));

/**
 * Selector hooks for common state access patterns
 */
export const useSelectedClinic = () => {
  const { currentUser, selectedClinicId, setSelectedClinic } = useAuthStore();
  
  // Find the selected clinic from owned clinics
  const selectedClinic = currentUser?.ownedClinics.find(
    c => c.tenantId === selectedClinicId
  );
  
  // Get effective tenant ID (selected or default)
  const effectiveTenantId = selectedClinicId || currentUser?.tenantId || null;
  
  return {
    selectedClinicId,
    selectedClinic,
    effectiveTenantId,
    setSelectedClinic,
    ownedClinics: currentUser?.ownedClinics || [],
    hasMultipleClinics: (currentUser?.ownedClinics.length || 0) > 1,
  };
};
