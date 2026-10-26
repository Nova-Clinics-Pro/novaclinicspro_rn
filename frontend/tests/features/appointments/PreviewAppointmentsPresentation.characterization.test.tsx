import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  PreviewActionBar,
  PreviewGlobalAlternatives,
  PreviewPlanState,
  PreviewSessionCard,
} from '../../../features/appointments/presentation/components/PreviewAppointmentsPresentation';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const t = (key: string) => key;

describe('PreviewAppointments presentation characterization', () => {
  it('keeps extracted preview components free of transport, repository, and query ownership', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../features/appointments/presentation/components/PreviewAppointmentsPresentation.tsx',
      ),
      'utf8',
    );

    expect(source).not.toMatch(/data\/(datasources|repositories)|\.api['"]/);
    expect(source).not.toMatch(/axios|supabase|useQuery|useMutation|QueryClient/);
  });

  it('keeps plan generation, bulk creation, cache invalidation, and R7 linkage in the route', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../features/appointments/presentation/pages/PreviewAppointmentsScreen.tsx'),
      'utf8',
    );

    expect(source).toContain('useGenerateTherapyPlanMutation');
    expect(source).toContain('useBulkCreateAppointmentsMutation');
    expect(source).toContain('treatment_sheet_id: treatmentSheetId');
    expect(source).toContain('episode_id: episodeId');
    expect(source).toContain('case_sheet_id: caseSheetId');
    expect(source).toContain('treatmentOrderKeys.worklists(tenantId)');
  });

  it('preserves loading, retryable validation error, and empty-plan presentation', () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    const { getByText, rerender } = render(
      <PreviewPlanState
        isLoading
        hasError={false}
        hasFetched={false}
        hasSessions={false}
        errorMessage="failure"
        t={t}
        onRetry={onRetry}
        onBack={onBack}
      />,
    );

    expect(getByText('appointments.generatingPlan')).toBeTruthy();

    rerender(
      <PreviewPlanState
        isLoading={false}
        hasError
        hasFetched
        hasSessions={false}
        errorMessage="failure"
        t={t}
        onRetry={onRetry}
        onBack={onBack}
      />,
    );
    fireEvent.press(getByText('common.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewPlanState
        isLoading={false}
        hasError={false}
        hasFetched
        hasSessions={false}
        errorMessage="failure"
        t={t}
        onRetry={onRetry}
        onBack={onBack}
      />,
    );
    expect(getByText('appointments.noSessionsReturned')).toBeTruthy();
  });

  it('preserves global and per-session alternative intent callbacks without owning the resolution state', () => {
    const onApply = jest.fn();
    const onSelectAlternative = jest.fn();
    const onCustomTime = jest.fn();
    const alternative = {
      start: '2026-10-17T10:00:00',
      end: '2026-10-17T11:00:00',
      available_staff: [{ staff_id: 'staff-1', full_name: 'Ada Therapist', staff_type: 'therapist' }],
      available_rooms: [{ room_id: 'room-1', name: 'Therapy Room', room_type: 'therapy' }],
      score: 0.9,
    };

    const { getAllByRole, getByText } = render(
      <>
        <PreviewGlobalAlternatives
          alternatives={[{
            time_pattern: '10:00',
            start_hour: 10,
            start_minute: 0,
            coverage_count: 2,
            total_sessions: 3,
            covered_sessions: [1, 2],
          }]}
          selectedPattern={null}
          onApply={onApply}
          t={t}
        />
        <PreviewSessionCard
          session={{
            session_number: 1,
            appointment_start: '2026-10-17T09:00:00',
            appointment_end: '2026-10-17T10:00:00',
            staff_name: null,
            room_id: null,
            room_name: null,
            is_conflicted: true,
            conflict: {
              day_index: 0,
              requested_time: '09:00',
              conflict_type: 'staff',
              message: 'Conflict',
              alternative_slots: [alternative],
            },
          }}
          effectiveTime={{
            start: '2026-10-17T09:00:00',
            end: '2026-10-17T10:00:00',
            staff_id: null,
            staff_ids: [],
            staff_name: null,
            room_id: null,
            room_name: null,
            is_resolved: false,
          }}
          isExpanded
          onToggle={jest.fn()}
          onSelectAlternative={onSelectAlternative}
          onOpenCustomTimePicker={onCustomTime}
          t={t}
        />
      </>,
    );

    fireEvent.press(getAllByRole('radio')[0]);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ time_pattern: '10:00' }));
    fireEvent.press(getAllByRole('radio')[1]);
    expect(onSelectAlternative).toHaveBeenCalledWith(alternative);
    fireEvent.press(getByText('appointments.chooseDifferentTime'));
    expect(onCustomTime).toHaveBeenCalledWith(1);
    expect(getByText('Conflict')).toBeTruthy();
  });

  it('preserves the disabled confirmation affordance and emits route-owned actions', () => {
    const onBack = jest.fn();
    const onConfirm = jest.fn();
    const { getByText, rerender } = render(
      <PreviewActionBar
        canProceed={false}
        isCreating={false}
        sessionCount={3}
        t={t}
        onBack={onBack}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(getByText('appointments.confirmSessions'));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.press(getByText('common.back'));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(
      <PreviewActionBar
        canProceed
        isCreating={false}
        sessionCount={3}
        t={t}
        onBack={onBack}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.press(getByText('appointments.confirmSessions'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
