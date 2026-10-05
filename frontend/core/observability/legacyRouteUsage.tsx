import { useEffect } from 'react';
import { reportObservabilityEvent } from '../api/axiosClient';

/**
 * Z6's temporary compatibility signal.  Route identifiers are static product
 * route codes only: no patient, appointment, document, or clinician data is
 * included in the event payload.
 */
export type LegacyRouteCode =
  | 'appointment.start_consultation'
  | 'episode.complete_consultation'
  | 'episode.workspace'
  | 'casesheet.new'
  | 'casesheet.edit'
  | 'prescription.new'
  | 'prescription.edit';

export function reportLegacyRouteUsage(route: LegacyRouteCode): void {
  try {
    reportObservabilityEvent({
      event: 'navigation.legacy_route_used',
      message: 'Legacy COS compatibility route used',
      route,
    });
  } catch {
    // Observability is best effort: it must never interrupt clinical routing.
  }
}

export function LegacyRouteUsage({ route }: { route: LegacyRouteCode }) {
  useEffect(() => {
    reportLegacyRouteUsage(route);
  }, [route]);
  return null;
}
