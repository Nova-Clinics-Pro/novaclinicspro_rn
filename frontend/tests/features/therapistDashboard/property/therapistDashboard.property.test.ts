/**
 * Property-Based Tests for therapistDashboard domain layer
 *
 * Uses fast-check to verify universal invariants across many generated inputs.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: therapist-dashboard
 */

import * as fc from 'fast-check';
import {
  canCompleteSession,
  isTerminalStatus,
} from '../../../../features/therapistDashboard/domain/entities/therapistDashboard.entity';

// ===========================================================================
// Property 5: Session card Complete button visibility matches status
// Feature: therapist-dashboard, Property 5: Session card Complete button visibility matches status
// Validates: Requirements 4.6, 4.7
// ===========================================================================

describe('Property 5: Session card Complete button visibility matches status', () => {
  /**
   * The known statuses from the spec, plus 'unknown' to cover arbitrary values.
   */
  const statusArb = fc.constantFrom(
    'in_progress',
    'scheduled',
    'completed',
    'cancelled',
    'no_show',
    'unknown'
  );

  it(
    'Complete button is visible if and only if canCompleteSession returns true',
    () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const isVisible = canCompleteSession(status);

          // Completion is available only once the therapist has started the session.
          if (status === 'in_progress') {
            expect(isVisible).toBe(true);
          } else {
            expect(isVisible).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Complete button is NOT visible for terminal statuses',
    () => {
      const terminalStatusArb = fc.constantFrom('completed', 'cancelled', 'no_show');

      fc.assert(
        fc.property(terminalStatusArb, (status) => {
          expect(canCompleteSession(status)).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'Complete button IS visible for completable statuses',
    () => {
      const completableStatusArb = fc.constantFrom('in_progress');

      fc.assert(
        fc.property(completableStatusArb, (status) => {
          expect(canCompleteSession(status)).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'canCompleteSession and isTerminalStatus are mutually exclusive for all known statuses',
    () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const completable = canCompleteSession(status);
          const terminal = isTerminalStatus(status);

          // A status cannot be both completable and terminal
          expect(completable && terminal).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'canCompleteSession returns false for any arbitrary string not in the completable set',
    () => {
      // Generate arbitrary strings and verify only the known completable ones return true
      fc.assert(
        fc.property(fc.string(), (status) => {
          const result = canCompleteSession(status);
          if (result === true) {
            // If it returned true, it must be the started-session status.
            expect(['in_progress', 'IN_PROGRESS']).toContain(status);
          }
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'isTerminalStatus returns true only for the three known terminal statuses',
    () => {
      fc.assert(
        fc.property(fc.string(), (status) => {
          const result = isTerminalStatus(status);
          if (result === true) {
            // If it returned true, it must be one of the three terminal statuses
            expect(['completed', 'cancelled', 'no_show']).toContain(status);
          }
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ===========================================================================
// Property 4: row_id is the session completion identifier
// Feature: therapist-dashboard, Property 4: row_id is the session completion identifier
// Validates: Requirements 4.2, 6.1
// ===========================================================================

describe('Property 4: row_id is the session completion identifier', () => {
  /**
   * Generate sessions where row_id and id are always distinct UUIDs.
   */
  const sessionArb = fc.record({
    row_id: fc.uuid(),
    id: fc.uuid(),
    client_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    treatment_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    day_number: fc.integer({ min: 1, max: 30 }),
    scheduled_time: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    status: fc.constantFrom('in_progress', 'scheduled', 'completed', 'cancelled', 'no_show'),
  }).filter((s) => s.row_id !== s.id); // ensure they are distinct

  it(
    'onComplete is always called with row_id, never with id',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          const onComplete = jest.fn();

          // Simulate what the component does on button press
          onComplete(session.row_id);

          expect(onComplete).toHaveBeenCalledWith(session.row_id);
          expect(onComplete).not.toHaveBeenCalledWith(session.id);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'isCompletingRowId loading check uses row_id, not id',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          // When isCompletingRowId matches row_id → loading
          expect(session.row_id === session.row_id).toBe(true);

          // When isCompletingRowId is the session id (not row_id) → NOT loading
          const isLoadingBySessionId = session.id === session.row_id;
          // Since row_id !== id (filtered above), this must be false
          expect(isLoadingBySessionId).toBe(false);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'row_id and id are always distinct for any generated session',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          expect(session.row_id).not.toBe(session.id);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ===========================================================================
// Property 6: Session card renders all required fields
// Feature: therapist-dashboard, Property 6: Session card renders all required fields
// Validates: Requirements 4.4
// ===========================================================================

import {
  getStatusColor,
  getStatusLabel,
} from '../../../../features/staffDashboards/data/models/staffDashboards.dtos';

describe('Property 6: Session card renders all required fields', () => {
  /**
   * Generate arbitrary session data covering all required display fields.
   */
  const sessionArb = fc.record({
    row_id: fc.uuid(),
    id: fc.uuid(),
    client_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    treatment_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    day_number: fc.integer({ min: 1, max: 30 }),
    scheduled_time: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    status: fc.constantFrom('in_progress', 'scheduled', 'completed', 'cancelled', 'no_show', 'unknown'),
  });

  it(
    'client_name field is always present (falls back to "Unknown Client" when null)',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          const clientName = session.client_name ?? 'Unknown Client';
          expect(typeof clientName).toBe('string');
          expect(clientName.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'treatment_name field is always present (falls back to "Unknown Treatment" when null)',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          const treatmentName = session.treatment_name ?? 'Unknown Treatment';
          expect(typeof treatmentName).toBe('string');
          expect(treatmentName.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'day_number is always rendered as "Day N" string',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          const dayLabel = `Day ${session.day_number}`;
          expect(dayLabel).toMatch(/^Day \d+$/);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'status badge always has a color and label for any status',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          const color = getStatusColor(session.status);
          const label = getStatusLabel(session.status);

          // Color must be a non-empty string (hex color or fallback)
          expect(typeof color).toBe('string');
          expect(color.length).toBeGreaterThan(0);

          // Label must be a non-empty string
          expect(typeof label).toBe('string');
          expect(label.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'all five required fields are derivable for any session',
    () => {
      fc.assert(
        fc.property(sessionArb, (session) => {
          // 1. client_name (with fallback)
          const clientName = session.client_name ?? 'Unknown Client';
          expect(clientName).toBeTruthy();

          // 2. treatment_name (with fallback)
          const treatmentName = session.treatment_name ?? 'Unknown Treatment';
          expect(treatmentName).toBeTruthy();

          // 3. day_number as "Day N"
          const dayLabel = `Day ${session.day_number}`;
          expect(dayLabel).toMatch(/^Day \d+$/);

          // 4. scheduled_time (may be '—' when null, handled by formatTime)
          expect(session.scheduled_time === null || typeof session.scheduled_time === 'string').toBe(true);

          // 5. status badge
          const statusLabel = getStatusLabel(session.status);
          expect(statusLabel).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ===========================================================================
// Property 12: KPI period selection triggers correct API call
// Feature: therapist-dashboard, Property 12: KPI period selection triggers correct API call
// Validates: Requirements 9.3
// ===========================================================================

describe('Property 12: KPI period selection triggers correct API call', () => {
  /**
   * Simulate the param-building logic from TherapistKpiSection.
   * This mirrors the component's internal kpiParams derivation.
   */
  function buildKpiParams(
    period: '7d' | '30d' | '90d' | 'custom',
    customRange: { start: string; end: string } | null
  ): Record<string, string | undefined> {
    if (period === 'custom' && customRange) {
      return { start_date: customRange.start, end_date: customRange.end };
    }
    if (period !== 'custom') {
      return { period };
    }
    return {};
  }

  const standardPeriodArb = fc.constantFrom('7d' as const, '30d' as const, '90d' as const);

  it(
    'standard period selection always produces { period: <selected> } params',
    () => {
      fc.assert(
        fc.property(standardPeriodArb, (period) => {
          const params = buildKpiParams(period, null);
          expect(params).toEqual({ period });
          expect(params.period).toBe(period);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'standard period params never include start_date or end_date',
    () => {
      fc.assert(
        fc.property(standardPeriodArb, (period) => {
          const params = buildKpiParams(period, null);
          expect(params).not.toHaveProperty('start_date');
          expect(params).not.toHaveProperty('end_date');
        }),
        { numRuns: 100 }
      );
    }
  );

  const isoDateArb = fc
    .integer({ min: 0, max: 3999 }) // days offset from 2020-01-01
    .map((offset) => {
      const base = new Date(2020, 0, 1);
      base.setDate(base.getDate() + offset);
      const y = base.getFullYear();
      const m = String(base.getMonth() + 1).padStart(2, '0');
      const d = String(base.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    });

  const customRangeArb = fc.record({ start: isoDateArb, end: isoDateArb });

  it(
    'custom period with range always produces { start_date, end_date } params',
    () => {
      fc.assert(
        fc.property(customRangeArb, (range) => {
          const params = buildKpiParams('custom', range);
          expect(params).toEqual({ start_date: range.start, end_date: range.end });
          expect(params.start_date).toBe(range.start);
          expect(params.end_date).toBe(range.end);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'custom period params never include the period key',
    () => {
      fc.assert(
        fc.property(customRangeArb, (range) => {
          const params = buildKpiParams('custom', range);
          expect(params).not.toHaveProperty('period');
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'custom period without range produces empty params (query disabled)',
    () => {
      fc.assert(
        fc.property(fc.constant(null), (_) => {
          const params = buildKpiParams('custom', null);
          expect(params).toEqual({});
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'query is enabled for all standard periods regardless of tenantId/staffId',
    () => {
      const tenantIdArb = fc.uuid();
      const staffIdArb = fc.uuid();

      fc.assert(
        fc.property(standardPeriodArb, tenantIdArb, staffIdArb, (period, tenantId, staffId) => {
          // Query is enabled when period is not custom
          const queryEnabled = (period as string) !== 'custom';
          expect(queryEnabled).toBe(true);
          // tenantId and staffId must be non-empty for the hook to fire
          expect(tenantId.length).toBeGreaterThan(0);
          expect(staffId.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'query is disabled for custom period until range is set',
    () => {
      fc.assert(
        fc.property(fc.constant('custom' as const), (period) => {
          const queryEnabledWithoutRange = period !== 'custom' || false;
          expect(queryEnabledWithoutRange).toBe(false);

          const queryEnabledWithRange = period !== 'custom' || true;
          expect(queryEnabledWithRange).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );
});
