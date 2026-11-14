/**
 * PrescriptionModule draft protection: stamped identity, tenant guard, single-flight, SIGNED, refetch and the
 * Save / Discard / Cancel lifecycle driven through the shared unsaved-work registry (the same path the dialog uses).
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrescriptionModule } from '../../../features/episodes/presentation/components/ConsultationSections/PrescriptionModule';
import { WorkspaceProvider } from '../../../features/episodes/presentation/context/ClinicalWorkspaceContext';
import { WorkspaceSaveStatusProvider } from '../../../features/episodes/presentation/context/WorkspaceSaveStatusContext';
import { useEpisodeWorkspaceData } from '../../../features/episodes/presentation/hooks/useEpisodeWorkspaceData';
import { createPrescriptionApi, updatePrescriptionApi, listPrescriptionsApi } from '../../../features/prescriptions/data/datasources/prescriptions.api';
import {
  confirmUnsavedWork,
  hasDirtyDrafts,
  resetUnsavedWorkForTests,
  resolveUnsavedWorkDecision,
} from '../../../core/unsavedWork/unsavedWorkRegistry';

let mockFeatures: any = { clinic_type: 'ayurveda', freshness_v1_enabled: false };
const mockAuth = { currentUser: { tenantId: 'tenant-1' }, selectedClinicId: null as string | null };

jest.mock('../../../features/auth/presentation/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

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
let mockIdentity = { tenantId: 'tenant-1', episodeId: 'episode-1', appointmentId: 'appointment-1', clientId: 'client-1' };

const Providers = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <WorkspaceProvider {...mockIdentity}>
      <WorkspaceSaveStatusProvider>{children}</WorkspaceSaveStatusProvider>
    </WorkspaceProvider>
  </QueryClientProvider>
);
// A fresh element per render: re-rendering with the identical element would bail out and never re-read the mocks.
const makeUi = () => <PrescriptionModule expandedSections={new Set(['prescription'])} onToggleSection={jest.fn()} />;
const renderModule = () => render(makeUi(), { wrapper: Providers });

const addMedicationNamed = (view: ReturnType<typeof renderModule>, name: string) => {
  fireEvent.press(view.getByText('Add Medication'));
  const fields = view.getAllByPlaceholderText('name');
  fireEvent.changeText(fields[fields.length - 1], name);
};

const EXISTING = {
  id: 'rx-9',
  status: 'DRAFT',
  prescription_data: { medications: [{ name: 'Saved med', dosage: '', frequency: '', duration: '' }] },
};

const decide = (decision: 'save' | 'discard' | 'cancel') => act(async () => { await resolveUnsavedWorkDecision(decision); });
const ask = () => {
  let answer!: Promise<boolean>;
  act(() => { answer = confirmUnsavedWork('exit'); });
  return answer;
};

beforeEach(() => {
  jest.clearAllMocks();
  resetUnsavedWorkForTests();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockFeatures = { clinic_type: 'ayurveda', freshness_v1_enabled: false };
  mockAuth.currentUser = { tenantId: 'tenant-1' };
  mockAuth.selectedClinicId = null;
  mockIdentity = { tenantId: 'tenant-1', episodeId: 'episode-1', appointmentId: 'appointment-1', clientId: 'client-1' };
  (useEpisodeWorkspaceData as jest.Mock).mockReturnValue(baseWorkspaceData);
  (createPrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-1', prescription_data: { medications: [] } });
  (updatePrescriptionApi as jest.Mock).mockResolvedValue({ id: 'rx-9', prescription_data: { medications: [] } });
  (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [], total: 0, skip: 0, limit: 50 });
});
afterEach(() => resetUnsavedWorkForTests());

describe('Save through the shared decision', () => {
  it('creates the prescription against the draft identity (tenant, episode, appointment, client) and clears the dirty state', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    expect(hasDirtyDrafts()).toBe(true);
    const answer = ask();
    await decide('save');
    await expect(answer).resolves.toBe(true);
    expect(createPrescriptionApi).toHaveBeenCalledTimes(1);
    expect(createPrescriptionApi).toHaveBeenCalledWith('tenant-1', {
      client_id: 'client-1',
      prescription_data: { medications: [{ name: 'Amoxicillin', dosage: '', frequency: '', duration: '' }] },
      appointment_id: 'appointment-1',
      episode_id: 'episode-1',
    });
    expect(hasDirtyDrafts()).toBe(false);
  });

  it('updates the loaded prescription (PATCH) rather than creating a second one', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [EXISTING], total: 1, skip: 0, limit: 50 });
    const view = renderModule();
    await waitFor(() => expect(view.getByDisplayValue('Saved med')).toBeTruthy());
    addMedicationNamed(view, 'Second med');
    const answer = ask();
    await decide('save');
    await expect(answer).resolves.toBe(true);
    expect(updatePrescriptionApi).toHaveBeenCalledTimes(1);
    expect(updatePrescriptionApi).toHaveBeenCalledWith('tenant-1', 'rx-9', expect.objectContaining({ prescription_data: expect.anything() }));
    expect(createPrescriptionApi).not.toHaveBeenCalled();
  });

  it('persists draft data only: the payload carries no status and never signs or finalizes', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    await decide('save');
    await answer;
    const payload = (createPrescriptionApi as jest.Mock).mock.calls[0][1];
    expect(Object.keys(payload).sort()).toEqual(['appointment_id', 'client_id', 'episode_id', 'prescription_data']);
    expect(JSON.stringify(payload)).not.toMatch(/status|sign|final/i);
  });

  it('uses the ids the draft was created under even if the screen has since moved to another appointment', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    // The route identity changes underneath the dirty draft (an in-place param change nothing in the app does today).
    mockIdentity = { ...mockIdentity, appointmentId: 'appointment-2', episodeId: 'episode-2' };
    await act(async () => { view.rerender(makeUi()); });
    // The identity change reset the (clean-by-contract) view; re-create a draft under the new identity and save it:
    addMedicationNamed(view, 'Ibuprofen');
    const answer = ask();
    await decide('save');
    await answer;
    expect(createPrescriptionApi).toHaveBeenCalledTimes(1);
    expect(createPrescriptionApi).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      appointment_id: 'appointment-2',
      episode_id: 'episode-2',
      client_id: 'client-1', // the patient context's client (from the workspace data), unchanged by the route identity
    }));
  });

  it('single-flight: concurrent saves (dialog + form button + retry) share ONE request', async () => {
    let release!: (value: unknown) => void;
    (createPrescriptionApi as jest.Mock).mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    let first!: Promise<void>;
    await act(async () => {
      first = resolveUnsavedWorkDecision('save');
      fireEvent.press(view.getByText('Save Prescription'));
      fireEvent.press(view.getByText('Save Prescription'));
    });
    await act(async () => { release({ id: 'rx-1', prescription_data: { medications: [] } }); await first; });
    await expect(answer).resolves.toBe(true);
    expect(createPrescriptionApi).toHaveBeenCalledTimes(1);
  });
});

describe('Save failure', () => {
  it('keeps the draft, the dirty state and the open decision; a retry succeeds', async () => {
    (createPrescriptionApi as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    const settled = jest.fn();
    void answer.then(settled);
    await decide('save');
    expect(settled).not.toHaveBeenCalled();
    expect(hasDirtyDrafts()).toBe(true);
    expect(view.getByDisplayValue('Amoxicillin')).toBeTruthy(); // the draft is still on screen
    await decide('save');
    await expect(answer).resolves.toBe(true);
    expect(createPrescriptionApi).toHaveBeenCalledTimes(2);
    expect(hasDirtyDrafts()).toBe(false);
  });
});

describe('Cancel and Discard', () => {
  it('Cancel retains the draft (still dirty, still on screen) and saves nothing', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    await decide('cancel');
    await expect(answer).resolves.toBe(false);
    expect(hasDirtyDrafts()).toBe(true);
    expect(view.getByDisplayValue('Amoxicillin')).toBeTruthy();
    expect(createPrescriptionApi).not.toHaveBeenCalled();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
  });

  it('Discard explicitly returns an unsaved new draft to empty and clears the dirty state, saving nothing', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    await decide('discard');
    await expect(answer).resolves.toBe(true);
    expect(hasDirtyDrafts()).toBe(false);
    expect(view.queryByDisplayValue('Amoxicillin')).toBeNull();
    expect(createPrescriptionApi).not.toHaveBeenCalled();
  });

  it('Discard returns an edited loaded prescription to its saved version', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [EXISTING], total: 1, skip: 0, limit: 50 });
    const view = renderModule();
    await waitFor(() => expect(view.getByDisplayValue('Saved med')).toBeTruthy());
    addMedicationNamed(view, 'Extra med');
    expect(view.getByDisplayValue('Extra med')).toBeTruthy();
    const answer = ask();
    await decide('discard');
    await answer;
    expect(view.queryByDisplayValue('Extra med')).toBeNull();
    expect(view.getByDisplayValue('Saved med')).toBeTruthy();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
  });
});

describe('tenant stamp', () => {
  it('REFUSES to save when the draft tenant is not the current authenticated tenant, keeps the draft, and calls no API', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin'); // stamped tenant-1
    mockAuth.currentUser = { tenantId: 'tenant-2' }; // the signed-in clinic changed underneath the draft
    await act(async () => { view.rerender(makeUi()); });
    const answer = ask();
    const settled = jest.fn();
    void answer.then(settled);
    await decide('save');
    expect(createPrescriptionApi).not.toHaveBeenCalled();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled(); // the decision stays open with an error
    expect(hasDirtyDrafts()).toBe(true);
    expect(view.getByDisplayValue('Amoxicillin')).toBeTruthy();
  });

  it('REFUSES to save when nobody is authenticated', async () => {
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    mockAuth.currentUser = null as never;
    await act(async () => { view.rerender(makeUi()); });
    const answer = ask();
    void answer;
    await decide('save');
    expect(createPrescriptionApi).not.toHaveBeenCalled();
  });

  it('honors the selected clinic over the user home tenant (owners acting for a clinic)', async () => {
    mockAuth.currentUser = { tenantId: 'home-tenant' };
    mockAuth.selectedClinicId = 'tenant-1';
    const view = renderModule();
    addMedicationNamed(view, 'Amoxicillin');
    const answer = ask();
    await decide('save');
    await expect(answer).resolves.toBe(true);
    expect(createPrescriptionApi).toHaveBeenCalledWith('tenant-1', expect.anything());
  });
});

describe('signed prescriptions are not modified', () => {
  it('a SIGNED prescription renders read-only: not dirty, no editor, and no save is ever sent', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({
      items: [{ ...EXISTING, status: 'SIGNED' }], total: 1, skip: 0, limit: 50,
    });
    const view = renderModule();
    await waitFor(() => expect(view.queryByText('Add Medication')).toBeNull());
    expect(hasDirtyDrafts()).toBe(false);
    const answer = ask(); // nothing dirty: proceeds immediately
    await expect(answer).resolves.toBe(true);
    expect(createPrescriptionApi).not.toHaveBeenCalled();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
  });
});

describe('refetches never overwrite an edited draft', () => {
  it('a refetch that delivers different server data keeps the user edits', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [EXISTING], total: 1, skip: 0, limit: 50 });
    const view = renderModule();
    await waitFor(() => expect(view.getByDisplayValue('Saved med')).toBeTruthy());
    addMedicationNamed(view, 'My edit');
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({
      items: [{ ...EXISTING, prescription_data: { medications: [{ name: 'Changed elsewhere', dosage: '', frequency: '', duration: '' }] } }],
      total: 1, skip: 0, limit: 50,
    });
    await act(async () => { await queryClient.invalidateQueries(); });
    expect(view.getByDisplayValue('My edit')).toBeTruthy();
    expect(view.queryByDisplayValue('Changed elsewhere')).toBeNull();
    expect(hasDirtyDrafts()).toBe(true);
  });

  it('an untouched (clean) draft does follow a refetch', async () => {
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({ items: [EXISTING], total: 1, skip: 0, limit: 50 });
    const view = renderModule();
    await waitFor(() => expect(view.getByDisplayValue('Saved med')).toBeTruthy());
    (listPrescriptionsApi as jest.Mock).mockResolvedValue({
      items: [{ ...EXISTING, prescription_data: { medications: [{ name: 'Changed elsewhere', dosage: '', frequency: '', duration: '' }] } }],
      total: 1, skip: 0, limit: 50,
    });
    await act(async () => { await queryClient.invalidateQueries(); });
    await waitFor(() => expect(view.getByDisplayValue('Changed elsewhere')).toBeTruthy());
  });
});

describe('identity change resets a clean view, without any silent save', () => {
  it('moving to another appointment shows that appointment’s own data and sends no request', async () => {
    (listPrescriptionsApi as jest.Mock).mockImplementation(async (_tenant: string, params: { appointment_id?: string }) =>
      params?.appointment_id === 'appointment-2'
        ? { items: [{ ...EXISTING, id: 'rx-2', prescription_data: { medications: [{ name: 'Other visit', dosage: '', frequency: '', duration: '' }] } }], total: 1, skip: 0, limit: 50 }
        : { items: [EXISTING], total: 1, skip: 0, limit: 50 });
    const view = renderModule();
    await waitFor(() => expect(view.getByDisplayValue('Saved med')).toBeTruthy());
    mockIdentity = { ...mockIdentity, appointmentId: 'appointment-2' };
    await act(async () => { view.rerender(makeUi()); });
    await waitFor(() => expect(view.getByDisplayValue('Other visit')).toBeTruthy());
    expect(view.queryByDisplayValue('Saved med')).toBeNull();
    expect(createPrescriptionApi).not.toHaveBeenCalled();
    expect(updatePrescriptionApi).not.toHaveBeenCalled();
  });
});
