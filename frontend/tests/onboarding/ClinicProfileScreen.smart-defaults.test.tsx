import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ClinicProfileScreen } from '../../features/clinicProfile/presentation/pages/ClinicProfileScreen';

const mockProfileQuery = jest.fn();
const mockUpdate = jest.fn();
const mockUpload = jest.fn();
let mockCurrentUser: { tenantId: string } | null = { tenantId: 'tenant-a' };

const profile = (overrides: Record<string, unknown> = {}) => ({
  id: 'tenant-a',
  name: 'Existing Clinic',
  clinic_type: 'ayurveda',
  email: 'clinic@example.com',
  phones: ['1111111111'],
  address: { street: 'Existing Street', city: 'Kochi', state: 'Kerala', pincode: '682001', country: 'India' },
  website_address: 'https://existing.example.com',
  clinic_registration: 'REG-1',
  clinic_pan: 'ABCDE1234F',
  clinic_gst: 'GST-1',
  clinic_logo: null,
  ...overrides,
});

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../core/localization/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E', light: '#E7F2EC' }, surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      background: { default: '#F8F4EC' }, border: { default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF', onPrimary: '#FFFFFF' },
      feedback: { error: '#EF4444' },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 },
    typography: { h5: {}, body1: {}, body2: {}, caption: {}, button: {} },
  }),
}));
jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: (selector: (state: { currentUser: typeof mockCurrentUser }) => unknown) => selector({ currentUser: mockCurrentUser }),
}));
jest.mock('../../features/tenants/data/repositories/tenants.repository.impl', () => ({
  useCurrentTenantClinicProfileQuery: (...args: unknown[]) => mockProfileQuery(...args),
  useUpdateCurrentTenantClinicProfileMutation: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useUploadCurrentTenantClinicLogoMutation: () => ({ mutateAsync: mockUpload, isPending: false }),
}));

describe('ClinicProfileScreen smart-default hydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { tenantId: 'tenant-a' };
    mockProfileQuery.mockReturnValue({ data: profile(), isLoading: false, isError: false, refetch: jest.fn() });
  });

  it('hydrates persisted tenant profile values and keeps missing optional values empty', async () => {
    mockProfileQuery.mockReturnValue({
      data: profile({ email: null, phones: null, website_address: null, address: null, clinic_registration: null, clinic_pan: null, clinic_gst: null }),
      isLoading: false, isError: false, refetch: jest.fn(),
    });

    const screen = render(<ClinicProfileScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('Existing Clinic')).toBeTruthy());
    expect(screen.getByText('ayurveda')).toBeTruthy();
    fireEvent.press(screen.getByText('clinicProfile.sections.contact'));
    expect(screen.getAllByDisplayValue('')).not.toHaveLength(0);
  });

  it('does not overwrite an unsaved user edit when the profile query refreshes', async () => {
    const screen = render(<ClinicProfileScreen />);

    await waitFor(() => expect(screen.getByDisplayValue('Existing Clinic')).toBeTruthy());
    fireEvent.changeText(screen.getByDisplayValue('Existing Clinic'), 'Unsaved Clinic Name');

    mockProfileQuery.mockReturnValue({
      data: profile({ name: 'Server Refresh Name' }), isLoading: false, isError: false, refetch: jest.fn(),
    });
    screen.rerender(<ClinicProfileScreen />);

    expect(screen.getByDisplayValue('Unsaved Clinic Name')).toBeTruthy();
    expect(screen.queryByDisplayValue('Server Refresh Name')).toBeNull();
  });

  it('does not hydrate a profile that belongs to a different tenant', async () => {
    mockCurrentUser = { tenantId: 'tenant-b' };
    mockProfileQuery.mockReturnValue({
      data: profile({ id: 'tenant-a', name: 'Tenant A Clinic' }), isLoading: false, isError: false, refetch: jest.fn(),
    });

    const screen = render(<ClinicProfileScreen />);

    await waitFor(() => expect(mockProfileQuery).toHaveBeenCalledWith('tenant-b'));
    expect(screen.getByDisplayValue('')).toBeTruthy();
    expect(screen.queryByDisplayValue('Tenant A Clinic')).toBeNull();
  });
});
