/**
 * DemoStatusBanner Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DemoStatusBanner } from '../../features/onboarding/presentation/components/DemoStatusBanner';

// Mock theme hook
jest.mock('../../core/theme/useClinicTheme', () => ({
  useClinicTheme: () => ({
    colors: {
      primary: { default: '#2F6F4E', soft: '#E8F5E9' },
      surface: { default: '#FFFFFF', elevated: '#F9FAFB' },
      border: { default: '#E5E7EB' },
      text: { primary: '#111827', secondary: '#6B7280', onPrimary: '#FFFFFF' },
      feedback: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        errorLight: '#FEE2E2',
      },
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
    typography: {
      h6: { fontSize: 16, fontWeight: '600' },
      body2: { fontSize: 14 },
      button: { fontSize: 14, fontWeight: '600' },
    },
  }),
}));

describe('DemoStatusBanner Component', () => {
  const mockOnExtendDemo = jest.fn();
  const mockOnTransitionToLive = jest.fn();

  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now
  const trialFutureDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(); // 25 days from now

  beforeEach(() => {
    mockOnExtendDemo.mockClear();
    mockOnTransitionToLive.mockClear();
  });

  it('renders clinic preparation banner without legacy demo wording', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onExtendDemo={mockOnExtendDemo}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    expect(getByText('Clinic Preparation')).toBeTruthy();
  });

  it('renders trial period banner when demo is expired', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={new Date(Date.now() - 1000).toISOString()}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={true}
        isTrialExpired={false}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    expect(getByText('Commercial Trial')).toBeTruthy();
  });

  it('shows continue setup button when preparation access is active and can continue', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onExtendDemo={mockOnExtendDemo}
        onTransitionToLive={mockOnTransitionToLive}
        canExtendDemo={true}
      />
    );

    expect(getByText('Continue Setup')).toBeTruthy();
  });

  it('hides continue setup button when continuing is unavailable', () => {
    const { queryByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onExtendDemo={mockOnExtendDemo}
        onTransitionToLive={mockOnTransitionToLive}
        canExtendDemo={false}
      />
    );

    expect(queryByText('Continue Setup')).toBeNull();
  });

  it('shows "Ready to Start" button when sample clinic is active', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    expect(getByText('Ready to Start')).toBeTruthy();
  });

  it('shows "Review Subscription" button when preparation access is expired', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={new Date(Date.now() - 1000).toISOString()}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={true}
        isTrialExpired={false}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    expect(getByText('Review Subscription')).toBeTruthy();
  });

  it('calls onExtendDemo when continue setup button is pressed', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onExtendDemo={mockOnExtendDemo}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    fireEvent.press(getByText('Continue Setup'));
    expect(mockOnExtendDemo).toHaveBeenCalledTimes(1);
  });

  it('calls onTransitionToLive when Ready to Start button is pressed', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    fireEvent.press(getByText('Ready to Start'));
    expect(mockOnTransitionToLive).toHaveBeenCalledTimes(1);
  });

  it('shows trial expired message when both demo and trial are expired', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={new Date(Date.now() - 1000).toISOString()}
        trialExpiresAt={new Date(Date.now() - 1000).toISOString()}
        isDemoExpired={true}
        isTrialExpired={true}
      />
    );

    expect(getByText('Access Paused')).toBeTruthy();
    expect(
      getByText('Your clinic data is safely stored. Review subscription options to continue using Nova.')
    ).toBeTruthy();
  });

  it('displays preparation access countdown when active', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
      />
    );

    expect(getByText(/Preparation access ends in:/)).toBeTruthy();
  });

  it('displays trial countdown', () => {
    const { getByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
      />
    );

    expect(getByText(/Commercial trial ends in:/)).toBeTruthy();
  });

  it('does not show preparation access countdown when access is expired', () => {
    const { queryByText } = render(
      <DemoStatusBanner
        demoExpiresAt={new Date(Date.now() - 1000).toISOString()}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={true}
        isTrialExpired={false}
      />
    );

    expect(queryByText(/Preparation access ends in:/)).toBeNull();
  });

  it('disables Ready to Start when readiness is unavailable', () => {
    const { getByLabelText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onTransitionToLive={mockOnTransitionToLive}
        isTransitionDisabled={true}
      />
    );

    expect(getByLabelText('Ready to Start')).toHaveProp('accessibilityState', { disabled: true });
    fireEvent.press(getByLabelText('Ready to Start'));
    expect(mockOnTransitionToLive).not.toHaveBeenCalled();
  });

  it('does not expose legacy Demo or Go Live wording', () => {
    const { queryByText } = render(
      <DemoStatusBanner
        demoExpiresAt={futureDate}
        trialExpiresAt={trialFutureDate}
        isDemoExpired={false}
        isTrialExpired={false}
        onExtendDemo={mockOnExtendDemo}
        onTransitionToLive={mockOnTransitionToLive}
      />
    );

    expect(queryByText(/Demo/i)).toBeNull();
    expect(queryByText(/Go Live/i)).toBeNull();
  });
});
