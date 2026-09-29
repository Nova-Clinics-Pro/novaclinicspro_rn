/**
 * ProgressBar Component Tests
 */

import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../../features/onboarding/presentation/components/ProgressBar';

// Mock theme hook
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E' },
      text: { secondary: '#6B7280' },
      border: { subtle: '#F3F4F6' },
    },
    spacing: { xs: 4, sm: 8 },
    typography: {
      body2: { fontSize: 14 },
      h6: { fontSize: 16, fontWeight: '600' },
    },
  }),
}));

describe('ProgressBar Component', () => {
  it('renders with correct percentage', () => {
    const { getByText } = render(<ProgressBar percentage={75} />);

    expect(getByText('75%')).toBeTruthy();
  });

  it('shows label by default', () => {
    const { getByText } = render(<ProgressBar percentage={50} />);

    expect(getByText('Clinic Preparation')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    const { queryByText } = render(<ProgressBar percentage={50} showLabel={false} />);

    expect(queryByText('Clinic Preparation')).toBeNull();
    expect(queryByText('50%')).toBeNull();
  });

  it('renders with 0% progress', () => {
    const { getByText } = render(<ProgressBar percentage={0} />);

    expect(getByText('0%')).toBeTruthy();
  });

  it('renders with 100% progress', () => {
    const { getByText } = render(<ProgressBar percentage={100} />);

    expect(getByText('100%')).toBeTruthy();
  });

  it('renders progress bar fill with correct width', () => {
    const { UNSAFE_getAllByType } = render(<ProgressBar percentage={60} />);
    const views = UNSAFE_getAllByType(View);

    // Find the fill view (should have width: '60%')
    const fillView = views.find((view: any) => {
      const styles = Array.isArray(view.props.style) ? view.props.style : [view.props.style];
      return styles.some((style: any) => style?.width === '60%');
    });

    expect(fillView).toBeTruthy();
  });

  it('exposes progressbar semantics and textual meaning', () => {
    const { getByRole } = render(
      <ProgressBar
        percentage={60}
        showLabel={false}
        accessibilityLabel="3 of 5 journey steps complete"
      />
    );

    const progressbar = getByRole('progressbar');
    expect(progressbar.props.accessibilityLabel).toBe('3 of 5 journey steps complete');
    expect(progressbar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
  });
});
