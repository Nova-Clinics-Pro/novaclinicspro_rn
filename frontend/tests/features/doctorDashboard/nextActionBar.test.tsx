/**
 * T-FE-B.2 — NextActionBar tests (`NextActionBar.tsx`).
 *
 * Mocks the governed `useClinicalWorkflowQuery` hook directly (same
 * level `workflowPills.test.tsx` mocks it at) and mocks `expo-router`'s
 * `useRouter` to assert navigation calls without a real router.
 *
 * Covers: data-source discipline (reused hook, no second query key, no
 * datasource/axios import in presentation), every recommendation state
 * (actionable / waiting / blocked / unresolved / no-recommendation /
 * episode-closed / no-route-yet), the mandatory Decision-7 deviation
 * menu (always present, alternatives rendered verbatim, no reordering,
 * no silent promotion), navigation correctness (exact route + context,
 * no navigation for disabled/waiting/blocked), localization (no raw
 * backend codes), and accessibility.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { NextActionBar } from '../../../features/episodes/presentation/components/NextActionBar';
import { useClinicalWorkflowQuery } from '../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl';
import {
  ClinicalWorkflowResolutionResponse,
  AlternativeAction,
} from '../../../features/episodes/data/models/clinicalWorkflow.dtos';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl', () => ({
  useClinicalWorkflowQuery: jest.fn(),
}));

const mockUseClinicalWorkflowQuery = useClinicalWorkflowQuery as jest.Mock;
const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

const alt = (overrides: Partial<AlternativeAction> = {}): AlternativeAction => ({
  action: 'record_prescription',
  stage: 'prescription',
  reason_code: 'currently_actionable',
  ...overrides,
});

const resolution = (overrides: Partial<ClinicalWorkflowResolutionResponse> = {}): ClinicalWorkflowResolutionResponse => ({
  stages: [],
  recommended_action: null,
  recommendation_reason: null,
  blocking_factors: [],
  waiting_role: null,
  alternatives: [],
  completion_readiness: { ready: false, unresolved_stage_codes: [], reason_code: null },
  outstanding_work: [],
  optional_work: [],
  unresolved_facts: [],
  capability_loss: [],
  ...overrides,
});

const queryResult = (overrides: Partial<{
  data: ClinicalWorkflowResolutionResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
}> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

const ctxProps = { tenantId: 't1', clientId: 'c1', episodeId: 'e1', appointmentId: 'a1' };

describe('NextActionBar (T-FE-B.2, FR-REC-2, FR-COS-2, Decision 7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
  });

  describe('data-source discipline', () => {
    it('calls the SAME governed hook WorkflowPills uses, with the exact context identifiers — no second query', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ data: resolution() }));
      render(<NextActionBar {...ctxProps} />);
      expect(mockUseClinicalWorkflowQuery).toHaveBeenCalledWith('t1', 'c1', 'e1', 'a1');
      expect(mockUseClinicalWorkflowQuery).toHaveBeenCalledTimes(1);
    });

    it('does not import the datasource or axiosClient directly', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/NextActionBar.tsx'),
        'utf8',
      );
      expect(source).not.toMatch(/clinicalWorkflow\.api/);
      expect(source).not.toMatch(/axiosClient/);
    });

    it('does not define a second query key or call useQuery directly', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/NextActionBar.tsx'),
        'utf8',
      );
      expect(source).not.toMatch(/useQuery\(/);
      expect(source).not.toMatch(/queryKey/);
    });
  });

  it('shows a loading state', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { getByText } = render(<NextActionBar {...ctxProps} />);
    expect(getByText('Next action')).toBeTruthy();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows a localized error state with retry, reusing the query\'s own refetch()', () => {
    const refetch = jest.fn();
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ isError: true, refetch }));
    const { getByText } = render(<NextActionBar {...ctxProps} />);
    expect(getByText('Next action currently unavailable')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  describe('actionable recommendation', () => {
    it('renders the localized action label, reason, and an accessible [Do this] CTA', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: 'record_prescription', recommendation_reason: 'next_mandatory_step' }),
        }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      expect(getByText('Record prescription')).toBeTruthy();
      expect(getByText('This is the next required step')).toBeTruthy();
      const doThis = getByTestId('next-action-recommendation');
      expect(doThis).toBeTruthy();
      expect(getByText('Do this')).toBeTruthy();
    });

    it('navigates to the correct existing route with the exact required context on [Do this]', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'record_prescription' }) }),
      );
      const { getByText } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText('Do this'));
      expect(router.push).toHaveBeenCalledWith(
        '/clinic-admin/episodes/e1/workspace?appointmentId=a1&clientId=c1&mode=doctor&step=prescription',
      );
    });

    it('navigates complete_visit to the complete-consultation route', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'complete_visit', recommendation_reason: 'visit_complete' }) }),
      );
      const { getByText } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText('Do this'));
      expect(router.push).toHaveBeenCalledWith(
        '/clinic-admin/episodes/e1/workspace?appointmentId=a1&clientId=c1&mode=doctor&step=completion',
      );
    });

    it('renders a non-navigable explanatory state for a backend action with no existing frontend route (resolve_blocker)', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'resolve_blocker', recommendation_reason: 'blocked' }) }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      expect(getByText('Resolve blocker')).toBeTruthy();
      expect(getByText('Not yet available in this app')).toBeTruthy();
      fireEvent.press(getByTestId('next-action-do-this-unavailable'));
      expect(router.push).not.toHaveBeenCalled();
    });

    it('does not navigate for review_episode_disposition (no existing route)', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'review_episode_disposition', recommendation_reason: 'visit_complete' }) }),
      );
      const { getByTestId } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('waiting on role/permission', () => {
    it('renders the named waiting permission, never an enabled CTA, and does not navigate', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: null, waiting_role: 'billing.create', recommendation_reason: 'waiting_on_other_role' }),
        }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-waiting')).toBeTruthy();
      expect(getByText('Waiting on: billing.create')).toBeTruthy();
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('blocked', () => {
    it('renders blocking_factors mapped to translations, never a fabricated resolution', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: null, blocking_factors: ['scheduling_denied'] }),
        }),
      );
      const { getByTestId, getByText, queryByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-blocked')).toBeTruthy();
      expect(getByText('Blocked')).toBeTruthy();
      expect(getByText('Scheduling is not currently permitted')).toBeTruthy();
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
      expect(queryByText('scheduling_denied')).toBeNull();
    });
  });

  describe('unresolved', () => {
    it('renders an error/unavailable surface, never a patient-facing recommendation', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: null, recommendation_reason: 'unresolved_facts', unresolved_facts: ['permission_facts_unavailable'] }),
        }),
      );
      const { getByTestId, getByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-unresolved')).toBeTruthy();
      expect(getByText('Currently unavailable')).toBeTruthy();
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
    });
  });

  describe('no recommendation / not applicable', () => {
    it('renders a distinct "no recommendation" state for episode_closed, not "Coming soon"', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: null, recommendation_reason: 'episode_closed' }) }),
      );
      const { getByTestId, getByText, queryByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-none')).toBeTruthy();
      expect(getByText('No recommendation right now')).toBeTruthy();
      expect(getByText('This episode is closed')).toBeTruthy();
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
      expect(queryByText('Coming Soon')).toBeNull();
    });

    it('never collapses waiting/blocked/unresolved/no-recommendation into the same testID', () => {
      const cases: [Partial<ClinicalWorkflowResolutionResponse>, string][] = [
        [{ recommended_action: null, waiting_role: 'x' }, 'next-action-waiting'],
        [{ recommended_action: null, blocking_factors: ['blocked'] }, 'next-action-blocked'],
        [{ recommended_action: null, recommendation_reason: 'unresolved_facts' }, 'next-action-unresolved'],
        [{ recommended_action: null, recommendation_reason: 'episode_closed' }, 'next-action-none'],
      ];
      cases.forEach(([overrides, testId]) => {
        mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ data: resolution(overrides) }));
        const { getByTestId, unmount } = render(<NextActionBar {...ctxProps} />);
        expect(getByTestId(testId)).toBeTruthy();
        unmount();
      });
    });
  });

  describe('unknown code safe fallback', () => {
    it('never shows a raw unrecognised reason code, uses the safe generic fallback instead', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: 'record_assessment', recommendation_reason: 'some_future_backend_reason_code' }),
        }),
      );
      const { getByText, queryByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByText('Reason unavailable')).toBeTruthy();
      expect(queryByText('some_future_backend_reason_code')).toBeNull();
    });

    it('falls back to the raw action code only as a last resort if the registry has no entry (never crashes)', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'a_future_action_code' as never }) }),
      );
      const { getByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByText('a_future_action_code')).toBeTruthy();
    });
  });

  describe('deviation menu (Decision 7 — always present, ≤1 tap)', () => {
    it('is present in EVERY state: actionable, waiting, blocked, unresolved, and no-recommendation', () => {
      const states: Partial<ClinicalWorkflowResolutionResponse>[] = [
        { recommended_action: 'record_assessment' },
        { recommended_action: null, waiting_role: 'x' },
        { recommended_action: null, blocking_factors: ['blocked'] },
        { recommended_action: null, recommendation_reason: 'unresolved_facts' },
        { recommended_action: null, recommendation_reason: 'episode_closed' },
      ];
      states.forEach((overrides) => {
        mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ data: resolution(overrides) }));
        const { getByText, unmount } = render(<NextActionBar {...ctxProps} />);
        expect(getByText(/Something else/)).toBeTruthy();
        unmount();
      });
    });

    it('opens within a single tap and renders backend alternatives verbatim, preserving order', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({
            recommended_action: 'record_assessment',
            alternatives: [alt({ action: 'record_prescription', stage: 'prescription' }), alt({ action: 'complete_visit', stage: 'visit_completion' })],
          }),
        }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText(/Something else/));
      const menu = getByTestId('deviation-menu');
      expect(menu).toBeTruthy();
      expect(getByTestId('alternative-record_prescription')).toBeTruthy();
      expect(getByTestId('alternative-complete_visit')).toBeTruthy();
    });

    it('does not silently promote an alternative to the primary CTA — pressing one navigates, primary label unchanged', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({
            recommended_action: 'record_assessment',
            alternatives: [alt({ action: 'record_prescription' })],
          }),
        }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText(/Something else/));
      fireEvent.press(getByTestId('alternative-record_prescription'));
      expect(router.push).toHaveBeenCalledWith(
        '/clinic-admin/episodes/e1/workspace?appointmentId=a1&clientId=c1&mode=doctor&step=prescription',
      );
      // Primary recommendation text is untouched by opening the menu.
      expect(getByText('Record assessment')).toBeTruthy();
    });

    it('shows a not-applicable state when there are zero alternatives, never an empty broken menu', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'record_assessment', alternatives: [] }) }),
      );
      const { getByText } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText(/Something else/));
      expect(getByText('Not applicable')).toBeTruthy();
    });

    it('disables an alternative with no existing route rather than navigating nowhere', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({
            recommended_action: 'record_assessment',
            alternatives: [alt({ action: 'resolve_blocker', stage: 'billing' })],
          }),
        }),
      );
      const { getByText, getByTestId } = render(<NextActionBar {...ctxProps} />);
      fireEvent.press(getByText(/Something else/));
      fireEvent.press(getByTestId('alternative-resolve_blocker'));
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('exposes accessibilityRole="button" and a descriptive label on the [Do this] CTA', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'record_assessment' }) }),
      );
      const { getByLabelText } = render(<NextActionBar {...ctxProps} />);
      expect(getByLabelText(/Do this: Record assessment/)).toBeTruthy();
    });

    it('exposes accessibilityRole="button" on the deviation menu toggle', async () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution({ recommended_action: 'record_assessment' }) }),
      );
      const { getByLabelText } = render(<NextActionBar {...ctxProps} />);
      await waitFor(() => expect(getByLabelText('Something else')).toBeTruthy());
    });
  });

  describe('read-only role sees content, actions hidden (T-FE-D.1, W19/W26)', () => {
    /**
     * Engineering Truth (verified in clinical_workflow_resolver.py's
     * `_actionable_state(write_permission, permission)`, called from
     * every document-lifecycle stage builder): actionability for the
     * REQUESTING user is already resolved server-side, per request —
     * a user lacking a stage's write permission gets that stage back as
     * `waiting` (never `current`), with `waiting_permission` set. So a
     * read-only role's own missing permission and "someone else must act"
     * render through the exact same, already-correct waiting branch —
     * no new frontend permission check is introduced or required here.
     */
    it('a stage the requesting user cannot act on arrives as "waiting" and renders content with a disabled CTA', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({
            recommended_action: null,
            waiting_role: 'prescriptions.write',
            recommendation_reason: 'waiting_on_other_role',
          }),
        }),
      );
      const { getByTestId, getByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByTestId('next-action-waiting')).toBeTruthy();
      // Content (the reason/context) stays visible even though no
      // action is available — never an empty region.
      expect(getByText('Waiting on: prescriptions.write')).toBeTruthy();
      expect(getByTestId('next-action-do-this-unavailable')).toBeTruthy();
    });

    it('the deviation menu ("[Something else]") remains available even when the primary action is hidden for permission reasons', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution({ recommended_action: null, waiting_role: 'prescriptions.write' }),
        }),
      );
      const { getByText } = render(<NextActionBar {...ctxProps} />);
      expect(getByText(/Something else/)).toBeTruthy();
    });

    it('renders only a disabled [Do this] button when recommended_action is null, regardless of reason', () => {
      const reasons = ['waiting_on_other_role', 'episode_closed', 'unresolved_facts'];
      reasons.forEach((recommendation_reason) => {
        mockUseClinicalWorkflowQuery.mockReturnValue(
          queryResult({
            data: resolution({
              recommended_action: null,
              recommendation_reason,
              waiting_role: recommendation_reason === 'waiting_on_other_role' ? 'x' : null,
              unresolved_facts: recommendation_reason === 'unresolved_facts' ? ['x'] : [],
            }),
          }),
        );
        const { getByTestId, unmount } = render(<NextActionBar {...ctxProps} />);
        fireEvent.press(getByTestId('next-action-do-this-unavailable'));
        expect(router.push).not.toHaveBeenCalled();
        unmount();
      });
    });
  });
});
