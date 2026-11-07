/**
 * Unit Tests for therapistDashboard entity helpers
 *
 * Tests canCompleteSession and isTerminalStatus for all known statuses
 * and unknown/edge-case values.
 *
 * Validates: Requirements 4.6, 4.7
 */

import {
  canCompleteSession,
  isTerminalStatus,
} from '../../../../features/therapistDashboard/domain/entities/therapistDashboard.entity';

// ===========================================================================
// canCompleteSession
// ===========================================================================

describe('canCompleteSession', () => {
  describe('returns true for completable statuses', () => {
    it('returns true for "in_progress"', () => {
      expect(canCompleteSession('in_progress')).toBe(true);
    });

    it('returns true for uppercase "IN_PROGRESS"', () => {
      expect(canCompleteSession('IN_PROGRESS')).toBe(true);
    });
  });

  describe('returns false for terminal statuses', () => {
    it('returns false for "completed"', () => {
      expect(canCompleteSession('completed')).toBe(false);
    });

    it('returns false for "cancelled"', () => {
      expect(canCompleteSession('cancelled')).toBe(false);
    });

    it('returns false for "no_show"', () => {
      expect(canCompleteSession('no_show')).toBe(false);
    });
  });

  describe('returns false for unknown/other statuses', () => {
    it('returns false for empty string', () => {
      expect(canCompleteSession('')).toBe(false);
    });

    it('returns false for "unknown"', () => {
      expect(canCompleteSession('unknown')).toBe(false);
    });

    it('returns false for "pending"', () => {
      expect(canCompleteSession('pending')).toBe(false);
    });

    it('returns false for "confirmed"', () => {
      expect(canCompleteSession('confirmed')).toBe(false);
    });

    it('returns false for arbitrary string', () => {
      expect(canCompleteSession('some_random_status')).toBe(false);
    });

    it('returns false for "scheduled" until it is started', () => {
      expect(canCompleteSession('scheduled')).toBe(false);
    });

    it('returns false for uppercase "SCHEDULED"', () => {
      expect(canCompleteSession('SCHEDULED')).toBe(false);
    });
  });
});

// ===========================================================================
// isTerminalStatus
// ===========================================================================

describe('isTerminalStatus', () => {
  describe('returns true for terminal statuses', () => {
    it('returns true for "completed"', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('returns true for "cancelled"', () => {
      expect(isTerminalStatus('cancelled')).toBe(true);
    });

    it('returns true for "no_show"', () => {
      expect(isTerminalStatus('no_show')).toBe(true);
    });
  });

  describe('returns false for non-terminal statuses', () => {
    it('returns false for "in_progress"', () => {
      expect(isTerminalStatus('in_progress')).toBe(false);
    });

    it('returns false for "scheduled"', () => {
      expect(isTerminalStatus('scheduled')).toBe(false);
    });

    it('returns false for "pending"', () => {
      expect(isTerminalStatus('pending')).toBe(false);
    });

    it('returns false for "confirmed"', () => {
      expect(isTerminalStatus('confirmed')).toBe(false);
    });
  });

  describe('returns false for unknown/other statuses', () => {
    it('returns false for empty string', () => {
      expect(isTerminalStatus('')).toBe(false);
    });

    it('returns false for "unknown"', () => {
      expect(isTerminalStatus('unknown')).toBe(false);
    });

    it('returns false for arbitrary string', () => {
      expect(isTerminalStatus('some_random_status')).toBe(false);
    });

    it('returns false for uppercase "COMPLETED" (case-sensitive)', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(false);
    });

    it('returns false for uppercase "CANCELLED" (case-sensitive)', () => {
      expect(isTerminalStatus('CANCELLED')).toBe(false);
    });
  });
});

// ===========================================================================
// Relationship between canCompleteSession and isTerminalStatus
// ===========================================================================

describe('canCompleteSession and isTerminalStatus relationship', () => {
  const terminalStatuses = ['completed', 'cancelled', 'no_show'];
  const completableStatuses = ['in_progress'];
  const otherStatuses = ['pending', 'confirmed', 'unknown', ''];

  it('terminal statuses are never completable', () => {
    for (const status of terminalStatuses) {
      expect(canCompleteSession(status)).toBe(false);
    }
  });

  it('completable statuses are never terminal', () => {
    for (const status of completableStatuses) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });

  it('other statuses are neither completable nor terminal', () => {
    for (const status of otherStatuses) {
      expect(canCompleteSession(status)).toBe(false);
      expect(isTerminalStatus(status)).toBe(false);
    }
  });
});
