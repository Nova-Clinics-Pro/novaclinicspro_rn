/**
 * useCapabilities / useToggleCapability
 *
 * Release 5 (R5) · T-E.1 (design.md §12, requirements.md FR-H2/FR-H4, N-6)
 *
 * `useCapabilities()` mirrors `useFeatures()`'s fetch-once-per-session
 * *intent* (design.md §12: "mirrors useFeatures()'s exact caching/
 * invalidation shape (React Query, same staleness convention)"), this time
 * built on React Query rather than the manual useState/useRef dedup
 * `useFeatures()` itself uses (React Query wasn't in the app yet when that
 * hook was written). `staleTime: Infinity` plus `queryClient.clear()`
 * already being called on logout (`useAuth`'s own `logout()`) together
 * reproduce "fetched at most once per session" (design.md line 754): the
 * cache is never time-invalidated, only explicitly invalidated by a
 * successful toggle (below) or wiped entirely at logout/next session.
 *
 * `useToggleCapability()` sends `If-Match` (FR-J2) and, on success, writes
 * the PATCH response's full re-resolved map directly into this query's
 * cache (FR-H2) — no second round-trip. On 409 `version_conflict` it
 * surfaces a `'conflict'` status (a "please review" state, design.md §12),
 * never auto-retries. No WebSockets/push (N-6) — other open sessions still
 * only see the change on their own next fetch.
 *
 * `useCapabilityCatalog()` (added T-E.3) — the platform-global catalog
 * (`GET /capabilities/catalog`, design.md §11), the source of `display_order`
 * and `parent_code` hierarchy neither `useCapabilities()` nor
 * `CapabilityState` itself carries (that endpoint is tenant-scoped
 * entitlement/enablement state, not catalog structure) — needed by any
 * screen that must render capabilities in deterministic, hierarchical
 * order (e.g. T-E.3's admin list).
 */
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { axiosClient } from '../api/axiosClient';
import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useTranslation } from '../localization/useTranslation';

/** FR-H4's distinct-field set (T-C.5's `CapabilityStateResponse`, unchanged). */
export interface CapabilityState {
  code: string;
  name: string;
  description: string;
  entitled: boolean;
  tenant_preference: boolean;
  effective_available: boolean;
  effective_enabled: boolean;
  blocked_reason_code: string | null;
  blocked_reason_label: string | null;
  unmet_dependencies: string[];
  source: 'template_default' | 'admin_override';
  /** Current TenantCapability.version (0 when no row exists yet, T-D.2a's
   * OCC convention) — supply this as `useToggleCapability().toggle`'s own
   * `version` arg for a correct `If-Match` on the first toggle attempt. */
  version: number;
  /** Whether the switch is shown to this clinic (a template setting); independent of whether the capability is enabled.
   * Absent from an older backend, which means shown. */
  visible?: boolean;
}

export interface TenantCapabilitiesResponse {
  capabilities: Record<string, CapabilityState>;
}

export interface CapabilityToggleResponse {
  capabilities: Record<string, CapabilityState>;
  version: number;
}

/** The structured rejection body T-D.2b's PATCH endpoint returns on 409/422/404. */
export interface CapabilityRejectionError {
  error: 'version_conflict' | 'not_entitled' | 'dependency_unmet' | 'blocks_dependents' | 'capability_not_found';
  message: string;
  reason_code?: string;
  expected_version?: number;
  current_version?: number;
  blocking_capabilities?: string[];
}

export const capabilitiesKeys = {
  all: ['capabilities'] as const,
  tenant: (tenantId: string) => [...capabilitiesKeys.all, 'tenant', tenantId] as const,
};

const getTenantCapabilitiesApi = async (tenantId: string): Promise<TenantCapabilitiesResponse> => {
  const response = await axiosClient.get(`/api/v1/tenants/${tenantId}/capabilities`);
  return response.data;
};

const toggleCapabilityApi = async (
  tenantId: string,
  code: string,
  enabled: boolean,
  version: number
): Promise<CapabilityToggleResponse> => {
  const response = await axiosClient.patch(
    `/api/v1/tenants/${tenantId}/capabilities/${code}`,
    { enabled },
    { headers: { 'If-Match': String(Math.floor(Number(version))) } }
  );
  return response.data;
};

/** Extracts the structured rejection body from a capability-toggle error, or null. */
const extractCapabilityRejection = (err: unknown): CapabilityRejectionError | null => {
  const axiosErr = err as { response?: { status?: number; data?: any } };
  const status = axiosErr?.response?.status;
  if (status !== 409 && status !== 422 && status !== 404) return null;
  const data = axiosErr.response?.data;
  // Body may be flat {error, ...} or nested {detail: {error, ...}}.
  const body = data?.error ? data : data?.detail?.error ? data.detail : null;
  return body ?? null;
};

export interface UseCapabilitiesResult {
  capabilities: Record<string, CapabilityState>;
  isLoading: boolean;
  error: Error | null;
  /**
   * Localized human reason for a `blocked_reason_code`, via the frontend's
   * own `useTranslation()` (`capabilities.<code>` key), reusing the same
   * reason-code key set the backend's `capabilities.json` locale files
   * already seed (T-C.4c) rather than inventing new wording. Falls back to
   * whichever cached capability's own backend-localized
   * `blocked_reason_label` currently carries this code — never returns an
   * untranslated raw code to the UI — until a future task populates the
   * frontend's own `capabilities.*` translation keys.
   */
  getReason: (code: string) => string;
  refetch: () => void;
}

export function useCapabilities(
  options?: Omit<UseQueryOptions<TenantCapabilitiesResponse, Error>, 'queryKey' | 'queryFn'>
): UseCapabilitiesResult {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const tenantId = currentUser?.tenantId || '';

  const query = useQuery<TenantCapabilitiesResponse, Error>({
    queryKey: capabilitiesKeys.tenant(tenantId),
    queryFn: () => getTenantCapabilitiesApi(tenantId),
    enabled: !!tenantId,
    staleTime: Infinity,
    ...options,
  });

  const capabilities = query.data?.capabilities ?? {};

  const getReason = useCallback(
    (code: string): string => {
      const key = `capabilities.${code}`;
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }
      const fallback = Object.values(capabilities).find((state) => state.blocked_reason_code === code);
      return fallback?.blocked_reason_label ?? code;
    },
    [t, capabilities]
  );

  return {
    capabilities,
    isLoading: query.isLoading,
    error: query.error,
    getReason,
    refetch: query.refetch,
  };
}

export type ToggleCapabilityStatus = 'idle' | 'toggling' | 'success' | 'error' | 'conflict';

export interface UseToggleCapabilityResult {
  toggle: (args: { code: string; enabled: boolean; version: number }) => void;
  status: ToggleCapabilityStatus;
  errorMessage: string | null;
  rejection: CapabilityRejectionError | null;
  /** Current version after a conflict refetch — use this to re-trigger. */
  currentVersion: number | null;
  reset: () => void;
}

export function useToggleCapability(): UseToggleCapabilityResult {
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<ToggleCapabilityStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejection, setRejection] = useState<CapabilityRejectionError | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setRejection(null);
    setCurrentVersion(null);
  }, []);

  const toggle = useCallback(
    async ({ code, enabled, version }: { code: string; enabled: boolean; version: number }) => {
      if (!tenantId) return;
      setStatus('toggling');
      setErrorMessage(null);
      setRejection(null);
      setCurrentVersion(null);
      try {
        const result = await toggleCapabilityApi(tenantId, code, enabled, version);
        queryClient.setQueryData<TenantCapabilitiesResponse>(capabilitiesKeys.tenant(tenantId), {
          capabilities: result.capabilities,
        });
        setCurrentVersion(result.version);
        setStatus('success');
      } catch (err) {
        const rejectionBody = extractCapabilityRejection(err);
        if (rejectionBody?.error === 'version_conflict') {
          await queryClient.invalidateQueries({ queryKey: capabilitiesKeys.tenant(tenantId) });
          setRejection(rejectionBody);
          setCurrentVersion(rejectionBody.current_version ?? null);
          setStatus('conflict');
          setErrorMessage('This capability was updated elsewhere. Please review and try again.');
        } else if (rejectionBody) {
          setRejection(rejectionBody);
          setStatus('error');
          setErrorMessage(rejectionBody.message);
        } else {
          setStatus('error');
          setErrorMessage('Failed to update capability.');
        }
      }
    },
    [tenantId, queryClient]
  );

  return { toggle, status, errorMessage, rejection, currentVersion, reset };
}

/** T-E.3 — one entry from `GET /capabilities/catalog` (platform-global,
 * not tenant-scoped, no entitlement filtering). Deliberately carries no
 * `mid_rollout`/flag field — the backend's own NFR-6(c) no-leakage
 * guarantee (structural on that endpoint's own response schema). */
export interface CapabilityCatalogEntry {
  code: string;
  name: string;
  description: string;
  parent_code: string | null;
  category: string | null;
  display_order: number;
  lifecycle_state: string;
}

export interface CapabilityCatalogResponse {
  capabilities: CapabilityCatalogEntry[];
}

const getCapabilityCatalogApi = async (): Promise<CapabilityCatalogResponse> => {
  const response = await axiosClient.get('/api/v1/capabilities/catalog');
  return response.data;
};

/** Platform-global, not tenant-scoped — `staleTime: Infinity` for the same
 * "fetch at most once per session" reason as `useCapabilities()` (the
 * catalog only changes on a migration/deploy, design.md §16). */
export function useCapabilityCatalog(
  options?: Omit<UseQueryOptions<CapabilityCatalogResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CapabilityCatalogResponse, Error>({
    queryKey: [...capabilitiesKeys.all, 'catalog'],
    queryFn: getCapabilityCatalogApi,
    staleTime: Infinity,
    ...options,
  });
}
