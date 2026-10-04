import React from 'react';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFeatures } from '../../../core/hooks/useFeatures';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="workspace-redirect">{href}</Text>;
  },
}));
jest.mock('../../../core/hooks/useFeatures', () => ({
  useFeatures: jest.fn(),
  isCosV1Enabled: (features: { cos_v1_enabled?: boolean }) => Boolean(features.cos_v1_enabled),
  isFreshnessV1Enabled: () => false,
}));
jest.mock('../../../features/episodes/presentation/pages/CreateConsultationScreen', () => ({
  CreateConsultationScreen: (props: unknown) => {
    const { Text } = require('react-native');
    return <Text testID="start-consultation-props">{JSON.stringify(props)}</Text>;
  },
}));
jest.mock('../../../features/episodes/presentation/pages/ClinicalWorkspace', () => ({
  ClinicalWorkspace: (props: unknown) => {
    const { Text } = require('react-native');
    return <Text testID="legacy-consultation-props">{JSON.stringify(props)}</Text>;
  },
}));
jest.mock('../../../features/episodes/presentation/pages/CompleteConsultationScreen', () => ({
  CompleteConsultationScreen: (props: unknown) => {
    const { Text } = require('react-native');
    return <Text testID="legacy-completion-props">{JSON.stringify(props)}</Text>;
  },
}));

import StartConsultationRoute from '../../../app/clinic-admin/appointments/[appointmentId]/start-consultation';
import ConsultationRoute from '../../../app/clinic-admin/episodes/[episodeId]/consultation';
import CompleteConsultationRoute from '../../../app/clinic-admin/episodes/[episodeId]/complete-consultation';

describe('COS legacy route adapters (T-FE-F.1 / T-FE-F.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      appointmentId: 'appointment-1', clientId: 'client-1', episodeId: 'episode-1',
    });
  });

  it('F.1 sends start-consultation to the existing Episode-resolution screen with COS destination ON, preserving appointment/client identity', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
    const { getByTestId } = render(<StartConsultationRoute />);
    expect(JSON.parse(getByTestId('start-consultation-props').props.children)).toEqual({
      appointmentId: 'appointment-1', clientId: 'client-1', destination: 'workspace',
    });
  });

  it('F.1 redirects the consultation deep link to its requested workspace stage ON without dropping clinical identity', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      appointmentId: 'appointment-1', clientId: 'client-1', episodeId: 'episode-1', step: 'prescription',
    });
    const { getByTestId } = render(<ConsultationRoute />);
    expect(getByTestId('workspace-redirect').props.children).toBe(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor&step=prescription',
    );
  });

  it('F.1 preserves the start and consultation legacy paths OFF', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: false });
    const start = render(<StartConsultationRoute />);
    expect(JSON.parse(start.getByTestId('start-consultation-props').props.children).destination).toBe('consultation');
    const consultation = render(<ConsultationRoute />);
    expect(JSON.parse(consultation.getByTestId('legacy-consultation-props').props.children)).toEqual({
      episodeId: 'episode-1', appointmentId: 'appointment-1', clientId: 'client-1',
    });
  });

  it('F.2 redirects complete-consultation to the completion workspace stage ON with all context retained', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: true });
    const { getByTestId } = render(<CompleteConsultationRoute />);
    expect(getByTestId('workspace-redirect').props.children).toBe(
      '/clinic-admin/episodes/episode-1/workspace?appointmentId=appointment-1&clientId=client-1&mode=doctor&step=completion',
    );
  });

  it('F.2 preserves the legacy completion screen OFF', () => {
    (useFeatures as jest.Mock).mockReturnValue({ cos_v1_enabled: false });
    const { getByTestId } = render(<CompleteConsultationRoute />);
    expect(JSON.parse(getByTestId('legacy-completion-props').props.children)).toEqual({
      episodeId: 'episode-1', appointmentId: 'appointment-1', clientId: 'client-1',
    });
  });
});
