import { normalizeRbacOperationError } from '../../../features/rbac/data/datasources/rbacOperationError';

const axiosFailure = (status?: number, data?: unknown) => ({
  isAxiosError: true,
  response: status === undefined ? undefined : { status, data },
});

describe('normalizeRbacOperationError', () => {
  it.each([
    [401, 'AUTHENTICATION_REQUIRED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [400, 'VALIDATION_FAILED'],
    [422, 'VALIDATION_FAILED'],
  ] as const)('maps HTTP %s to the semantic %s failure', (status, kind) => {
    const error = normalizeRbacOperationError(
      axiosFailure(status, { error: 'ROLE_IN_USE' })
    );

    expect(error.kind).toBe(kind);
    expect(error.code).toBe('ROLE_IN_USE');
  });

  it('keeps network and generic failures safe for presentation', () => {
    expect(normalizeRbacOperationError(axiosFailure()).kind).toBe('NETWORK_FAILED');
    expect(normalizeRbacOperationError(axiosFailure(500)).kind).toBe('SAVE_FAILED');
    expect(normalizeRbacOperationError(new Error('raw backend detail')).kind).toBe('SAVE_FAILED');
  });
});
