import { resolveRegistrationStatusRoute } from '../../features/registration/presentation/registrationStatusRouting';

describe('B2.7-CS-002 secure continuation routing', () => {
  const updated_at = '2026-10-19T00:00:00Z';

  it('allows Choice only when the authenticated status projection carries approved continuation', () => {
    expect(resolveRegistrationStatusRoute({
      status: 'approved', action_required: false, updated_at,
      continuation: {
        kind: 'approved_choice',
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_name: 'Owned Clinic',
      },
    })).toBe('/onboarding/choice');
  });

  it('does not make an approved state alone a tenant or Choice authorization decision', () => {
    expect(resolveRegistrationStatusRoute({ status: 'approved', action_required: false, updated_at })).toBeNull();
  });

  it.each(['pending_review', 'rejected', 'provisioning_pending', 'provisioning_in_progress', 'provisioning_recovery_required'] as const)(
    'does not disclose or route continuation for %s',
    status => expect(resolveRegistrationStatusRoute({ status, action_required: false, updated_at })).not.toBe('/onboarding/choice'),
  );
});
