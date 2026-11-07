/**
 * Start / Complete are hidden on the legacy clinic-admin session screens because the backend has no
 * `/treatment-sessions/{id}/start|complete` routes and no session status. This guards both halves:
 * the switch stays off, and the screen only offers the actions through it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE } from '../../../features/treatmentSessions/domain/sessionLifecycleAvailability';

describe('treatment-session lifecycle actions', () => {
  it('stays disabled until the backend defines a session lifecycle', () => {
    expect(TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE).toBe(false);
  });

  it('gates both Start and Complete behind the switch on the detail screen', () => {
    const source = readFileSync(
      join(__dirname, '../../../features/treatmentSessions/presentation/pages/TreatmentSessionDetailScreen.tsx'),
      'utf8'
    );
    expect(source).toMatch(/const canStart = TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE &&/);
    expect(source).toMatch(/const canComplete = TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE &&/);
  });
});
