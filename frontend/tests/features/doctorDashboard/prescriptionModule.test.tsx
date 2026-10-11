import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrescriptionModule } from '../../../features/episodes/presentation/components/ConsultationSections/PrescriptionModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createPrescriptionApi, updatePrescriptionApi, listPrescriptionsApi } from '../../../features/prescriptions/data/datasources/prescriptions.api';
import { prescriptionsKeys } from '../../../features/prescriptions/data/repositories/prescriptions.repository.impl';

// R3A · T-B.2 — PrescriptionModule's own tests. Migrated from
// useConsultationWorkspace.test.tsx (load/save POST-then-PATCH),
// consultationSaveConfirmationAndTransition.test.tsx (FR-A3 save
// confirmation, FR-A4 unmount-flush), consultationSaveInvalidation.test.tsx
// (flag-ON invalidation), and freshnessFeatureFlag.test.tsx (flag-OFF) —
// that state now lives in PrescriptionModule, unchanged in substance, only
// exercised via the module's rendered UI instead of the hook.
//
// R7 · T-0.2 (ED-ARCH-001): the module no longer imports `axiosClient` or
// the datasource module directly — it now goes through
// `usePrescriptionByAppointmentQuery`/`useCreatePrescriptionMutation`/
// `useUpdatePrescriptionMutation` (`prescriptions.repository.impl.ts`).
// These tests mock at the true datasource boundary those hooks call
// internally (`listPrescriptionsApi`/`createPrescriptionApi`/
// `updatePrescriptionApi`) rather than the hooks themselves, so the real
// repository/query-key/invalidation layer — including this task's own
// `onSuccess` override — is genuinely exercised, not bypassed. Mocking the
// forbidden `axiosClient` import (removed by this task) would no longer be
// meaningful; every remaining assertion here is unchanged in substance.
//
// Deliberately does NOT import tests/features/doctorDashboard/setup, for the
// same reason caseSheetModule.test.tsx doesn't — its mocked useQueryClient()
// defeats jest.spyOn(realQueryClient, ...) needed by the invalidation tests.

let mockFeatures: any = { clinic_type: 'ayurveda', freshness_v1_enabled: false };

jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: () => mockFeatures,
  isAyurvedaClinic: (value: any) => value.clinic_type === 'ayurveda',
  isFreshnessV1Enabled: (value: any) => !!value.freshness_v1_enabled,
}));
jest.mock('../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData', () => ({
  useEpisodeWorkspaceData: jest.fn(),
}));
jest.mock('../../../features/prescriptions/data/datasources/prescriptions.api', () => ({
  createPrescriptionApi: jest.fn(),
  updatePrescriptionApi: jest.fn(),
  listPrescriptionsApi: jest.fn(),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB', main: '#2563EB', onPrimary: '#FFFFFF', soft: '#EFF6FF' },
      secondary: { default: '#7C3AED', onSecondary: '#FFFFFF' },
      background: { default: '#F9FAFB', elevated: '#FFFFFF', muted: '#F3F4F6' },
      surface: { default: '#FFFFFF', elevated: '#FFFFFF', muted: '#F9FAFB' },
      border: { default: '#E5E7EB', subtle: '#F3F4F6', focus: '#2563EB' },
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF', link: '#2563EB', onPrimary: '#FFFFFF' },
      feedback: {
        success: '#10B981', successLight: '#ECFDF5', warning: '#F59E0B', warningLight: '#FFFBEB',
        error: '#EF4444', errorLight: '#FEF2F2', info: '#3B82F6', infoLight: '#EFF6FF',
      },
      common: { white: '#FFFFFF' },
      grey: { 50: '#F9FAFB', 400: '#9CA3AF' },
      success: { main: '#10B981' },
      info: { main: '#3B82F6' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    typography: {
      h5: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
      h6: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
      subtitle1: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
      subtitle2: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
      body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
      body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
      caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
      button: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    },
  }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const baseWorkspaceData = {
  episodeDetails: {
    episode: {
      id: 'episode-1',
      title: 'Chronic Knee Pain',
      status: 'ACTIVE',
      start_date: '2026-06-01',
      end_date: null,
      description: null,
      client_id: 'client-1',
      client_name: 'Maya Rao',
      visits_count: 1,
      last_visit_date: null,
    },
    documents: {
      casesheet: { exists: false, id: null, status: null, created_at: null },
      treatment_sheet: { exists: false, id: null, status: null, created_at: null },
    },
    visits: [],
  },
  isEpisodeLoading: false,
  isEpisodeError: false,
  refetchEpisode: jest.fn(),
  casesheet: undefined,
  casesheetId: null,
  hasCasesheet: false,
  treatmentSheet: undefined,
  treatmentSheets: [],
  treatmentSheetId: null,
  hasTreatmentSheet: false,
  isTreatmentSheetLoading: false,
  isTreatmentSheetError: false,
  refetchTreatmentSheet: jest.fn(),
  visits: [],
  clientId: 'client-1',
  clientName: 'Maya Rao',
};

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <WorkspaceProvider tenantId="tenant-1" episodeId="episode-1" appointmentId="appointment-1" clientId="client-1">
      <WorkspaceSaveStatusProvider>{children}</WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  </QueryClientProvider>
);

const renderModule = () =>
  render(
    <PrescriptionModule expandedSections={new Set(['prescription'])} onToggleSection={jest.fn()} />,
    { wrapper },
  );

// Adds one medication with the given name via the actual rendered UI
// (Add Medication button + name field) — mirrors what the doctor does,
// rather than calling onChange directly (no longer exposed outside the module).
const addMedicationNamed = (utils: ReturnType<typeof renderModule>, name: string) => {
  fireEvent.press(utils.getByText('Add Medication'));
  // getAllByPlaceholderText + last (not getByPlaceholderText): a fixture
  // with a pre-existing medication row also has a "name" placeholder, so
  // more than one can match — the newly-added row is always the last one.
  const nameFields = utils.getAllByPlaceholderText('name');
  fireEvent.changeText(nameFields[nameFields.length - 1], name);
};

describe('PrescriptionModule (R3A · T-B.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: false };
    (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
    (createPrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1', prescription_data: { medications: [] } });
    (updatePrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1', prescription_data: { medications: [] } });
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 50 });
  });

  it('loads an existing prescription on mount, then PATCHes it on save', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({
      items: [{ id: 'rx-existing', prescription_data: { medications: [{ name: 'A', dosage: '1', frequency: 'daily', duration: '7d' }] } }],
      total: 1, skip: 0, limit: 50,
    });
    const utils = renderModule();
    await waitFor(() => expect(utils.getByDisplayValue('A')).toBeTruthy());

    fireEvent.changeText(utils.getByDisplayValue('A'), 'B');
    fireEvent.press(utils.getByText('Save Prescription'));
    await waitFor(() => expect(updatePrescriptionApi).toHaveBeenCalledWith('tenant-1', 'rx-existing', expect.any(Object)));
  });

  it('creates a prescription and preserves the draft after a save failure', async () => {
    (createPrescriptionApi as jest.Mock).mockRejectedValue(new Error('rx failed'));
    const utils = renderModule();
    addMedicationNamed(utils, 'Amoxicillin');

    // savePrescription() re-throws after setting error state (unchanged from
    // pre-T-B.2 behavior) — PrescriptionSection wires it as onPress={onSave}
    // with no .catch() (same as production). fireEvent.press() returns the
    // handler's own return value (RTL's fire-event.js), so awaiting/catching
    // it here avoids an unhandled rejection without changing any production code.
    await act(async () => {
      await (fireEvent.press(utils.getByText('Save Prescription')) as unknown as Promise<void>)?.catch(() => {});
    });

    expect(utils.getByText('Save failed')).toBeTruthy();
    // Draft is preserved, not cleared, after the failed save.
    expect(utils.getByDisplayValue('Amoxicillin')).toBeTruthy();
  });

  describe('FR-A3: save confirmation', () => {
    it('exposes saveStatus "saved" (not hardcoded "idle") after a successful save', async () => {
      const utils = renderModule();
      addMedicationNamed(utils, 'Paracetamol');
      fireEvent.press(utils.getByText('Save Prescription'));
      await waitFor(() => expect(utils.getByText('✓ Saved')).toBeTruthy());
    });

    it('fades back to idle 2s after a successful save (same pattern as CaseSheetModule)', async () => {
      jest.useFakeTimers();
      const utils = renderModule();
      addMedicationNamed(utils, 'Paracetamol');
      fireEvent.press(utils.getByText('Save Prescription'));
      await waitFor(() => expect(utils.getByText('✓ Saved')).toBeTruthy());

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(utils.queryByText('✓ Saved')).toBeNull();
      jest.useRealTimers();
    });

    it('exposes an error message when the save fails', async () => {
      (updatePrescriptionApi as jest.Mock).mockRejectedValue(new Error('network down'));
      (listPrescriptionsApi as jest.Mock).mockResolvedValue({
        items: [{ id: 'rx-1', prescription_data: { medications: [{ name: 'Existing', dosage: '', frequency: '', duration: '' }] } }],
        total: 1, skip: 0, limit: 50,
      });
      const utils = renderModule();
      // Wait for the async query load (T-0.2: was a synchronous-scheduled
      // axios call; now a real React Query fetch) to resolve into state
      // BEFORE interacting — otherwise Save fires CREATE, not UPDATE.
      await waitFor(() => expect(utils.getByDisplayValue('Existing')).toBeTruthy());

      addMedicationNamed(utils, 'Ibuprofen');
      // See the "preserves the draft after a save failure" test above for
      // why the returned promise is awaited/caught directly.
      await act(async () => {
        await (fireEvent.press(utils.getByText('Save Prescription')) as unknown as Promise<void>)?.catch(() => {});
      });

      expect(utils.getByText('Save failed')).toBeTruthy();
    });
  });

  describe('FR-A4: save-before-transition (unmount-flush, own effect per design §6.4)', () => {
    it('auto-saves an unsaved, non-empty prescription draft on unmount', async () => {
      const utils = renderModule();
      addMedicationNamed(utils, 'Amoxicillin');
      expect(createPrescriptionApi).not.toHaveBeenCalled();

      utils.unmount();
      await waitFor(() =>
        expect(createPrescriptionApi).toHaveBeenCalledWith(
          'tenant-1',
          expect.objectContaining({ prescription_data: { medications: [{ name: 'Amoxicillin', dosage: '', frequency: '', duration: '' }] } }),
        ),
      );
    });

    it('does NOT auto-save on unmount if the medication list has no real name (empty draft)', async () => {
      const utils = renderModule();
      fireEvent.press(utils.getByText('Add Medication'));
      // Leave the name field empty.
      utils.unmount();
      await act(async () => {
        await Promise.resolve();
      });
      expect(createPrescriptionApi).not.toHaveBeenCalled();
    });

    it('does NOT auto-save on unmount if nothing was edited (not dirty)', async () => {
      const utils = renderModule();
      utils.unmount();
      await act(async () => {
        await Promise.resolve();
      });
      expect(createPrescriptionApi).not.toHaveBeenCalled();
    });

    it('does NOT auto-save on unmount after "Mark as Not Required" (intentional resolution)', async () => {
      const utils = renderModule();
      addMedicationNamed(utils, 'Aspirin');
      fireEvent.press(utils.getByText('Mark as Not Required'));
      utils.unmount();
      await act(async () => {
        await Promise.resolve();
      });
      expect(createPrescriptionApi).not.toHaveBeenCalled();
    });
  });

  describe('save invalidation (flag ON) — moved from consultationSaveInvalidation.test.tsx (T-A.2)', () => {
    beforeEach(() => {
      mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: true };
    });

    it('prescription CREATE primes the detail cache and invalidates lists + the episode/appointment key', async () => {
      const utils = renderModule();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

      (createPrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1', prescription_data: { medications: [] } });
      addMedicationNamed(utils, 'Paracetamol');
      fireEvent.press(utils.getByText('Save Prescription'));

      await waitFor(() =>
        expect(setDataSpy).toHaveBeenCalledWith(
          prescriptionsKeys.detail('tenant-1', 'rx-1'),
          expect.objectContaining({ id: 'rx-1' }),
        ),
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: prescriptionsKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prescriptionsKeys.byAppointment('tenant-1', 'episode-1', 'appointment-1'),
      });
    });

    it('prescription UPDATE primes the detail cache and invalidates lists + the episode/appointment key', async () => {
      (listPrescriptionsApi as jest.Mock).mockResolvedValue({
        items: [{ id: 'rx-1', prescription_data: { medications: [{ name: 'Existing', dosage: '', frequency: '', duration: '' }] } }],
        total: 1, skip: 0, limit: 50,
      });
      const utils = renderModule();
      // See "exposes an error message when the save fails" above — must wait
      // for the real query load before interacting, or Save fires CREATE.
      await waitFor(() => expect(utils.getByDisplayValue('Existing')).toBeTruthy());

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

      addMedicationNamed(utils, 'Ibuprofen');
      fireEvent.press(utils.getByText('Save Prescription'));

      await waitFor(() =>
        expect(setDataSpy).toHaveBeenCalledWith(
          prescriptionsKeys.detail('tenant-1', 'rx-1'),
          expect.objectContaining({ id: 'rx-1' }),
        ),
      );
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: prescriptionsKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: prescriptionsKeys.byAppointment('tenant-1', 'episode-1', 'appointment-1'),
      });
    });
  });

  it('flag OFF: prescription save still calls the API, but does NOT invalidate the query cache (moved from freshnessFeatureFlag.test.tsx)', async () => {
    const utils = renderModule();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const setDataSpy = jest.spyOn(queryClient, 'setQueryData');

    addMedicationNamed(utils, 'Paracetamol');
    fireEvent.press(utils.getByText('Save Prescription'));

    await waitFor(() => expect(createPrescriptionApi).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(setDataSpy).not.toHaveBeenCalled();
  });
});
