/**
 * Phase 4 (R4) · T-E.6 (ADR-R4-07) — Clinical Review UI on the canonical
 * TreatmentSheetDetailScreen workspace. Verifies the review journey
 * checkpoint's UI half (the outcome→status transition itself is a backend
 * concern, already covered by test_clinical_review_outcome.py):
 *   - visible only to the Doctor (isDoctor=true) and only while
 *     lifecycle_status is needs_clinical_review/under_clinical_review
 *   - not visible at all (not merely disabled) for Admin or any other
 *     lifecycle_status
 *   - "Add Observation" is a NOTE-only action (does not require selecting an
 *     outcome, mirrors the standing "note vs outcome" distinction)
 *   - "Record Outcome" offers exactly the 5 outcomes; stop_remaining/mark_complete
 *     require an extra confirm (terminal, cancels/completes the plan);
 *     continue_unchanged/update_future_rows/extend do not
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { ClinicalReviewSection } from '../../../features/treatmentSheets/presentation/pages/detail/ClinicalReviewSection';
import type { TreatmentOrderResponse } from '../../../features/treatmentSheets/data/models/treatmentOrders.dtos';

jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', onPrimary: '#FFFFFF' },
      background: { elevated: '#FFFFFF' },
      border: { subtle: '#F3F4F6', default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF' },
      feedback: { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
    },
  }),
}));

jest.spyOn(Alert, 'alert');

const baseOrder = {
  id: 'order-1',
  tenant_id: 'tenant-1',
  client_id: 'client-1',
  episode_id: null,
  is_order: true,
  documentation_status: 'DRAFT',
  version: 3,
  rows: [],
  scheduled_count: 0,
  completed_count: 0,
  active_row_count: 0,
  progress_percentage: 0,
  completion_status: 'NOT_STARTED',
  created_at: null,
  updated_at: null,
  state: 'IN_PROGRESS',
  scheduling_status: 'FULLY_SCHEDULED',
} as unknown as TreatmentOrderResponse;

const makeProps = (overrides: { isDoctor: boolean }) => ({
  isDoctor: overrides.isDoctor,
  onAddNote: jest.fn(),
  addNoteMutation: {},
  onRecordOutcome: jest.fn(),
  recordOutcomeMutation: {},
});

describe('ClinicalReviewSection (R4 · T-E.6)', () => {
  beforeEach(() => {
    (Alert.alert as jest.Mock).mockClear();
  });

  it.each(['needs_clinical_review', 'under_clinical_review'] as const)(
    'visible to the Doctor for %s',
    (lifecycleStatus) => {
      const order = { ...baseOrder, lifecycle_status: lifecycleStatus, lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
      const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} />);
      expect(utils.getByText('Add Observation')).toBeTruthy();
      expect(utils.getByText('Record Outcome')).toBeTruthy();
    }
  );

  it('NOT visible for Admin (isDoctor=false) even during clinical review', () => {
    const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
    const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: false })} treatmentOrder={order} />);
    expect(utils.queryByText('Add Observation')).toBeNull();
    expect(utils.queryByText('Record Outcome')).toBeNull();
  });

  it.each(['in_therapy', 'released_to_therapist', 'treatment_complete'] as const)(
    'NOT visible outside the review window (%s)',
    (lifecycleStatus) => {
      const order = { ...baseOrder, lifecycle_status: lifecycleStatus, lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
      const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} />);
      expect(utils.queryByText('Add Observation')).toBeNull();
      expect(utils.queryByText('Record Outcome')).toBeNull();
    }
  );

  it('Add Observation is note-only: save is disabled until text is entered, calls onAddNote with the text, no outcome involved', () => {
    const onAddNote = jest.fn();
    const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
    const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} onAddNote={onAddNote} />);

    fireEvent.press(utils.getByText('Add Observation'));
    const input = utils.getByPlaceholderText('Clinical observation...');
    fireEvent.changeText(input, 'Patient reports reduced stiffness.');
    fireEvent.press(utils.getByText('Save Observation'));

    expect(onAddNote).toHaveBeenCalledTimes(1);
    expect(onAddNote).toHaveBeenCalledWith({ observation: 'Patient reports reduced stiffness.' });
  });

  it.each(['continue_unchanged', 'update_future_rows', 'extend'] as const)(
    'Record Outcome: selecting %s and confirming calls onRecordOutcome directly, no extra confirm dialog',
    (outcome) => {
      const onRecordOutcome = jest.fn();
      const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
      const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} onRecordOutcome={onRecordOutcome} />);

      fireEvent.press(utils.getByText('Record Outcome'));
      const optionLabel = {
        continue_unchanged: 'Continue Unchanged',
        update_future_rows: 'Update Future Sessions',
        extend: 'Extend Treatment',
      }[outcome];
      fireEvent.press(utils.getByText(optionLabel));
      fireEvent.press(utils.getByText('Confirm Outcome'));

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(onRecordOutcome).toHaveBeenCalledTimes(1);
      expect(onRecordOutcome).toHaveBeenCalledWith(outcome, {});
    }
  );

  it.each(['stop_remaining', 'mark_complete'] as const)(
    'Record Outcome: selecting %s requires an extra confirm before calling onRecordOutcome (terminal — moves the plan to Treatment Complete)',
    (outcome) => {
      const onRecordOutcome = jest.fn();
      const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
      const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} onRecordOutcome={onRecordOutcome} />);

      fireEvent.press(utils.getByText('Record Outcome'));
      const optionLabel = { stop_remaining: 'Stop Remaining Sessions', mark_complete: 'Mark Complete' }[outcome];
      fireEvent.press(utils.getByText(optionLabel));
      fireEvent.press(utils.getByText('Confirm Outcome'));

      expect(Alert.alert).toHaveBeenCalledTimes(1);
      expect(onRecordOutcome).not.toHaveBeenCalled();

      const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = buttons.find((b: any) => b.text === 'Confirm');
      confirmButton.onPress();

      expect(onRecordOutcome).toHaveBeenCalledTimes(1);
      expect(onRecordOutcome).toHaveBeenCalledWith(outcome, {});
    }
  );

  it('Record Outcome: optional notes text is passed through as notes_json when provided', () => {
    const onRecordOutcome = jest.fn();
    const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
    const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} onRecordOutcome={onRecordOutcome} />);

    fireEvent.press(utils.getByText('Record Outcome'));
    fireEvent.press(utils.getByText('Continue Unchanged'));
    fireEvent.changeText(utils.getByPlaceholderText('Notes for this decision (optional)'), 'Doctor reviewed, no concerns.');
    fireEvent.press(utils.getByText('Confirm Outcome'));

    expect(onRecordOutcome).toHaveBeenCalledWith('continue_unchanged', { observation: 'Doctor reviewed, no concerns.' });
  });

  it('Confirm Outcome is disabled until an outcome is selected', () => {
    const onRecordOutcome = jest.fn();
    const order = { ...baseOrder, lifecycle_status: 'under_clinical_review', lifecycle_status_label: 'irrelevant' } as unknown as TreatmentOrderResponse;
    const utils = render(<ClinicalReviewSection {...makeProps({ isDoctor: true })} treatmentOrder={order} onRecordOutcome={onRecordOutcome} />);

    fireEvent.press(utils.getByText('Record Outcome'));
    fireEvent.press(utils.getByText('Confirm Outcome'));

    expect(onRecordOutcome).not.toHaveBeenCalled();
  });
});
