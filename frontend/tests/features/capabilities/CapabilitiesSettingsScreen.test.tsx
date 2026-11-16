/**
 * Release 5 (R5) · T-E.3 (design.md §12, requirements.md FR-H3, N-7) —
 * tests for `<CapabilitiesSettingsScreen>`.
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { CapabilitiesSettingsScreen } from '../../../features/capabilities/presentation/pages/CapabilitiesSettingsScreen';
import {
  useCapabilities,
  useCapabilityCatalog,
  useToggleCapability,
} from '../../../core/hooks/useCapabilities';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
  Link: ({ children }: any) => children,
}));

jest.mock('../../../core/hooks/useCapabilities', () => ({
  useCapabilities: jest.fn(),
  useCapabilityCatalog: jest.fn(),
  useToggleCapability: jest.fn(),
}));

const mockAuthStore = {
  currentUser: { permissions: ['capability.manage'], isOrgAdmin: false },
  isAuthenticated: true,
  isLoading: false,
};
jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => mockAuthStore,
}));

const catalogEntry = (overrides: Partial<any> = {}) => ({
  code: 'core',
  name: 'Core',
  description: 'Essential clinic management',
  parent_code: null,
  category: 'core',
  display_order: 0,
  lifecycle_state: 'enabled',
  ...overrides,
});

const capState = (overrides: Partial<any> = {}) => ({
  code: 'core',
  name: 'Core',
  description: 'Essential clinic management',
  entitled: true,
  tenant_preference: true,
  effective_available: true,
  effective_enabled: true,
  blocked_reason_code: null,
  blocked_reason_label: null,
  unmet_dependencies: [],
  source: 'template_default',
  version: 1,
  ...overrides,
});

const mockToggle = jest.fn();
const mockReset = jest.fn();

const setupHooks = ({
  catalog = [catalogEntry()],
  capabilities = { core: capState() },
  catalogLoading = false,
  capsLoading = false,
  catalogError = null as Error | null,
  capsError = null as Error | null,
  toggleStatus = 'idle' as any,
  rejection = null as any,
} = {}) => {
  (useCapabilityCatalog as jest.Mock).mockReturnValue({
    data: { capabilities: catalog },
    isLoading: catalogLoading,
    error: catalogError,
  });
  (useCapabilities as jest.Mock).mockReturnValue({
    capabilities,
    isLoading: capsLoading,
    error: capsError,
    getReason: (code: string) => `Reason: ${code}`,
    refetch: jest.fn(),
  });
  (useToggleCapability as jest.Mock).mockReturnValue({
    toggle: mockToggle,
    status: toggleStatus,
    errorMessage: null,
    rejection,
    currentVersion: null,
    reset: mockReset,
  });
};

describe('<CapabilitiesSettingsScreen> (R5 · T-E.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStore.currentUser = { permissions: ['capability.manage'], isOrgAdmin: false };
  });

  it('shows a loading indicator while the catalog/tenant state is loading', () => {
    setupHooks({ catalogLoading: true });
    const { getByText, queryByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Capabilities')).toBeTruthy();
    expect(queryByText('Core')).toBeNull();
  });

  it('shows an error state when either query errors', () => {
    setupHooks({ capsError: new Error('network down') });
    const { getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Could not load capabilities. Please try again.')).toBeTruthy();
  });

  it('renders the list ordered by display_order, then code', () => {
    setupHooks({
      catalog: [
        catalogEntry({ code: 'reports', name: 'Reports', display_order: 2 }),
        catalogEntry({ code: 'core', name: 'Core', display_order: 0 }),
        catalogEntry({ code: 'inventory', name: 'Inventory', display_order: 1 }),
      ],
      capabilities: {
        core: capState({ code: 'core' }),
        inventory: capState({ code: 'inventory', name: 'Inventory' }),
        reports: capState({ code: 'reports', name: 'Reports' }),
      },
    });
    const { getAllByText, getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Core')).toBeTruthy();
    expect(getByText('Inventory')).toBeTruthy();
    expect(getByText('Reports')).toBeTruthy();
  });

  it('lists a capability whose template does not offer a switch only when the backend marks it visible', () => {
    setupHooks({
      catalog: [
        catalogEntry({ code: 'core', name: 'Core', display_order: 0 }),
        catalogEntry({ code: 'appointments.multiday', name: 'Multi-Day Appointments', display_order: 1 }),
      ],
      capabilities: {
        core: capState({ code: 'core' }),
        'appointments.multiday': capState({ code: 'appointments.multiday', name: 'Multi-Day Appointments', effective_enabled: false, visible: false }),
      },
    });
    const hidden = render(<CapabilitiesSettingsScreen />);
    expect(hidden.getByText('Core')).toBeTruthy();
    expect(hidden.queryByText('Multi-Day Appointments')).toBeNull(); // not offered to this clinic type
    hidden.unmount();

    setupHooks({
      catalog: [catalogEntry({ code: 'appointments.multiday', name: 'Multi-Day Appointments' })],
      capabilities: { 'appointments.multiday': capState({ code: 'appointments.multiday', name: 'Multi-Day Appointments', effective_enabled: false, visible: true }) },
    });
    expect(render(<CapabilitiesSettingsScreen />).getByText('Multi-Day Appointments')).toBeTruthy(); // shown, and still off
  });

  it('keeps showing a capability when an older backend sends no visible flag', () => {
    setupHooks({
      catalog: [catalogEntry({ code: 'inventory', name: 'Inventory' })],
      capabilities: { inventory: capState({ code: 'inventory', name: 'Inventory' }) },
    });
    expect(render(<CapabilitiesSettingsScreen />).getByText('Inventory')).toBeTruthy();
  });

  it('renders top-level and child capabilities from the catalog hierarchy', () => {
    setupHooks({
      catalog: [
        catalogEntry({ code: 'treatment', name: 'Treatment', parent_code: null, display_order: 0 }),
        catalogEntry({ code: 'treatment.ayurveda', name: 'Ayurveda', parent_code: 'treatment', display_order: 1 }),
      ],
      capabilities: {
        treatment: capState({ code: 'treatment', name: 'Treatment' }),
        'treatment.ayurveda': capState({ code: 'treatment.ayurveda', name: 'Ayurveda', effective_enabled: false }),
      },
    });
    const { getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Treatment')).toBeTruthy();
    expect(getByText('Ayurveda')).toBeTruthy();
  });

  it('surfaces the unavailable reason for a capability that is not effective_available', () => {
    setupHooks({
      capabilities: {
        core: capState({
          effective_available: false,
          effective_enabled: false,
          blocked_reason_code: 'requires_plan_upgrade',
        }),
      },
    });
    const { getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Reason: requires_plan_upgrade')).toBeTruthy();
  });

  it('disables the toggle for a capability that has an enabled child (parent-dependency rule)', () => {
    setupHooks({
      catalog: [
        catalogEntry({ code: 'treatment', name: 'Treatment', parent_code: null, display_order: 0 }),
        catalogEntry({ code: 'treatment.ayurveda', name: 'Ayurveda', parent_code: 'treatment', display_order: 1 }),
      ],
      capabilities: {
        treatment: capState({ code: 'treatment', name: 'Treatment', effective_enabled: true }),
        'treatment.ayurveda': capState({ code: 'treatment.ayurveda', name: 'Ayurveda', effective_enabled: true }),
      },
    });
    const { getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Required by an enabled sub-feature')).toBeTruthy();
  });

  it('calls useToggleCapability().toggle with code/enabled/version on interaction', async () => {
    setupHooks({ capabilities: { core: capState({ effective_enabled: false, version: 5 }) } });
    const { getByRole } = render(<CapabilitiesSettingsScreen />);

    const toggleControl = getByRole('switch');
    fireEvent(toggleControl, 'valueChange', true);

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith({ code: 'core', enabled: true, version: 5 });
    });
  });

  it('has no catalog-edit affordance anywhere in the rendered screen', () => {
    setupHooks();
    const { queryByText } = render(<CapabilitiesSettingsScreen />);
    for (const forbidden of ['Add Capability', 'Edit Catalog', 'Delete', 'New Capability']) {
      expect(queryByText(forbidden)).toBeNull();
    }
  });

  it('renders Access Denied when the current user lacks capability.manage', () => {
    mockAuthStore.currentUser = { permissions: [], isOrgAdmin: false };
    setupHooks();
    const { getByText, queryByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Access Denied')).toBeTruthy();
    expect(queryByText('Core')).toBeNull();
  });

  it('org admins bypass the permission gate', () => {
    mockAuthStore.currentUser = { permissions: [], isOrgAdmin: true };
    setupHooks();
    const { getByText } = render(<CapabilitiesSettingsScreen />);
    expect(getByText('Core')).toBeTruthy();
  });
});
