/**
 * Phase 1 · T-D.1 — Centralized route builder (ADR-P1-04, design.md §4.D).
 *
 * The "Start consultation" destinations were previously built as duplicated
 * inline template-string literals in 3 places (`caseResolver.ts` x2,
 * `CreateConsultationScreen.tsx` x1). This module expresses each destination
 * once. Behavior-preserving: byte-identical route strings to the originals.
 */

export function consultationRoute(episodeId: string, appointmentId: string, clientId: string): string {
  return `/clinic-admin/episodes/${episodeId}/consultation?appointmentId=${appointmentId}&clientId=${clientId}`;
}

/**
 * Canonical Episode Workspace destination.
 *
 * The workspace owns the `cos_v1` presentation decision. Callers only carry
 * the explicit clinical identity needed by either workspace implementation.
 */
export function episodeWorkspaceRoute(
  episodeId: string,
  appointmentId: string,
  clientId: string,
  mode?: 'admin' | 'doctor',
): string {
  const params = new URLSearchParams({ appointmentId, clientId });
  if (mode) params.set('mode', mode);
  return `/clinic-admin/episodes/${episodeId}/workspace?${params.toString()}`;
}

export function startConsultationRoute(appointmentId: string, clientId: string): string {
  return `/clinic-admin/appointments/${appointmentId}/start-consultation?clientId=${clientId}`;
}
