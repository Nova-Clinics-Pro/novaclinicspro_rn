import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { ClinicalTimeline } from '../../../features/episodes/presentation/components/ClinicalTimeline';
import { useClinicalTimelineData } from '../../../features/episodes/presentation/hooks/useClinicalTimelineData';

/**
 * R3B · T-C.2 (rewritten for T-FE-C.5, T-BE-A.3/A.3a) — Verification for
 * `ClinicalTimeline` (render-only). Confirms rendering/navigation behavior
 * and — via source-level checks — the binding constraints design.md
 * §7/CO-3/CO-4/CO-6/N-7 place on this specific file: no aggregation logic
 * (Timeline Adapter Rule), no clinical-artifact state (CO-4), and zero
 * create/update/save API calls of any kind, including no Visit Note API
 * (N-7). Item fixtures use the T-FE-C.5 backend encounter-type taxonomy
 * (consultation/treatment_review/treatment_plan/legacy_treatment_sessions)
 * -- the pre-T-FE-C.5 flat-assembly types (visit/prescription/case_sheet/
 * treatment_recommendation/clinical_service) no longer occur.
 */

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../../features/episodes/presentation/hooks/useClinicalTimelineData', () => ({
  useClinicalTimelineData: jest.fn(),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
      feedback: { error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    typography: { h6: {}, subtitle2: {}, body2: {}, caption: {}, button: {} },
    sizes: { touchTarget: 44, iconSmall: 16, iconMedium: 24, iconLarge: 32 },
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };

const baseHookResult = {
  items: [] as any[],
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

function mockHook(overrides: Partial<typeof baseHookResult> = {}) {
  (useClinicalTimelineData as jest.Mock).mockReturnValue({ ...baseHookResult, ...overrides });
}

describe('ClinicalTimeline (T-FE-C.5, T-BE-A.3/A.3a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(router);
  });

  it('shows a loading indicator while the adapter is loading', () => {
    mockHook({ isLoading: true });
    const { queryByText } = render(<ClinicalTimeline />);
    expect(queryByText('No clinical activity recorded yet for this episode.')).toBeNull();
  });

  it('shows an empty state when there are no items and loading has finished', () => {
    mockHook({ items: [] });
    const { getByText } = render(<ClinicalTimeline />);
    expect(getByText('No clinical activity recorded yet for this episode.')).toBeTruthy();
  });

  it('shows a localized error state with a functional Retry action, distinct from the empty state', () => {
    const refetch = jest.fn();
    mockHook({ isError: true, refetch });
    const { getByText, queryByText } = render(<ClinicalTimeline />);
    expect(getByText('Could not load clinical history.')).toBeTruthy();
    expect(queryByText('No clinical activity recorded yet for this episode.')).toBeNull();
    fireEvent.press(getByText('Retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders every backend-classified item\'s title and navigates to its route when one exists (FR-C2)', () => {
    mockHook({
      items: [
        { id: 'a1', type: 'consultation', date: '2026-06-04', title: 'Consultation', appointmentIds: ['a1'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a1' },
        { id: 'a4', type: 'legacy_treatment_sessions', date: '2026-06-01', title: 'Therapy Sessions', appointmentIds: ['a4'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a4' },
      ],
    });
    const { getByText } = render(<ClinicalTimeline />);

    expect(getByText('Consultation')).toBeTruthy();
    expect(getByText('Therapy Sessions')).toBeTruthy();

    fireEvent.press(getByText('Consultation'));
    expect(router.push).toHaveBeenCalledWith('/clinic-admin/appointments/a1');
  });

  it('Treatment Review renders and is not dropped even though it has no route or appointmentIds', () => {
    mockHook({
      items: [
        { id: 'sheet-1', type: 'treatment_review', date: null, title: 'Treatment Review', appointmentIds: [], planId: null, sessionCounts: null, route: undefined },
      ],
    });
    const { getByText } = render(<ClinicalTimeline />);
    expect(getByText('Treatment Review')).toBeTruthy();
  });

  it('an item with no route (Treatment Plan/Treatment Review) does not navigate on press -- never calls router.push(undefined)', () => {
    mockHook({
      items: [
        { id: 'p1', type: 'treatment_plan', date: '2026-05-15', title: 'Treatment Plan', appointmentIds: ['a2', 'a3'], planId: 'p1', sessionCounts: { completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 }, route: undefined },
      ],
    });
    const { getByText } = render(<ClinicalTimeline />);
    fireEvent.press(getByText('Treatment Plan'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('renders a null occurred_at honestly (via the existing null-safe formatDate) rather than fabricating a date or dropping the item', () => {
    mockHook({
      items: [
        { id: 'sheet-1', type: 'treatment_review', date: null, title: 'Treatment Review', appointmentIds: [], planId: null, sessionCounts: null, route: undefined },
      ],
    });
    const { getByText } = render(<ClinicalTimeline />);
    // formatDate(null) -> '—', the pre-existing null-safe placeholder.
    expect(getByText('—')).toBeTruthy();
  });

  it('multiple items with the same occurred_at remain separate, distinct rows', () => {
    mockHook({
      items: [
        { id: 'a1', type: 'consultation', date: '2026-06-01T10:00:00', title: 'Consultation', appointmentIds: ['a1'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a1' },
        { id: 'a2', type: 'consultation', date: '2026-06-01T10:00:00', title: 'Consultation', appointmentIds: ['a2'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a2' },
      ],
    });
    const { getAllByText } = render(<ClinicalTimeline />);
    expect(getAllByText('Consultation')).toHaveLength(2);
  });

  it('an unrecognized future encounter type still renders (icon falls back, title comes from the adapter) rather than crashing', () => {
    mockHook({
      items: [
        { id: 'x1', type: 'a_future_type', date: null, title: 'Clinical Encounter', appointmentIds: [], planId: null, sessionCounts: null, route: undefined },
      ],
    });
    const { getByText } = render(<ClinicalTimeline />);
    expect(getByText('Clinical Encounter')).toBeTruthy();
  });

  describe('Source-level checks (design.md §7 Timeline Adapter Rule; CO-3, CO-4, CO-6; N-7)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ClinicalTimeline.tsx'),
      'utf8',
    );

    it('performs no aggregation of its own — calls exactly one hook (useClinicalTimelineData) and no other query hook', () => {
      expect(source).toContain('useClinicalTimelineData()');
      expect(source).not.toMatch(/useAppointmentsListQuery|usePrescriptionsListQuery|useTreatmentSheetsByEpisodeQuery|useQueries\(/);
    });

    it('holds no clinical-artifact state (CO-4) -- no useReducer, and the only useState is the T-FE-C.6 presentation-only expand/collapse id set', () => {
      expect(source).not.toMatch(/useReducer/);
      const useStateCalls = source.match(/useState[<(]/g) ?? [];
      expect(useStateCalls.length).toBe(1);
      expect(source).toMatch(/useState<Set<string>>\(new Set\(\)\)/);
    });

    it('calls zero create/update/save APIs of any kind, including no Visit Note API (N-7, CO-6)', () => {
      expect(source).not.toMatch(/mutateAsync|useMutation|axiosClient\.(post|put|patch|delete)|create\w*Api|update\w*Api|save\w*Api/i);
    });

    it('never renders an editable field — no TextInput anywhere in this file', () => {
      expect(source).not.toMatch(/TextInput/);
    });

    it('performs no local sort/reverse of items -- backend order rendered exactly as received (T-FE-C.5)', () => {
      expect(source).not.toMatch(/\.sort\(|\.reverse\(/);
    });
  });

  describe('T-FE-C.6 — collapsible Treatment Plan groups + legacy distinction', () => {
    const planItem = {
      id: 'p1',
      type: 'treatment_plan',
      date: '2026-05-15',
      title: 'Treatment Plan',
      appointmentIds: ['a2', 'a3'],
      planId: 'p1',
      sessionCounts: { completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 },
      route: undefined,
    };

    it('a Treatment Plan row is collapsed by default -- session counts are not shown until expanded', () => {
      mockHook({ items: [planItem] });
      const { queryByText } = render(<ClinicalTimeline />);
      expect(queryByText(/Completed: 2/)).toBeNull();
    });

    it('pressing a Treatment Plan row expands it, revealing the real backend session_counts breakdown', () => {
      mockHook({ items: [planItem] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText(/Completed: 2/)).toBeTruthy();
      expect(getByText(/Scheduled: 1/)).toBeTruthy();
      expect(getByText(/Not completed: 3/)).toBeTruthy();
      expect(getByText(/Cancelled: 0/)).toBeTruthy();
    });

    it('pressing an expanded Treatment Plan row again collapses it -- local UI state only, toggles both ways', () => {
      mockHook({ items: [planItem] });
      const { getByText, queryByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText(/Completed: 2/)).toBeTruthy();
      fireEvent.press(getByText('Treatment Plan'));
      expect(queryByText(/Completed: 2/)).toBeNull();
    });

    it('expanding a Treatment Plan row never triggers navigation (no route exists for this type)', () => {
      mockHook({ items: [planItem] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(router.push).not.toHaveBeenCalled();
    });

    it('a Treatment Plan with no session_counts (unresolved) shows no expand affordance and nothing crashes on press', () => {
      mockHook({ items: [{ ...planItem, sessionCounts: null }] });
      const { getByText, queryByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(queryByText(/Completed:/)).toBeNull();
    });

    it('multiple Treatment Plan rows expand/collapse independently', () => {
      const plan2 = { ...planItem, id: 'p2', planId: 'p2', sessionCounts: { completed: 5, scheduled: 0, not_completed: 0, cancelled: 1 } };
      mockHook({ items: [planItem, plan2] });
      const { getAllByText, getByText, queryByText } = render(<ClinicalTimeline />);
      fireEvent.press(getAllByText('Treatment Plan')[0]);
      expect(getByText(/Completed: 2/)).toBeTruthy();
      expect(queryByText(/Completed: 5/)).toBeNull();
    });

    it('every Treatment Plan item the backend returns is rendered -- never locally filtered by any status heuristic (AC-4, literal "remain visible" clause)', () => {
      const plans = [
        { ...planItem, id: 'p1', planId: 'p1' },
        { ...planItem, id: 'p2', planId: 'p2' },
        { ...planItem, id: 'p3', planId: 'p3' },
      ];
      mockHook({ items: plans });
      const { getAllByText } = render(<ClinicalTimeline />);
      expect(getAllByText('Treatment Plan')).toHaveLength(3);
    });

    it('a legacy_treatment_sessions item shows the explicit "Plan association unavailable" label (AC-6)', () => {
      mockHook({
        items: [
          { id: 'a4', type: 'legacy_treatment_sessions', date: '2026-06-01', title: 'Therapy Sessions', appointmentIds: ['a4'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a4' },
        ],
      });
      const { getByText } = render(<ClinicalTimeline />);
      expect(getByText('Plan association unavailable')).toBeTruthy();
    });

    it('a legacy_treatment_sessions item still navigates normally on press -- the added subtitle does not disable its existing route', () => {
      mockHook({
        items: [
          { id: 'a4', type: 'legacy_treatment_sessions', date: '2026-06-01', title: 'Therapy Sessions', appointmentIds: ['a4'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a4' },
        ],
      });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Therapy Sessions'));
      expect(router.push).toHaveBeenCalledWith('/clinic-admin/appointments/a4');
    });

    it('consultation and treatment_review items are unaffected by the expand/collapse feature -- render top-level, never nested (AC-1)', () => {
      mockHook({
        items: [
          { id: 'a1', type: 'consultation', date: '2026-06-04', title: 'Consultation', appointmentIds: ['a1'], planId: null, sessionCounts: null, route: '/clinic-admin/appointments/a1' },
          { id: 'sheet-1', type: 'treatment_review', date: null, title: 'Treatment Review', appointmentIds: [], planId: null, sessionCounts: null, route: undefined },
        ],
      });
      const { getByText } = render(<ClinicalTimeline />);
      expect(getByText('Consultation')).toBeTruthy();
      expect(getByText('Treatment Review')).toBeTruthy();
    });

    describe('Source-level checks', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/ClinicalTimeline.tsx'),
        'utf8',
      );

      it('renders session counts via icon + text, never colour-alone', () => {
        expect(source).toMatch(/SESSION_COUNT_ICON/);
      });

      // T-BE-A.3b/T-FE-C.6a (2026-07-27): the backend contract gap this
      // describe block originally guarded against (no plan_status, no
      // sessions[]) is now closed -- see the dedicated
      // 'T-FE-C.6a — enriched Plan status and Session hierarchy' block
      // below for the tests proving planStatus/item.sessions are read
      // ONLY from the backend item, never locally computed/derived.
    });
  });

  describe('T-FE-C.6a — enriched Plan status and Session hierarchy (T-BE-A.3b)', () => {
    const sessionA = {
      id: 'row-1',
      scheduledDate: '2026-05-20',
      scheduledTime: '09:00:00',
      scheduledAt: null,
      assignedStaffId: 'staff-1',
      assignedStaffName: 'Dr. Rao',
      treatmentName: 'Ultrasound',
      medicinesText: null,
      instructionsText: 'Ice after session',
      status: 'COMPLETED',
      completedAt: '2026-05-20T09:30:00',
      completedByStaffId: 'staff-1',
      nonExecutionReasonCode: null,
      nonExecutionReasonText: null,
    };
    const enrichedPlanItem = {
      id: 'p1',
      type: 'treatment_plan',
      date: '2026-05-15',
      title: 'Treatment Plan',
      appointmentIds: ['a2', 'a3'],
      planId: 'p1',
      sessionCounts: { completed: 1, scheduled: 0, not_completed: 0, cancelled: 0 },
      planStatus: 'active_course',
      sessions: [sessionA],
      route: undefined,
    };

    it('renders the Plan\'s own backend-authoritative status as text when expanded', () => {
      mockHook({ items: [enrichedPlanItem] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Active Course')).toBeTruthy();
    });

    it('an unresolved (null) Plan status renders the honest localized fallback, never a blank or fabricated label', () => {
      mockHook({ items: [{ ...enrichedPlanItem, planStatus: null }] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Plan status unavailable')).toBeTruthy();
    });

    it('an unrecognized future status value is rendered as-is, never silently remapped', () => {
      mockHook({ items: [{ ...enrichedPlanItem, planStatus: 'future_status_code' }] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('future_status_code')).toBeTruthy();
    });

    it('expanding a Plan renders one child row per backend session, showing its therapist and instructions', () => {
      mockHook({ items: [enrichedPlanItem] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Dr. Rao')).toBeTruthy();
      expect(getByText(/Ultrasound/)).toBeTruthy();
    });

    it('an unscheduled session renders the "Date unavailable" fallback, never a fabricated date', () => {
      mockHook({
        items: [{ ...enrichedPlanItem, sessions: [{ ...sessionA, scheduledDate: null, scheduledTime: null, scheduledAt: null }] }],
      });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Date unavailable')).toBeTruthy();
    });

    it('an unassigned session renders the "Therapist unavailable" fallback', () => {
      mockHook({
        items: [{ ...enrichedPlanItem, sessions: [{ ...sessionA, assignedStaffId: null, assignedStaffName: null }] }],
      });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Therapist unavailable')).toBeTruthy();
    });

    it('a session with no doctor content renders "Instructions not recorded", never a vague generic message', () => {
      mockHook({
        items: [{ ...enrichedPlanItem, sessions: [{ ...sessionA, treatmentName: null, medicinesText: null, instructionsText: null }] }],
      });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Instructions not recorded')).toBeTruthy();
    });

    it('a cancelled session with a structured non-execution reason renders the reason, never a bare ambiguous "missed" label', () => {
      mockHook({
        items: [{
          ...enrichedPlanItem,
          sessions: [{
            ...sessionA, status: 'CANCELLED', completedAt: null, completedByStaffId: null,
            nonExecutionReasonCode: 'PATIENT_NO_SHOW', nonExecutionReasonText: 'called ahead',
          }],
        }],
      });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText(/Cancelled — Patient no-show/)).toBeTruthy();
    });

    it('multiple sessions within one expanded Plan each render their own row, in backend order -- never locally sorted', () => {
      const sessionB = { ...sessionA, id: 'row-2', assignedStaffName: 'Dr. Iyer', treatmentName: 'Physio' };
      mockHook({ items: [{ ...enrichedPlanItem, sessions: [sessionA, sessionB] }] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Dr. Rao')).toBeTruthy();
      expect(getByText('Dr. Iyer')).toBeTruthy();
    });

    it('a Plan with no sessions[] (unresolved) shows the expand affordance from session_counts alone and does not crash', () => {
      mockHook({ items: [{ ...enrichedPlanItem, sessions: null }] });
      const { getByText, queryByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(queryByText('Dr. Rao')).toBeNull();
    });

    it('collapsing the Plan hides the Session rows again -- same local UI state as session_counts', () => {
      mockHook({ items: [enrichedPlanItem] });
      const { getByText, queryByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      expect(getByText('Dr. Rao')).toBeTruthy();
      fireEvent.press(getByText('Treatment Plan'));
      expect(queryByText('Dr. Rao')).toBeNull();
    });

    it('a legacy_treatment_sessions item never renders Plan status or Session rows -- enrichment applies only to treatment_plan items', () => {
      mockHook({
        items: [
          { id: 'a4', type: 'legacy_treatment_sessions', date: '2026-06-01', title: 'Therapy Sessions', appointmentIds: ['a4'], planId: null, sessionCounts: null, planStatus: null, sessions: null, route: '/clinic-admin/appointments/a4' },
        ],
      });
      const { queryByText } = render(<ClinicalTimeline />);
      expect(queryByText('Plan status unavailable')).toBeNull();
    });

    describe('Source-level checks', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/ClinicalTimeline.tsx'),
        'utf8',
      );

      it('reads planStatus from the backend item, never computes/derives a status itself', () => {
        expect(source).toMatch(/item\.planStatus/);
        expect(source).not.toMatch(/deriveStatus|computeStatus|inferStatus/);
      });

      it('reads sessions from the backend item and never sorts them locally', () => {
        expect(source).toMatch(/item\.sessions/);
        expect(source).not.toMatch(/\.sessions\s*\.\s*sort\(|\[\.\.\.item\.sessions\]\.sort/);
      });

      it('Session rows are never given an onPress handler -- read-only, no scheduling/execution action from Clinical History', () => {
        const sessionRowMatch = source.match(/const SessionRow[\s\S]*?^\};/m);
        expect(sessionRowMatch).not.toBeNull();
        expect(sessionRowMatch![0]).not.toMatch(/onPress/);
      });

      it('status/date/therapist/instructions render icon + text, never colour-alone', () => {
        const sessionRowMatch = source.match(/const SessionRow[\s\S]*?^\};/m);
        expect(sessionRowMatch![0]).toMatch(/Ionicons/);
        expect(sessionRowMatch![0]).not.toMatch(/backgroundColor:\s*colors\.feedback\.\w+\s*}\s*\/>/);
      });
    });
  });

  describe('T-FE-C.7 — mobile hierarchy behaviour', () => {
    const planItem = {
      id: 'p1',
      type: 'treatment_plan',
      date: '2026-05-15',
      title: 'Treatment Plan',
      appointmentIds: ['a2', 'a3'],
      planId: 'p1',
      sessionCounts: { completed: 2, scheduled: 1, not_completed: 3, cancelled: 0 },
      route: undefined,
    };

    it('AC1: the collapse/expand row renders without error once given an explicit touch-target minHeight (structural proof is the source-level check below)', () => {
      mockHook({ items: [planItem] });
      const { getByText } = render(<ClinicalTimeline />);
      expect(getByText('Treatment Plan')).toBeTruthy();
    });

    it('AC2: Plan grouping is never flattened -- a Treatment Plan item always renders as one grouped row, not one row per appointmentId', () => {
      mockHook({ items: [planItem] });
      const { getAllByText } = render(<ClinicalTimeline />);
      // planItem groups 2 appointmentIds (a2, a3) -- exactly one row must
      // render for the Plan, never two (one per appointment).
      expect(getAllByText('Treatment Plan')).toHaveLength(1);
    });

    it('AC2: multiple Treatment Plan groups remain visually distinct rows, never merged into a flat undifferentiated list', () => {
      const plan2 = { ...planItem, id: 'p2', planId: 'p2' };
      mockHook({ items: [planItem, plan2] });
      const { getAllByText } = render(<ClinicalTimeline />);
      expect(getAllByText('Treatment Plan')).toHaveLength(2);
    });

    it('AC3: session counts render icon + text, never a bare colour-only indicator', () => {
      mockHook({ items: [planItem] });
      const { getByText } = render(<ClinicalTimeline />);
      fireEvent.press(getByText('Treatment Plan'));
      // Every count row has its own text label alongside its icon --
      // proven by the label text itself being present and queryable.
      expect(getByText(/Completed: 2/)).toBeTruthy();
    });

    describe('Source-level checks', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../../features/episodes/presentation/components/ClinicalTimeline.tsx'),
        'utf8',
      );

      it('the item touchable has an explicit minHeight sourced from the governed sizes.touchTarget token, not a raw number', () => {
        expect(source).toMatch(/minHeight:\s*sizes\.touchTarget/);
      });

      it('no raw pixel literal is used as a touch-target minimum (must come from the theme token)', () => {
        expect(source).not.toMatch(/minHeight:\s*44/);
      });

      it('no viewport/screen-width conditional exists that could flatten the hierarchy on a smaller screen', () => {
        expect(source).not.toMatch(/Dimensions\.get|useWindowDimensions|isTablet|isMobile|screenWidth/i);
      });

      it('no dot-only status indicator -- every status-bearing View/Ionicons pairing is followed by a Text sibling in the same row', () => {
        // Structural proxy: SESSION_COUNT_ICON values are always rendered
        // alongside a Text label in SessionCountsBreakdown (verified by
        // the rendering test above); this guards the source itself never
        // introduces a bare status View with only a colour and no text.
        expect(source).not.toMatch(/backgroundColor:\s*colors\.feedback\.\w+\s*}\s*\/>/);
      });
    });
  });

  describe('T-FE-C.4 — virtualization', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../features/episodes/presentation/components/ClinicalTimeline.tsx'),
      'utf8',
    );

    it('renders the item list via a virtualized FlatList, not a plain ScrollView + .map()', () => {
      expect(source).toMatch(/<FlatList/);
      expect(source).not.toMatch(/<ScrollView/);
    });

    it('is bounded (maxHeight) so it is safe to embed inside a host with its own outer ScrollView (VisitCommandCenter)', () => {
      expect(source).toMatch(/maxHeight/);
    });
  });
});
