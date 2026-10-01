/**
 * T-FE-B.1 — WorkflowPills tests (`WorkflowPills.tsx`).
 *
 * Mocks the governed `useClinicalWorkflowQuery` hook directly (the same
 * level `whyTodaySection.test.tsx` mocks `useClinicalWorkspaceQuery` at)
 * — proves the component's own render logic without re-testing the hook
 * itself (covered by `clinicalWorkflowDataHook.test.tsx`).
 *
 * Covers: each backend state's visual mapping (including the two states
 * absent from tasks.md's own AC shorthand — read_only/historical_only —
 * and the one deliberately never rendered as a badge — unresolved),
 * loading/error/retry, empty stages, localization (no raw backend code
 * shown), no frontend assembly/reordering, icon+text (never colour-alone),
 * mandatory/optional and waiting_permission passthrough, and a11y labels.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { WorkflowPills } from '../../../features/episodes/presentation/components/WorkflowPills';
import { useClinicalWorkflowQuery } from '../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl';
import { WorkflowStage, ClinicalWorkflowResolutionResponse } from '../../../features/episodes/data/models/clinicalWorkflow.dtos';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/episodes/data/repositories/clinicalWorkflow.repository.impl', () => ({
  useClinicalWorkflowQuery: jest.fn(),
}));

const mockUseClinicalWorkflowQuery = useClinicalWorkflowQuery as jest.Mock;
const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

const stage = (overrides: Partial<WorkflowStage> = {}): WorkflowStage => ({
  code: 'consultation',
  state: 'completed',
  mandatory: true,
  waiting_permission: null,
  blocking_reason_code: null,
  detail_reason_code: null,
  ...overrides,
});

const resolution = (stages: WorkflowStage[]): ClinicalWorkflowResolutionResponse => ({
  stages,
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

describe('WorkflowPills (T-FE-B.1, FR-MOB-2, FR-WFA-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
  });

  it('calls the governed hook with the exact context identifiers', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ data: resolution([]) }));
    render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(mockUseClinicalWorkflowQuery).toHaveBeenCalledWith('t1', 'c1', 'e1', 'a1');
  });

  it('shows a loading state', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ isLoading: true }));
    const { getByText } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(getByText('Workflow')).toBeTruthy();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows a localized error state with retry, never a raw error object', () => {
    const refetch = jest.fn();
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ isError: true, refetch }));
    const { getByText } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(getByText('Workflow currently unavailable')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty state distinctly when the backend returns zero stages', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(queryResult({ data: resolution([]) }));
    const { getByText, queryByTestId } = render(
      <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByText('No workflow stages for this visit')).toBeTruthy();
    expect(queryByTestId(/^workflow-pill-/)).toBeNull();
  });

  it('renders every backend stage code and localized label — never a raw backend code', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({
        data: resolution([
          stage({ code: 'consultation', state: 'completed' }),
          stage({ code: 'prescription', state: 'current' }),
          stage({ code: 'billing', state: 'pending' }),
        ]),
      }),
    );
    const { getByTestId, queryByText } = render(
      <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByTestId('workflow-pill-consultation')).toBeTruthy();
    expect(getByTestId('workflow-pill-prescription')).toBeTruthy();
    expect(getByTestId('workflow-pill-billing')).toBeTruthy();
    // No raw snake_case backend code ever shown as visible text.
    expect(queryByText('consultation')).toBeNull();
    expect(queryByText('treatment_recommendation')).toBeNull();
  });

  it.each([
    ['completed', 'checkmark-circle'],
    ['current', 'ellipse'],
    ['pending', 'ellipse-outline'],
    ['waiting', 'time-outline'],
    ['blocked', 'alert-circle'],
    ['read_only', 'remove-circle-outline'],
    ['historical_only', 'remove-circle-outline'],
    ['not_applicable', 'remove-circle-outline'],
  ])('maps backend state "%s" to icon+text, never colour-alone', (state, expectedIcon) => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({ data: resolution([stage({ code: 'consultation', state })]) }),
    );
    const { getByTestId, UNSAFE_getByProps } = render(
      <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByTestId('workflow-pill-consultation')).toBeTruthy();
    expect(UNSAFE_getByProps({ name: expectedIcon })).toBeTruthy();
  });

  it('never renders a pill for state "unresolved" — the backend\'s own rule: never a patient-facing badge', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({
        data: resolution([
          stage({ code: 'consultation', state: 'completed' }),
          stage({ code: 'prescription', state: 'unresolved' }),
        ]),
      }),
    );
    const { getByTestId, queryByTestId } = render(
      <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
    );
    expect(getByTestId('workflow-pill-consultation')).toBeTruthy();
    expect(queryByTestId('workflow-pill-prescription')).toBeNull();
  });

  it('renders stages in exactly the order the backend returns them — no frontend reordering', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({
        data: resolution([
          stage({ code: 'billing', state: 'pending' }),
          stage({ code: 'consultation', state: 'completed' }),
          stage({ code: 'prescription', state: 'current' }),
        ]),
      }),
    );
    const { toJSON } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    const serialized = JSON.stringify(toJSON());
    expect(serialized.indexOf('"workflow-pill-billing"')).toBeLessThan(
      serialized.indexOf('"workflow-pill-consultation"'),
    );
    expect(serialized.indexOf('"workflow-pill-consultation"')).toBeLessThan(
      serialized.indexOf('"workflow-pill-prescription"'),
    );
  });

  it('renders the raw waiting_permission code via a template, never a guessed role name', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({
        data: resolution([stage({ code: 'billing', state: 'waiting', waiting_permission: 'billing.create' })]),
      }),
    );
    const { getByText } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(getByText('Waiting on: billing.create')).toBeTruthy();
  });

  it('marks a non-mandatory stage as optional, without inventing new backend meaning', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({ data: resolution([stage({ code: 'assessment', state: 'pending', mandatory: false })]) }),
    );
    const { getByText } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(getByText('Optional')).toBeTruthy();
  });

  it('exposes an accessibility label combining stage, state, and waiting reason — no color-only signal', () => {
    mockUseClinicalWorkflowQuery.mockReturnValue(
      queryResult({
        data: resolution([stage({ code: 'billing', state: 'waiting', waiting_permission: 'billing.create' })]),
      }),
    );
    const { getByLabelText } = render(<WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />);
    expect(getByLabelText(/Billing, Waiting, Waiting on: billing\.create/)).toBeTruthy();
  });

  describe('blocked stage reason + fix affordance (T-FE-D.1, W18 — never a dead end)', () => {
    it('renders the localized blocking reason for a blocked stage', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'treatment_recommendation', state: 'blocked', blocking_reason_code: 'scheduling_denied' }),
          ]),
        }),
      );
      const { getByTestId, getByText } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(getByTestId('blocked-stage-detail-treatment_recommendation')).toBeTruthy();
      expect(getByText(/Scheduling is not currently permitted/)).toBeTruthy();
    });

    it('never shows a raw blocking_reason_code, falls back to detail_reason_code, then to a safe generic fallback', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'billing', state: 'blocked', detail_reason_code: 'billing_facts_unavailable' }),
          ]),
        }),
      );
      const { getByText, queryByText } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(getByText(/Billing facts unavailable/)).toBeTruthy();
      expect(queryByText(/billing_facts_unavailable/)).toBeNull();
    });

    it('falls back to a safe generic reason for an unrecognised code, never inventing clinical meaning', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'assessment', state: 'blocked', blocking_reason_code: 'a_future_backend_reason' }),
          ]),
        }),
      );
      const { getByText, queryByText } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(getByText(/Reason unavailable/)).toBeTruthy();
      expect(queryByText(/a_future_backend_reason/)).toBeNull();
    });

    it('renders a "fix this" affordance reusing the EXISTING route for a stage with a mapped action, never a dead end', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'prescription', state: 'blocked', blocking_reason_code: 'blocked' }),
          ]),
        }),
      );
      const { getByTestId } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      fireEvent.press(getByTestId('blocked-stage-fix-prescription'));
      expect(router.push).toHaveBeenCalledWith(
        '/clinic-admin/episodes/e1/workspace?appointmentId=a1&clientId=c1&mode=doctor&step=prescription',
      );
    });

    it('shows no fix affordance for a blocked stage with no mapped action (e.g. consultation) — never fabricates a route', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([stage({ code: 'consultation', state: 'blocked', blocking_reason_code: 'blocked' })]),
        }),
      );
      const { queryByTestId } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(queryByTestId('blocked-stage-fix-consultation')).toBeNull();
    });

    it('renders every blocked stage, in backend order, never only the top recommendation', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'prescription', state: 'blocked', blocking_reason_code: 'blocked' }),
            stage({ code: 'billing', state: 'blocked', blocking_reason_code: 'blocked' }),
          ]),
        }),
      );
      const { getByTestId, toJSON } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(getByTestId('blocked-stage-detail-prescription')).toBeTruthy();
      expect(getByTestId('blocked-stage-detail-billing')).toBeTruthy();
      const serialized = JSON.stringify(toJSON());
      expect(serialized.indexOf('"blocked-stage-detail-prescription"')).toBeLessThan(
        serialized.indexOf('"blocked-stage-detail-billing"'),
      );
    });

    it('renders no blocked-stage details when there are no blocked stages', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({ data: resolution([stage({ code: 'consultation', state: 'completed' })]) }),
      );
      const { queryByTestId } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(queryByTestId(/^blocked-stage-detail-/)).toBeNull();
    });
  });

  describe('capability-driven stage absence, never clinic-type/name (frozen AC)', () => {
    it('WorkflowPillsProps carries no clinic-type/specialty field — absence is structurally backend-only', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/WorkflowPills.tsx'),
        'utf8',
      );
      const propsBlock = source.slice(
        source.indexOf('export interface WorkflowPillsProps'),
        source.indexOf('}', source.indexOf('export interface WorkflowPillsProps')),
      );
      expect(propsBlock).not.toMatch(/clinicType|specialty|clinicName/i);
    });

    it('a GP tenant (no therapy stages in the backend response) renders exactly the stages the backend sent — no local filtering by clinic type', () => {
      mockUseClinicalWorkflowQuery.mockReturnValue(
        queryResult({
          data: resolution([
            stage({ code: 'consultation', state: 'completed' }),
            stage({ code: 'prescription', state: 'current' }),
            stage({ code: 'billing', state: 'pending' }),
            stage({ code: 'visit_completion', state: 'pending' }),
          ]),
        }),
      );
      const { getByTestId, queryByTestId } = render(
        <WorkflowPills tenantId="t1" clientId="c1" episodeId="e1" appointmentId="a1" />,
      );
      expect(getByTestId('workflow-pill-consultation')).toBeTruthy();
      expect(queryByTestId('workflow-pill-treatment_recommendation')).toBeNull();
      expect(queryByTestId('workflow-pill-treatment_plan')).toBeNull();
    });
  });
});

describe('architecture — no frontend workflow assembly', () => {
  it('WorkflowPills.tsx does not import the domain scheduling/workflow resolver or derive its own recommendation', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/WorkflowPills.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/buildSectionConfig/);
    expect(source).not.toMatch(/nextAction\(/);
    expect(source).not.toMatch(/resolve_clinical_workflow/);
    // Presentation must not compute readiness/blockers itself.
    expect(source).not.toMatch(/completion_readiness\s*=\s*{/);
    // T-FE-D.1 (frozen AC): capability-driven absence, never clinic-name.
    // (Scoped separately, props-only, in the "capability-driven stage
    // absence" describe block below -- this file's own docstrings
    // legitimately discuss "never clinic-type/specialty", which a
    // whole-file scan would false-positive on.)
    // T-FE-D.1 (W18): reuses the existing registry, never a second one.
    expect(source).toMatch(/NEXT_ACTION_REGISTRY/);
    expect(source).not.toMatch(/const\s+NEXT_ACTION_REGISTRY\s*=/);
  });
});
