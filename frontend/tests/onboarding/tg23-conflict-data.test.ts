import {
  OnboardingStatusResponse,
  StepSubmissionDatasourceError,
} from '../../features/onboarding/data/models/onboarding.dtos';
import { mapStepSubmissionError } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { mapOnboardingStatusToDomain } from '../../features/onboarding/domain/entities/onboarding-status.entity';
import {
  StepConflictError,
  createAuthoritativeStepUpdateEvidence,
  createDraftRevisionEvidence,
  createRevisionAwareMutationExpectation,
  deriveDraftConflictFacts,
} from '../../features/onboarding/domain/entities/step-revision.entity';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const revision = (character: string) => `step-rev-v1:${character.repeat(64)}`;
const capabilityRevision = `cap-v1:${'c'.repeat(64)}`;

const step = (stepCode: string, value = revision('a')) => ({
  step_code: stepCode,
  status: 'not_started' as const,
  is_complete: false,
  is_valid: false,
  issues: [],
  blocked_reason: null,
  action_url_template: null,
  entity_type: null,
  icon: null,
  category: null,
  visible: true,
  actionable: true,
  revision: value,
  updated_at: '2026-07-23T09:00:00Z',
  template_version: 'template-v1',
  capability_revision: capabilityRevision,
});

const status = (): OnboardingStatusResponse => ({
  tenant_id: 'tenant-a',
  template_id: 'template-a',
  clinic_type: 'specialty-neutral',
  total_steps: 2,
  completed_steps: 0,
  in_progress_steps: 0,
  pending_steps: 2,
  blocked_steps: 0,
  completion_percentage: 0,
  current_step: 'second',
  next_recommended_step: 'second',
  is_ready_to_go_live: false,
  per_step_validation: {
    second: step('second'),
    first: step('first', revision('b')),
  },
  visible_steps: ['second', 'first'],
  actionable_steps: ['second', 'first'],
});

describe('TG23.3 authoritative onboarding status mapping', () => {
  it('preserves server order, UTC evidence, opaque revision and projection identity', () => {
    const mapped = mapOnboardingStatusToDomain(status());

    expect(Array.from(mapped.steps.keys())).toEqual(['second', 'first']);
    const evidence = mapped.steps.get('second')?.authoritativeEvidence;
    expect(evidence).toEqual({
      tenantId: 'tenant-a',
      stepCode: 'second',
      revision: {
        contractVersion: 'step-rev-v1',
        value: revision('a'),
      },
      updatedAt: new Date('2026-07-23T09:00:00Z'),
      projectionIdentity: {
        templateVersion: 'template-v1',
        capabilityRevision,
      },
    });
    expect(Object.isFrozen(evidence)).toBe(true);
  });

  it('represents a legacy missing revision explicitly without treating it as matching', () => {
    const dto = status();
    dto.per_step_validation.second = {
      ...dto.per_step_validation.second,
      revision: null,
      updated_at: null,
      template_version: null,
      capability_revision: null,
    };

    const mapped = mapOnboardingStatusToDomain(dto);
    expect(mapped.steps.get('second')?.evidenceAvailability).toBe('UNAVAILABLE');
    expect(mapped.steps.get('second')?.authoritativeEvidence).toBeNull();
  });

  it.each([
    ['malformed revision', { revision: '2' }],
    ['projection revision presented as step evidence', { revision: `onboarding-v1:${'a'.repeat(64)}` }],
    ['partial evidence', { capability_revision: null }],
    ['step identity mismatch', { step_code: 'other' }],
  ])('rejects %s', (_label, override) => {
    const dto = status();
    dto.per_step_validation.second = {
      ...dto.per_step_validation.second,
      ...override,
    };
    expect(() => mapOnboardingStatusToDomain(dto)).toThrow(StepConflictError);
  });
});

describe('TG23.3 typed conflict and application facts', () => {
  it('maps the approved stale conflict without replacing its revision', () => {
    const datasourceError = new StepSubmissionDatasourceError(
      'STALE_REVISION',
      'onboarding.step_revision_conflict',
      'errors.onboarding.stepRevisionConflict',
      false,
      {
        classification: 'STALE_REVISION',
        step_code: 'second',
        current_revision: revision('d'),
        template_version: 'template-v1',
        capability_revision: capabilityRevision,
      }
    );

    expect(() => mapStepSubmissionError(datasourceError, 'second')).toThrow(
      expect.objectContaining({
        kind: 'STALE_REVISION',
        conflict: expect.objectContaining({
          stepCode: 'second',
          currentRevision: expect.objectContaining({ value: revision('d') }),
        }),
      })
    );
  });

  it('rejects a stale conflict for a different authoritative step', () => {
    const datasourceError = new StepSubmissionDatasourceError(
      'STALE_REVISION',
      'onboarding.step_revision_conflict',
      'errors.onboarding.stepRevisionConflict',
      false,
      {
        classification: 'STALE_REVISION',
        step_code: 'other',
        current_revision: revision('d'),
        template_version: 'template-v1',
        capability_revision: capabilityRevision,
      }
    );

    expect(() => mapStepSubmissionError(datasourceError, 'second')).toThrow(
      expect.objectContaining({ kind: 'MALFORMED_CONFLICT' })
    );
  });

  it('exposes immutable facts without choosing presentation or recovery actions', () => {
    const currentEvidence = createAuthoritativeStepUpdateEvidence({
      tenantId: 'tenant-a',
      stepCode: 'second',
      revision: revision('b'),
      updatedAt: '2026-07-23T09:00:00Z',
      templateVersion: 'template-v2',
      capabilityRevision,
    });
    const localEvidence = createDraftRevisionEvidence({
      organizationId: 'org-a',
      tenantId: 'tenant-a',
      stepCode: 'second',
      revision: revision('a'),
      templateVersion: 'template-v1',
      capabilityRevision,
    });

    const facts = deriveDraftConflictFacts({
      currentOrganizationId: 'org-a',
      localDraftExists: true,
      localEvidence,
      currentEvidence,
    });

    expect(facts).toEqual({
      localDraftExists: true,
      observedRevision: localEvidence.revision,
      currentRevision: currentEvidence.revision,
      revisionsMatch: false,
      projectionMatches: false,
      transportConflictReceived: false,
      legacyOrMissingEvidence: false,
    });
    expect(Object.isFrozen(facts)).toBe(true);
    expect(facts).not.toHaveProperty('useLatest');
    expect(facts).not.toHaveProperty('keepLocal');
    expect(facts).not.toHaveProperty('showModal');
  });

  it('keeps legacy missing evidence explicit', () => {
    const currentEvidence = createAuthoritativeStepUpdateEvidence({
      tenantId: 'tenant-a',
      stepCode: 'second',
      revision: revision('b'),
      updatedAt: '2026-07-23T09:00:00+00:00',
      templateVersion: 'template-v1',
      capabilityRevision,
    });

    expect(
      deriveDraftConflictFacts({
        currentOrganizationId: 'org-a',
        localDraftExists: true,
        localEvidence: null,
        currentEvidence,
      })
    ).toEqual(
      expect.objectContaining({
        observedRevision: null,
        revisionsMatch: null,
        projectionMatches: null,
        legacyOrMissingEvidence: true,
      })
    );
  });

  it('creates an immutable expected-revision mutation contract', () => {
    const expectedRevision = createDraftRevisionEvidence({
      organizationId: 'org-a',
      tenantId: 'tenant-a',
      stepCode: 'second',
      revision: revision('a'),
      templateVersion: 'template-v1',
      capabilityRevision,
    }).revision;

    const expectation =
      createRevisionAwareMutationExpectation(expectedRevision);

    expect(expectation).toEqual({ expectedRevision });
    expect(Object.isFrozen(expectation)).toBe(true);
  });
});
