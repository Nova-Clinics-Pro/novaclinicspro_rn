import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import {
  ONBOARDING_STEP_SUBMIT_OPERATION,
  createPendingMutationRecord,
  transitionPendingMutation,
} from '../../features/onboarding/domain/entities/pending-mutation.entity';
import { PendingMutationRecoveryBanner } from '../../features/onboarding/presentation/components/PendingMutationRecoveryBanner';
import enUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const pending = createPendingMutationRecord({
  mutationId: 'mutation-1',
  operationId: ONBOARDING_STEP_SUBMIT_OPERATION,
  scope: {
    userId: 'user-1',
    organizationId: 'org-1',
    tenantId: 'tenant-1',
  },
  stepCode: 'operating_hours',
  body: { operating_hours: [] },
  expectedRevision: `step-rev-v1:${'a'.repeat(64)}`,
  templateVersion: 'template-v1',
  capabilityRevision: `cap-v1:${'b'.repeat(64)}`,
  idempotencyKey: 'secret-idempotency-key',
  now: 1,
});

const renderBanner = (
  records = [pending],
  overrides: Partial<
    React.ComponentProps<typeof PendingMutationRecoveryBanner>
  > = {}
) =>
  render(
    <PendingMutationRecoveryBanner
      records={records}
      recoveryRequired={false}
      busyMutationId={null}
      onRetry={jest.fn()}
      onEdit={jest.fn()}
      onDiscard={jest.fn()}
      {...overrides}
    />
  );

describe('TG24.4 pending mutation recovery presentation', () => {
  it('announces pending recovery without exposing payload, evidence, or identifiers', () => {
    const screen = renderBanner();

    expect(
      screen.getByText(
        'A saved change will be retried when Nova confirms a safe connection.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveProp(
      'accessibilityLiveRegion',
      'polite'
    );
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toContain('operating_hours');
    expect(rendered).not.toContain('step-rev-v1');
    expect(rendered).not.toContain('secret-idempotency-key');
  });

  it('offers bounded retry, edit, and discard actions for a retry-exhausted record', () => {
    const manual = transitionPendingMutation(pending, {
      state: 'REPLAYING',
      now: 2,
      attemptCount: 4,
    });
    const exhausted = transitionPendingMutation(manual, {
      state: 'MANUAL_ACTION_REQUIRED',
      now: 3,
      attemptCount: 4,
      failureCategory: 'RETRY_EXHAUSTED',
    });
    const retry = jest.fn();
    const edit = jest.fn();
    const discard = jest.fn();
    const screen = renderBanner([exhausted], {
      onRetry: retry,
      onEdit: edit,
      onDiscard: discard,
    });

    fireEvent.press(screen.getByLabelText('Try again'));
    fireEvent.press(screen.getByLabelText('Review step'));
    fireEvent.press(screen.getByLabelText('Discard saved change'));

    expect(retry).toHaveBeenCalledWith(exhausted);
    expect(edit).toHaveBeenCalledWith(exhausted);
    expect(discard).toHaveBeenCalledWith(exhausted);
  });

  it('delegates conflicts to review and never offers automatic retry', () => {
    const replaying = transitionPendingMutation(pending, {
      state: 'REPLAYING',
      now: 2,
      attemptCount: 2,
    });
    const conflict = transitionPendingMutation(replaying, {
      state: 'CONFLICT_BLOCKED',
      now: 3,
      attemptCount: 2,
      failureCategory: 'E6_REVISION_CONFLICT',
    });
    const screen = renderBanner([conflict]);

    expect(screen.getByLabelText('Review step')).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
    expect(screen.getByRole('alert')).toHaveProp(
      'accessibilityLiveRegion',
      'assertive'
    );
  });

  it('surfaces fail-closed storage recovery without actions', () => {
    const screen = renderBanner([], { recoveryRequired: true });

    expect(
      screen.getByText(
        'Saved recovery data could not be validated and was not submitted.'
      )
    ).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps English and Hindi recovery keys and placeholders in parity', () => {
    const english =
      enUS.onboarding.progressiveExperience.mutationRecovery;
    const hindi =
      hiIN.onboarding.progressiveExperience.mutationRecovery;

    expect(Object.keys(hindi)).toEqual(Object.keys(english));
    expect(Object.keys(hindi.states)).toEqual(Object.keys(english.states));
    expect(Object.keys(hindi.actions)).toEqual(Object.keys(english.actions));
    expect(Object.keys(hindi.discard)).toEqual(Object.keys(english.discard));
    expect(hindi.pendingCount.match(/{{[^}]+}}/g)).toEqual(
      english.pendingCount.match(/{{[^}]+}}/g)
    );
  });
});
