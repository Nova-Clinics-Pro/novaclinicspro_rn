import React from 'react';
import { render } from '@testing-library/react-native';

import TreatmentsRoute from '../../app/clinic-admin/settings/treatments';

const mockSettingQuery = jest.fn();
const mockListQuery = { data: { items: [], total: 0 }, isLoading: false, isRefetching: false, refetch: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../core/components/DashboardHeader', () => ({ DashboardHeader: () => null }));
jest.mock('../../core/hooks/useDebounce', () => ({ useDebounce: (value: string) => value }));
jest.mock('../../core/hooks/useFeatures', () => ({ useFeatures: () => ({}), isAyurvedaClinic: () => true }));
jest.mock('../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({ currentUser: { tenantId: 'tenant-active' } }),
}));
jest.mock('../../features/tenants/data/repositories/tenants.repository.impl', () => ({
  useCurrentTenantQuery: () => ({ data: undefined }),
}));
jest.mock('../../features/treatments/data/repositories/treatments.repository.impl', () => ({
  useTreatmentsListQuery: () => mockListQuery,
  useSearchTreatmentsQuery: () => mockListQuery,
  useDeleteTreatmentMutation: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('../../features/capabilities/data/repositories/clinicAppointmentSettings.repository.impl', () => ({
  useMultiDayAppointmentSettingQuery: (tenantId: string) => mockSettingQuery(tenantId),
  useUpdateMultiDayAppointmentSettingMutation: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));
jest.mock('../../core/localization/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { primary: { default: '#060' }, surface: { elevated: '#fff' }, border: { default: '#ddd' }, text: { primary: '#000', secondary: '#666' }, feedback: { error: '#f00' } },
    spacing: { xs: 4, sm: 8, md: 16 }, typography: { body1: {}, caption: {} },
  }),
}));

describe('TreatmentsScreen multi-day appointment setting', () => {
  beforeEach(() => {
    mockSettingQuery.mockReset();
  });

  it.each([
    [{ available: true, enabled: false, version: 0 }, true, false],
    [{ available: true, enabled: true, version: 1 }, true, true],
    [{ available: false, enabled: false, version: 0 }, false, undefined],
  ] as const)('renders the backend setting %o as expected', (setting, visible, enabled) => {
    mockSettingQuery.mockReturnValue({ data: setting, isLoading: false });
    const screen = render(<TreatmentsRoute />);

    expect(mockSettingQuery).toHaveBeenCalledWith('tenant-active');
    if (!visible) {
      expect(screen.queryByTestId('multiday-appointments-setting')).toBeNull();
      return;
    }
    expect(screen.getByTestId('multiday-appointments-setting')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'clinicConfiguration.multiday.title' }).props.value).toBe(enabled);
  });
});
