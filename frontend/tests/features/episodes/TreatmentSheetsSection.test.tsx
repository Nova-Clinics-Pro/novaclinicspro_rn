import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { TreatmentSheetsSection } from '../../../features/episodes/presentation/components/TreatmentSheetsSection';
import { useTreatmentSheetsByEpisodeQuery } from '../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl';

jest.mock('../../../features/treatmentSheets/data/repositories/treatmentSheets.repository.impl', () => ({
  useTreatmentSheetsByEpisodeQuery: jest.fn(),
}));

jest.mock('../../../features/treatmentSheets/presentation/components/TreatmentSheetStatusBadge', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    TreatmentSheetStatusBadge: ({ status }: { status: string }) => <Text>{status}</Text>,
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = jest.requireActual('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text>{name}</Text> };
});

jest.mock('../../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2563EB' },
      surface: { default: '#FFFFFF' },
      border: { default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280' },
    },
    spacing: { md: 16 },
  }),
}));

const mockUseTreatmentSheetsByEpisodeQuery =
  useTreatmentSheetsByEpisodeQuery as jest.Mock;

const sheet = {
  id: 'sheet-1',
  duration_days: 3,
  agreed_package_cost: 4500,
  status: 'IN_PROGRESS',
  created_at: '2026-01-02T00:00:00.000Z',
  rows: [
    { id: 'row-1', session_id: 'session-1', treatment_description: 'Abhyanga' },
    { id: 'row-2', session_id: null, treatment_description: null },
  ],
};

describe('TreatmentSheetsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: { treatment_sheets: [], total: 0 },
      isLoading: false,
    });
  });

  it('delegates the tenant- and Episode-scoped read to the canonical Treatment Sheets query', () => {
    render(
      <TreatmentSheetsSection
        tenantId="tenant-1"
        episodeId="episode-1"
        onNavigateToSheet={jest.fn()}
      />
    );

    expect(mockUseTreatmentSheetsByEpisodeQuery).toHaveBeenCalledWith(
      'tenant-1',
      'episode-1'
    );
  });

  it('preserves the loading state', () => {
    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getByText, UNSAFE_getByType } = render(
      <TreatmentSheetsSection
        tenantId="tenant-1"
        episodeId="episode-1"
        onNavigateToSheet={jest.fn()}
      />
    );

    expect(getByText('Treatment Sheets')).toBeTruthy();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders nothing for empty, partial, or failed query data after loading', () => {
    const props = {
      tenantId: 'tenant-1',
      episodeId: 'episode-1',
      onNavigateToSheet: jest.fn(),
    };

    const empty = render(<TreatmentSheetsSection {...props} />);
    expect(empty.toJSON()).toBeNull();
    empty.unmount();

    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    expect(render(<TreatmentSheetsSection {...props} />).toJSON()).toBeNull();
  });

  it('preserves source order, status, cost, progress, date, and navigation', () => {
    const onNavigateToSheet = jest.fn();
    mockUseTreatmentSheetsByEpisodeQuery.mockReturnValue({
      data: {
        treatment_sheets: [sheet, { ...sheet, id: 'sheet-2', duration_days: 5 }],
        total: 2,
      },
      isLoading: false,
    });

    const { getByText, getAllByText } = render(
      <TreatmentSheetsSection
        tenantId="tenant-1"
        episodeId="episode-1"
        onNavigateToSheet={onNavigateToSheet}
      />
    );

    expect(getByText('Treatment Sheets (2)')).toBeTruthy();
    expect(getAllByText('IN_PROGRESS')).toHaveLength(2);
    expect(getAllByText('₹4,500')).toHaveLength(2);
    expect(getAllByText('50% Complete')).toHaveLength(2);
    expect(getAllByText(/^Created /)).toHaveLength(2);
    expect(getAllByText(/Day Treatment/).map((node) => node.props.children.join(''))).toEqual([
      '3 Day Treatment',
      '5 Day Treatment',
    ]);

    fireEvent.press(getByText('3 Day Treatment'));
    expect(onNavigateToSheet).toHaveBeenCalledTimes(1);
    expect(onNavigateToSheet).toHaveBeenCalledWith('sheet-1');
  });

  it('contains no direct presentation transport, endpoint, or datasource access', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../features/episodes/presentation/components/TreatmentSheetsSection.tsx'
      ),
      'utf8'
    );

    expect(source).not.toMatch(/axiosClient|\bfetch\s*\(|\/api\/v1\//);
    expect(source).not.toMatch(/data\/datasources|\.api['"]/);
    expect(source).toMatch(/useTreatmentSheetsByEpisodeQuery/);
  });
});
