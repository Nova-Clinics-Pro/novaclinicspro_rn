import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorScreen } from '../../features/onboarding/presentation/components/ErrorScreen';
import { LoadingScreen } from '../../features/onboarding/presentation/components/LoadingScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#primary' },
      background: { default: '#background' },
      text: { primary: '#primary-text', secondary: '#secondary-text', onPrimary: '#on-primary' },
      feedback: { error: '#error' },
    },
    spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
    typography: { h4: {}, body1: {}, button: {} },
  }),
}));

describe('Journey Visibility presentation states', () => {
  it('announces the localized loading state as busy', () => {
    const message = 'Loading your clinic preparation journey...';
    const { getByRole } = render(<LoadingScreen message={message} />);
    const progress = getByRole('progressbar');
    expect(progress).toHaveProp('accessibilityLabel', message);
    expect(progress).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(progress).toHaveProp('accessibilityState', { busy: true });
  });

  it('announces a safe failure and provides a localized retry action', () => {
    const retry = jest.fn();
    const { getByRole, getByLabelText } = render(
      <ErrorScreen
        title="Unable to load clinic preparation"
        message="Your clinic journey is temporarily unavailable. Please try again."
        retryLabel="Try again"
        onRetry={retry}
      />
    );
    expect(getByRole('alert')).toHaveProp('accessibilityLiveRegion', 'assertive');
    const retryButton = getByLabelText('Try again');
    expect(retryButton).toHaveProp('accessibilityRole', 'button');
    fireEvent.press(retryButton);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
