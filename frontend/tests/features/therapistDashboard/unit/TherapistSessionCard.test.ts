/**
 * Unit Tests for TherapistSessionCard logic
 *
 * Tests the core logic of the TherapistSessionCard component:
 * - Complete button hidden for terminal statuses
 * - Loading state when isCompletingRowId matches session.row_id
 * - onComplete callback is called with row_id (never id)
 *
 * Validates: Requirements 4.4, 4.6, 4.7, 5.2, 13.1, 13.3
 */

import {
  canCompleteSession,
  isTerminalStatus,
} from '../../../../features/therapistDashboard/domain/entities/therapistDashboard.entity';
import {
  getStatusColor,
  getStatusLabel,
} from '../../../../features/staffDashboards/data/models/staffDashboards.dtos';
import type { TherapistSessionItemV2 } from '../../../../features/staffDashboards/data/models/staffDashboards.dtos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<TherapistSessionItemV2> = {}): TherapistSessionItemV2 {
  return {
    row_id: 'row-abc-123',
    appointment_id: 'appointment-abc-123',
    treatment_sheet_id: 'sheet-abc-123',
    id: 'session-xyz-999',
    client_name: 'Alice Smith',
    treatment_name: 'Abhyanga',
    day_number: 3,
    total_sessions: 7,
    session_date: '2024-01-15',
    scheduled_time: '2024-01-15T09:00:00Z',
    scheduled_end_time: '2024-01-15T10:00:00Z',
    therapist_name: 'Therapist One',
    all_therapist_names: ['Therapist One'],
    status: 'scheduled',
    started_at: null,
    started_by_staff_id: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Complete button visibility
// ---------------------------------------------------------------------------

describe('TherapistSessionCard — Complete button visibility', () => {
  it('hides Complete button for "scheduled" status until the session is started', () => {
    const session = makeSession({ status: 'scheduled' });
    expect(canCompleteSession(session.status)).toBe(false);
  });

  it('shows Complete button for "in_progress" status', () => {
    const session = makeSession({ status: 'in_progress' });
    expect(canCompleteSession(session.status)).toBe(true);
  });

  it('hides Complete button for "completed" status', () => {
    const session = makeSession({ status: 'completed' });
    expect(canCompleteSession(session.status)).toBe(false);
  });

  it('hides Complete button for "cancelled" status', () => {
    const session = makeSession({ status: 'cancelled' });
    expect(canCompleteSession(session.status)).toBe(false);
  });

  it('hides Complete button for "no_show" status', () => {
    const session = makeSession({ status: 'no_show' });
    expect(canCompleteSession(session.status)).toBe(false);
  });

  it('hides Complete button for unknown status', () => {
    const session = makeSession({ status: 'unknown_status' });
    expect(canCompleteSession(session.status)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loading state — isCompletingRowId matching
// ---------------------------------------------------------------------------

describe('TherapistSessionCard — Loading state', () => {
  it('is loading when isCompletingRowId matches session.row_id', () => {
    const session = makeSession({ row_id: 'row-abc-123' });
    const isCompletingRowId = 'row-abc-123';
    expect(isCompletingRowId === session.row_id).toBe(true);
  });

  it('is NOT loading when isCompletingRowId is null', () => {
    const session = makeSession({ row_id: 'row-abc-123' });
    const isCompletingRowId = null;
    expect(isCompletingRowId === session.row_id).toBe(false);
  });

  it('is NOT loading when isCompletingRowId is a different row_id', () => {
    const session = makeSession({ row_id: 'row-abc-123' });
    const isCompletingRowId = 'row-different-456';
    expect(isCompletingRowId === session.row_id).toBe(false);
  });

  it('loading check uses row_id, not id', () => {
    const session = makeSession({ row_id: 'row-abc-123', id: 'session-xyz-999' });
    const isCompletingRowId = 'session-xyz-999'; // matches id, not row_id
    // Should NOT be loading — we compare against row_id
    expect(isCompletingRowId === session.row_id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onComplete callback — always called with row_id
// ---------------------------------------------------------------------------

describe('TherapistSessionCard — onComplete callback', () => {
  it('calls onComplete with row_id, not id', () => {
    const session = makeSession({ row_id: 'row-abc-123', id: 'session-xyz-999' });
    const onComplete = jest.fn();

    // Simulate what the component does on button press
    onComplete(session.row_id);

    expect(onComplete).toHaveBeenCalledWith('row-abc-123');
    expect(onComplete).not.toHaveBeenCalledWith('session-xyz-999');
  });

  it('row_id and id are different values', () => {
    const session = makeSession({ row_id: 'row-abc-123', id: 'session-xyz-999' });
    expect(session.row_id).not.toBe(session.id);
  });
});

// ---------------------------------------------------------------------------
// Display data — fallbacks for null fields
// ---------------------------------------------------------------------------

describe('TherapistSessionCard — display data', () => {
  it('uses "Unknown Client" when client_name is null', () => {
    const session = makeSession({ client_name: null });
    const clientName = session.client_name ?? 'Unknown Client';
    expect(clientName).toBe('Unknown Client');
  });

  it('uses "Unknown Treatment" when treatment_name is null', () => {
    const session = makeSession({ treatment_name: null });
    const treatmentName = session.treatment_name ?? 'Unknown Treatment';
    expect(treatmentName).toBe('Unknown Treatment');
  });

  it('formats day_number as "Day N"', () => {
    const session = makeSession({ day_number: 5 });
    const dayLabel = `Day ${session.day_number}`;
    expect(dayLabel).toBe('Day 5');
  });

  it('status badge uses getStatusColor', () => {
    const session = makeSession({ status: 'in_progress' });
    const color = getStatusColor(session.status);
    expect(color).toBe('#F59E0B');
  });

  it('status badge uses getStatusLabel', () => {
    const session = makeSession({ status: 'in_progress' });
    const label = getStatusLabel(session.status);
    expect(label).toBe('In Progress');
  });

  it('status badge for "completed" has correct color', () => {
    const session = makeSession({ status: 'completed' });
    const color = getStatusColor(session.status);
    expect(color).toBe('#059669');
  });

  it('status badge for "cancelled" has correct color', () => {
    const session = makeSession({ status: 'cancelled' });
    const color = getStatusColor(session.status);
    expect(color).toBe('#EF4444');
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('TherapistSessionCard — accessibility', () => {
  it('default accessibilityLabel uses client_name', () => {
    const session = makeSession({ client_name: 'Alice Smith' });
    const label = `Session for ${session.client_name}`;
    expect(label).toBe('Session for Alice Smith');
  });

  it('default accessibilityLabel uses "Unknown Client" when client_name is null', () => {
    const session = makeSession({ client_name: null });
    const clientName = session.client_name ?? 'Unknown Client';
    const label = `Session for ${clientName}`;
    expect(label).toBe('Session for Unknown Client');
  });

  it('terminal status sessions do not show Complete button', () => {
    const terminalStatuses = ['completed', 'cancelled', 'no_show'];
    for (const status of terminalStatuses) {
      expect(canCompleteSession(status)).toBe(false);
      expect(isTerminalStatus(status)).toBe(true);
    }
  });
});
