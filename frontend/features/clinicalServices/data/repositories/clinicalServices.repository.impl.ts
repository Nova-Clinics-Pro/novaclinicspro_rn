/**
 * Clinical Services query keys (R3A · T-B.4)
 *
 * Mirrors the key-shape convention every other data domain in this codebase
 * uses (prescriptionsKeys, casesheetsKeys, treatmentSheetsKeys) so that a
 * later consumer (e.g. Billing, per Phase 2 design §9.E — out of this
 * phase's scope) has a canonical key to invalidate/read against. No query
 * hooks are defined here yet: T-B.4 only records Clinical Services
 * (session-only list, per the R3A design's own scope — see
 * ClinicalServicesModule's own docstring for why no list-by-visit query
 * exists), so there is nothing yet to list-query by.
 */

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { createClinicalServiceApi, listClinicalServicesByVisitApi } from '../datasources/clinicalServices.api';
import { ClinicalServiceCreateRequest, ClinicalServiceResponse } from '../models/clinicalServices.dtos';

export const clinicalServicesKeys = {
  all: ['clinicalServices'] as const,
  lists: () => [...clinicalServicesKeys.all, 'list'] as const,
  byVisit: (tenantId: string, visitId: string) =>
    [...clinicalServicesKeys.lists(), tenantId, visitId] as const,
};

/**
 * R7 · T-0.5 (ED-ARCH-001): thin useMutation wrapper so ClinicalServicesModule
 * (Presentation) no longer imports createClinicalServiceApi directly. No
 * default onSuccess — Clinical Services' own append-only, session-only-list
 * behavior (see ClinicalServicesModule's docstring) already builds its list
 * from each response locally, and invalidation is conditionally
 * flag-gated by the caller, so the caller owns it, matching the
 * no-default-onSuccess precedent set for Treatment Recommendation's
 * equivalent new mutations (T-0.4).
 */
export const useCreateClinicalServiceMutation = (
  tenantId: string,
  options?: UseMutationOptions<ClinicalServiceResponse, Error, ClinicalServiceCreateRequest>
) =>
  useMutation<ClinicalServiceResponse, Error, ClinicalServiceCreateRequest>({
    mutationFn: (payload) => createClinicalServiceApi(tenantId, payload),
    ...options,
  });

/**
 * R7 · T-0.6 (ED-ARCH-001): plain query-options factory (not a `useX` hook)
 * so `useClinicalTimelineData`'s dynamic per-Visit `useQueries` fan-out no
 * longer imports `listClinicalServicesByVisitApi` directly. A factory
 * function rather than a hook because `useQueries` needs an array of plain
 * query-config objects built per Visit — the Visit count is dynamic per
 * render, so a real hook cannot be called once per Visit (Rules of Hooks).
 * Same queryKey/staleTime/enabled the inline call this replaces already
 * used — a relocation into the governed repository module, not a behavior
 * change.
 */
export const clinicalServicesByVisitQueryOptions = (tenantId: string, visitId: string) => ({
  queryKey: clinicalServicesKeys.byVisit(tenantId, visitId),
  queryFn: () => listClinicalServicesByVisitApi(tenantId, visitId),
  enabled: !!tenantId && !!visitId,
  staleTime: 30 * 1000,
});
