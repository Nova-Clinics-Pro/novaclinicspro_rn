import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MultiDayAppointmentsSetting } from '../../../features/capabilities/presentation/components/MultiDayAppointmentsSetting';

const mockMutate = jest.fn();
const mockSettingQuery = jest.fn();
let mockSetting: { enabled: boolean; available: boolean; version: number } | undefined;

jest.mock('../../../features/auth/presentation/providers/auth.store', () => ({
  useAuthStore: () => ({ currentUser: { tenantId: 'tenant-1' } }),
}));
jest.mock('../../../features/capabilities/data/repositories/clinicAppointmentSettings.repository.impl', () => ({
  useMultiDayAppointmentSettingQuery: (tenantId: string) => mockSettingQuery(tenantId),
  useUpdateMultiDayAppointmentSettingMutation: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));
jest.mock('../../../core/localization/useTranslation', () => ({
  useTranslation: () => ({ t: (token: string) => token }),
}));
jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: { primary: { default: '#060' }, surface: { elevated: '#fff' }, border: { default: '#ddd' }, text: { primary: '#000', secondary: '#666' }, feedback: { error: '#f00' } },
    spacing: { xs: 4, sm: 8, md: 16 },
    typography: { body1: {}, caption: {} },
  }),
}));

describe('MultiDayAppointmentsSetting', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockSettingQuery.mockReset();
    mockSettingQuery.mockImplementation(() => ({ data: mockSetting, isLoading: false }));
    mockSetting = undefined;
  });

  it('is absent when the backend clinic setting is unavailable', () => {
    const screen = render(<MultiDayAppointmentsSetting />);
    expect(screen.queryByTestId('multiday-appointments-setting')).toBeNull();
  });

  it('renders unchecked from backend false and writes the narrow authoritative setting when enabled', () => {
    mockSetting = { available: true, enabled: false, version: 7 };
    const screen = render(<MultiDayAppointmentsSetting />);
    const toggle = screen.getByRole('switch', { name: 'clinicConfiguration.multiday.title' });

    expect(toggle.props.value).toBe(false);
    fireEvent(toggle, 'valueChange', true);
    expect(mockMutate).toHaveBeenCalledWith({ enabled: true, version: 7 });
  });

  it('renders checked only from backend true', () => {
    mockSetting = { available: true, enabled: true, version: 8 };
    const screen = render(<MultiDayAppointmentsSetting />);
    expect(screen.getByRole('switch', { name: 'clinicConfiguration.multiday.title' }).props.value).toBe(true);
  });

  it('queries the narrow setting using the authenticated tenant id', () => {
    mockSetting = { available: true, enabled: false, version: 0 };

    render(<MultiDayAppointmentsSetting />);

    expect(mockSettingQuery).toHaveBeenCalledWith('tenant-1');
  });
});
