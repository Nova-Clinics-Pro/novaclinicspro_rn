import { resolveRegistrationStatusRoute } from '../../features/registration/presentation/registrationStatusRouting';
import type { RegistrationStatus } from '../../features/registration/domain/entities/registration.entity';

const status = (overrides: Partial<RegistrationStatus>): RegistrationStatus => ({
  status: 'pending_review',
  action_required: false,
  updated_at: '2026-10-19T00:00:00Z',
  ...overrides,
});

describe('registration status routing', () => {
  it('routes an approved status only when the server selected an approved-choice continuation', () => {
    expect(resolveRegistrationStatusRoute(status({
      status: 'approved',
      continuation: {
        kind: 'approved_choice',
        application_id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_name: 'Nova Clinic',
      },
    }))).toBe('/onboarding/choice');
  });

  it('does not authorize Choice from approval alone', () => {
    expect(resolveRegistrationStatusRoute(status({ status: 'approved' }))).toBeNull();
  });

  it.each([
    ['null continuation', null],
    ['empty object', {}],
    ['primitive continuation', 'approved_choice'],
    ['array continuation', []],
    ['kind only', { kind: 'approved_choice' }],
    ['unexpected kind', { kind: 'other', application_id: '550e8400-e29b-41d4-a716-446655440000', tenant_name: 'Nova Clinic' }],
    ['missing application ID', { kind: 'approved_choice', tenant_name: 'Nova Clinic' }],
    ['null application ID', { kind: 'approved_choice', application_id: null, tenant_name: 'Nova Clinic' }],
    ['empty application ID', { kind: 'approved_choice', application_id: '', tenant_name: 'Nova Clinic' }],
    ['whitespace application ID', { kind: 'approved_choice', application_id: '   ', tenant_name: 'Nova Clinic' }],
    ['malformed application ID', { kind: 'approved_choice', application_id: 'application-1', tenant_name: 'Nova Clinic' }],
    ['missing tenant name', { kind: 'approved_choice', application_id: '550e8400-e29b-41d4-a716-446655440000' }],
    ['null tenant name', { kind: 'approved_choice', application_id: '550e8400-e29b-41d4-a716-446655440000', tenant_name: null }],
    ['empty tenant name', { kind: 'approved_choice', application_id: '550e8400-e29b-41d4-a716-446655440000', tenant_name: '' }],
    ['whitespace tenant name', { kind: 'approved_choice', application_id: '550e8400-e29b-41d4-a716-446655440000', tenant_name: '   ' }],
  ])('does not authorize Choice from %s', (_label, continuation) => {
    const malformedStatus = {
      status: 'approved',
      action_required: false,
      updated_at: '2026-10-19T00:00:00Z',
      continuation,
    } as unknown as RegistrationStatus;

    expect(resolveRegistrationStatusRoute(malformedStatus)).toBeNull();
  });

  it('preserves the established safe destinations for pending and rejected applicants', () => {
    expect(resolveRegistrationStatusRoute(status({ status: 'pending_review' }))).toBe('/onboarding/pending-review');
    expect(resolveRegistrationStatusRoute(status({ status: 'rejected' }))).toBe('/onboarding/rejected');
  });

  it('does not infer tenant membership or select an application for provisioning and recovery states', () => {
    expect(resolveRegistrationStatusRoute(status({ status: 'provisioning_pending' }))).toBeNull();
    expect(resolveRegistrationStatusRoute(status({ status: 'provisioning_in_progress' }))).toBeNull();
    expect(resolveRegistrationStatusRoute(status({ status: 'provisioning_completed' }))).toBeNull();
    expect(resolveRegistrationStatusRoute(status({ status: 'provisioning_recovery_required', recovery_state: 'recovery_required' }))).toBeNull();
  });

  it.each(['pending_review', 'rejected', 'provisioning_pending', 'provisioning_in_progress', 'provisioning_completed', 'provisioning_recovery_required'] as const)(
    'does not authorize Choice for %s even with an otherwise valid continuation',
    statusValue => {
      expect(resolveRegistrationStatusRoute(status({
        status: statusValue,
        continuation: {
          kind: 'approved_choice',
          application_id: '550e8400-e29b-41d4-a716-446655440000',
          tenant_name: 'Nova Clinic',
        },
      }))).not.toBe('/onboarding/choice');
    },
  );

  it('does not require caller-supplied application or tenant identifiers for route selection', () => {
    expect(resolveRegistrationStatusRoute(status({ status: 'registration_submitted' }))).toBe('/onboarding/draft');
  });
});
