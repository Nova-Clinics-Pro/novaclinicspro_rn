/**
 * useFeatures Hook
 * Access feature configuration from tenant metadata with API refresh.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { axiosClient } from '../api/axiosClient';
import { logError } from '../utils/errorHandler';

/**
 * Phase 1 · T-E.1 (ADR-P1-05, FR-D1): single authoritative allowed-list for
 * `clinic_type`. This runtime array is the source; `ClinicType` derives from
 * it. Do not add a second literal list elsewhere in this file or in FE code
 * — reference `CLINIC_TYPES`/`ClinicType` instead.
 */
export const CLINIC_TYPES = ['general', 'ayurveda', 'allopathy', 'dental', 'physio', 'multispeciality'] as const;
export type ClinicType = (typeof CLINIC_TYPES)[number];

export interface FeatureConfig {
  clinic_type: ClinicType;
  appointments: {
    allow_multiday: boolean;
    enable_gender_matching: boolean;
    multiday_appointment_types?: string[];
    gender_matching_treatments?: string[];
  };
  treatment_sheets: {
    enable_treatment_sheets: boolean;
    enable_sheet_sync: boolean;
  };
  /**
   * Phase 1 · T-A.6 (ADR-P1-01, FR-A6, RB-1): global rollout flag for the
   * consultation-workspace freshness behavior (query-invalidation instead
   * of forced-remount). NOT clinic-type-derived like the fields above —
   * served as-is from GET /tenants/{id}/features (backend
   * OrgTenantsService.get_tenant_features, env-var-driven). Defaults to
   * false (fail-closed to the pre-Phase-1 behavior) if the API is
   * unreachable or the field is absent.
   */
  freshness_v1_enabled: boolean;
  /**
   * Phase 3B (R3B) · T-A.1 (ADR-R3B-04): rollout flag for Clinical Spine
   * navigation convergence, canonical editor routing, and the Clinical
   * Timeline. Mirrors `freshness_v1_enabled` exactly — global (not
   * clinic-type-derived), served as-is from GET /tenants/{id}/features
   * (backend OrgTenantsService.get_tenant_features, env-var-driven).
   * Defaults to false (fail-closed to today's existing navigation/editor
   * behavior) if the API is unreachable or the field is absent.
   */
  clinical_spine_v1_enabled: boolean;
}

const DEFAULT_FEATURES: FeatureConfig = {
  clinic_type: 'general',
  appointments: {
    allow_multiday: false,
    enable_gender_matching: false,
  },
  treatment_sheets: {
    enable_treatment_sheets: false,
    enable_sheet_sync: false,
  },
  freshness_v1_enabled: false,
  clinical_spine_v1_enabled: false,
};

function normalizeClinicType(value?: string): FeatureConfig['clinic_type'] {
  const normalized = (value || 'general').toLowerCase();
  if (CLINIC_TYPES.includes(normalized as ClinicType)) {
    return normalized as FeatureConfig['clinic_type'];
  }
  return 'general';
}

function isTherapyClinicType(clinicType: FeatureConfig['clinic_type']): boolean {
  return clinicType === 'ayurveda' || clinicType === 'physio';
}

function normalizeFeatures(raw?: any): FeatureConfig {
  const clinicType = normalizeClinicType(raw?.clinic_type);
  // Release 5 (R5) · T-F.2d.1 (design.md §12, requirements.md N-10):
  // still required below for the deferred configuration fields
  // (enable_gender_matching, multiday_appointment_types,
  // gender_matching_treatments, enable_sheet_sync) — do not remove.
  // allow_multiday/enable_treatment_sheets no longer use it: both are
  // capability-platform-derived as of T-F.2c (CapabilityResolutionService
  // -> get_tenant_features), already correct per-tenant, so the backend
  // response is trusted directly here rather than re-gated a third time.
  const therapyClinic = isTherapyClinicType(clinicType);

  return {
    clinic_type: clinicType,
    appointments: {
      allow_multiday: !!raw?.appointments?.allow_multiday,
      enable_gender_matching: therapyClinic && !!raw?.appointments?.enable_gender_matching,
      multiday_appointment_types: raw?.appointments?.multiday_appointment_types ?? [],
      gender_matching_treatments: therapyClinic ? raw?.appointments?.gender_matching_treatments : [],
    },
    treatment_sheets: {
      enable_treatment_sheets: !!raw?.treatment_sheets?.enable_treatment_sheets,
      enable_sheet_sync: therapyClinic && !!raw?.treatment_sheets?.enable_sheet_sync,
    },
    // Not gated by therapyClinic — this is a platform-wide rollout flag, not
    // a clinic-type feature.
    freshness_v1_enabled: !!raw?.freshness_v1_enabled,
    // Phase 3B (R3B) · T-A.1 (ADR-R3B-04): same shape as freshness_v1_enabled
    // above — global rollout flag, not clinic-type-derived. `!!` coerces a
    // missing/undefined field (API unreachable, or an older backend that
    // hasn't deployed this field yet) safely to false.
    clinical_spine_v1_enabled: !!raw?.clinical_spine_v1_enabled,
  };
}

/**
 * Hook to access feature configuration with safe defaults.
 *
 * The API response is authoritative because existing sessions can carry stale app_metadata
 * after clinic-type/template changes. JWT metadata is only a fallback if the API is unavailable.
 */
export function useFeatures(): FeatureConfig {
  const [features, setFeatures] = useState<FeatureConfig>(DEFAULT_FEATURES);
  // Refs to deduplicate API calls and state updates
  const lastTenantIdRef = useRef<string | null>(null);
  const lastFeaturesJsonRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadFeatures = async (forceRefetch = false) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const metadataFeatures = user?.app_metadata?.features;
        const tenantId = user?.app_metadata?.tenant_id || user?.user_metadata?.tenant_id;

        if (!tenantId) {
          if (isMounted) {
            const next = metadataFeatures ? normalizeFeatures(metadataFeatures) : DEFAULT_FEATURES;
            const nextJson = JSON.stringify(next);
            if (nextJson !== lastFeaturesJsonRef.current) {
              lastFeaturesJsonRef.current = nextJson;
              setFeatures(next);
            }
          }
          return;
        }

        // Skip API call if we already loaded for this tenant and aren't forcing
        if (!forceRefetch && tenantId === lastTenantIdRef.current) {
          return;
        }

        try {
          const response = await axiosClient.get('/api/v1/tenants/' + tenantId + '/features');
          if (isMounted) {
            const next = normalizeFeatures(response.data);
            const nextJson = JSON.stringify(next);
            // Only update state if features actually changed — prevents re-render loops
            if (nextJson !== lastFeaturesJsonRef.current) {
              lastFeaturesJsonRef.current = nextJson;
              setFeatures(next);
            }
            lastTenantIdRef.current = tenantId;
          }
        } catch (apiError: unknown) {
          logError('features.load_api', apiError);

          if (isMounted) {
            const next = metadataFeatures ? normalizeFeatures(metadataFeatures) : DEFAULT_FEATURES;
            const nextJson = JSON.stringify(next);
            if (nextJson !== lastFeaturesJsonRef.current) {
              lastFeaturesJsonRef.current = nextJson;
              setFeatures(next);
            }
          }
        }
      } catch (error) {
        logError('features.load_session', error);
        if (isMounted) {
          setFeatures(DEFAULT_FEATURES);
        }
      }
    };

    loadFeatures(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED fires on every Axios 401 retry and on Supabase automatic
      // background refresh. Re-fetching features on each token refresh creates an
      // infinite loop. Only reload on events that indicate the user/tenant changed.
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        lastTenantIdRef.current = null; // force refetch for new session
        loadFeatures(true);
      }
      // TOKEN_REFRESHED, INITIAL_SESSION — intentionally ignored
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return features;
}

export function isAyurvedaClinic(features: FeatureConfig): boolean {
  return features.clinic_type === 'ayurveda';
}

export function isPhysioClinic(features: FeatureConfig): boolean {
  return features.clinic_type === 'physio';
}

export function isTherapyClinic(features: FeatureConfig): boolean {
  return isTherapyClinicType(features.clinic_type);
}

/**
 * Release 5 (R5) · T-F.2d (design.md §12, requirements.md N-10, FR-D2
 * narrowed). `allow_multiday` is capability-platform-derived as of T-F.2c
 * (CapabilityResolutionService -> get_tenant_features) - the backend
 * already returns `false` for every non-therapy clinic type, so this no
 * longer needs its own `isTherapyClinic` re-derivation on top.
 */
export function hasMultiDayAppointments(features: FeatureConfig): boolean {
  return features.appointments.allow_multiday;
}

export function hasGenderMatching(features: FeatureConfig): boolean {
  return isTherapyClinic(features) && features.appointments.enable_gender_matching;
}

/**
 * Release 5 (R5) · T-F.2d (design.md §12, requirements.md N-10, FR-D2
 * narrowed). `enable_treatment_sheets` is capability-platform-derived as
 * of T-F.2c, same reasoning as `hasMultiDayAppointments` above.
 */
export function hasTreatmentSheets(features: FeatureConfig): boolean {
  return features.treatment_sheets.enable_treatment_sheets;
}

/** Phase 1 · T-A.6 (ADR-P1-01, FR-A6, RB-1). */
export function isFreshnessV1Enabled(features: FeatureConfig): boolean {
  return features.freshness_v1_enabled;
}

/** Phase 3B (R3B) · T-A.1 (ADR-R3B-04). */
export function isClinicalSpineV1Enabled(features: FeatureConfig): boolean {
  return features.clinical_spine_v1_enabled;
}
