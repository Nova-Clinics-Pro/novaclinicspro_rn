/**
 * Onboarding API datasource tests
 *
 * Data-layer coverage for idempotent step submission headers.
 */

import {
  ensureWorkspacePreparationApi,
  getWorkspacePreparationApi,
  retryWorkspacePreparationApi,
  submitStepDataApi,
} from '../../features/onboarding/data/datasources/onboarding.api';
import { StepSubmissionDatasourceError } from '../../features/onboarding/data/models/onboarding.dtos';
import { axiosClient } from '../../core/api/axiosClient';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockPost = axiosClient.post as jest.Mock;
const mockGet = axiosClient.get as jest.Mock;

describe('submitStepDataApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });
  });

  it('sends Idempotency-Key when provided', async () => {
    await submitStepDataApi(
      'tenant-123',
      'services',
      { data: {}, mark_complete: true },
      'submission-uuid-123'
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-123/steps/services',
      { data: {}, mark_complete: true },
      {
        headers: {
          'X-Tenant-ID': 'tenant-123',
          'Idempotency-Key': 'submission-uuid-123',
        },
      }
    );
  });

  it('omits Idempotency-Key when not provided while retaining tenant fallback header', async () => {
    await submitStepDataApi(
      'tenant-123',
      'services',
      { data: {}, mark_complete: true }
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-123/steps/services',
      { data: {}, mark_complete: true },
      {
        headers: {
          'X-Tenant-ID': 'tenant-123',
        },
      }
    );
  });

  it('passes cancellation and disables transport-owned auth replay for durable execution', async () => {
    const controller = new AbortController();

    await submitStepDataApi(
      'tenant-123',
      'operating_hours',
      {
        data: { operating_hours: [] },
        mark_complete: true,
        expected_revision: `step-rev-v1:${'a'.repeat(64)}`,
      },
      'original-idempotency-key',
      {
        signal: controller.signal,
        skipAuthRefreshRetry: true,
      }
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-123/steps/operating_hours',
      expect.any(Object),
      {
        headers: {
          'X-Tenant-ID': 'tenant-123',
          'Idempotency-Key': 'original-idempotency-key',
        },
        signal: controller.signal,
        skipAuthRefreshRetry: true,
      }
    );
  });

  it('maps only the approved stale-revision 409 and ignores internal fields', async () => {
    mockPost.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error: {
            error_code: 'onboarding.step_revision_conflict',
            message_token: 'errors.onboarding.stepRevisionConflict',
            conflict: {
              classification: 'STALE_REVISION',
              step_code: 'services',
              current_revision: `step-rev-v1:${'a'.repeat(64)}`,
              template_version: 'template-v1',
              capability_revision: `cap-v1:${'b'.repeat(64)}`,
            },
          },
          stack_trace: 'must not propagate',
        },
      },
    });

    await expect(
      submitStepDataApi(
        'tenant-123',
        'services',
        {
          data: {},
          expected_revision: `step-rev-v1:${'c'.repeat(64)}`,
        },
        'submission-uuid-123'
      )
    ).rejects.toEqual(
      expect.objectContaining({
        kind: 'STALE_REVISION',
        conflict: expect.objectContaining({
          step_code: 'services',
          current_revision: `step-rev-v1:${'a'.repeat(64)}`,
        }),
      })
    );
  });

  it('does not misclassify an unrelated or malformed 409', async () => {
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'unrecognized conflict' } },
    });

    await expect(
      submitStepDataApi('tenant-123', 'services', { data: {} })
    ).rejects.toEqual(
      expect.objectContaining<Partial<StepSubmissionDatasourceError>>({
        kind: 'MALFORMED_CONFLICT',
        conflict: null,
      })
    );
  });

  it.each([
    [
      'validation',
      { response: { status: 422, data: { detail: {} } } },
      'VALIDATION',
    ],
    [
      'idempotency',
      {
        response: {
          status: 409,
          data: { detail: 'Idempotent request is already in progress' },
        },
      },
      'IDEMPOTENCY_CONFLICT',
    ],
    ['timeout', { code: 'ECONNABORTED' }, 'TIMEOUT'],
    ['network', { code: 'ERR_NETWORK' }, 'NETWORK'],
    ['cancellation', { code: 'ERR_CANCELED' }, 'CANCELLED'],
  ])('normalizes the approved %s failure', async (_label, failure, kind) => {
    mockPost.mockRejectedValueOnce(failure);

    await expect(
      submitStepDataApi('tenant-123', 'operating_hours', { data: {} })
    ).rejects.toEqual(expect.objectContaining({ kind }));
  });
});
describe('Workspace Preparation datasource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ data: { contract_version: 'workspace_preparation_v1' } });
    mockGet.mockResolvedValue({ data: { contract_version: 'workspace_preparation_v1' } });
  });

  it('uses the existing authenticated client for ensure and status without client authority headers', async () => {
    await ensureWorkspacePreparationApi('tenant-1');
    await getWorkspacePreparationApi('tenant-1');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/workspace-preparation',
      { contract_version: 'workspace_preparation_v1' }
    );
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/workspace-preparation'
    );
  });

  it('sends aggregate version and only the approved idempotency header for retry', async () => {
    await retryWorkspacePreparationApi('tenant-1', 7, 'retry-key');
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/onboarding/tenant-1/workspace-preparation/retry',
      { contract_version: 'workspace_preparation_v1', aggregate_version: 7 },
      { headers: { 'Idempotency-Key': 'retry-key' } }
    );
  });
});
