import {
  RegistrationSubmissionError,
  mapRegistrationSubmissionError,
  registerClinicOwnerApi,
} from '../../features/registration/data/datasources/registration.api';

jest.mock('../../core/api/axiosClient', () => ({
  axiosClient: { post: jest.fn() },
}));

const axiosError = (status: number, data: unknown) =>
  Object.assign(new Error('request failed'), {
    isAxiosError: true,
    response: { status, data },
  });

describe('registration error classification', () => {
  it('keeps user_already_exists a recoverable domain error without backend text', () => {
    const error = mapRegistrationSubmissionError(
      axiosError(409, {
        detail: {
          error: 'user_already_exists',
          message: 'internal backend message',
          suggestion: 'internal suggestion',
        },
      })
    );

    expect(error).toBeInstanceOf(RegistrationSubmissionError);
    expect(error.kind).toBe('USER_ALREADY_EXISTS');
    expect(error.domainCode).toBe('user_already_exists');
    expect(error.recoverable).toBe(true);
    expect(error.message).not.toContain('internal backend message');
  });

  it.each([
    [401, { error: 'invalid_credentials' }, 'INVALID_CREDENTIALS'],
    [422, { error: 'validation_error' }, 'FORM_VALIDATION'],
    [429, { error: 'rate_limited' }, 'TOO_MANY_ATTEMPTS'],
    [409, { error: 'registration_conflict' }, 'CONFLICT'],
  ] as const)('classifies %s as %s', (status, data, kind) => {
    expect(mapRegistrationSubmissionError(axiosError(status, data)).kind).toBe(kind);
  });

  it('classifies the backend retryable 503 registration_unavailable as a temporary service condition', () => {
    const error = mapRegistrationSubmissionError(
      axiosError(503, {
        detail: {
          error: 'registration_unavailable',
          retryable: true,
          message: 'internal backend prose that must never reach the user',
          suggestion: 'internal suggestion',
        },
      })
    );

    expect(error).toBeInstanceOf(RegistrationSubmissionError);
    expect(error.kind).toBe('SERVICE_UNAVAILABLE');
    expect(error.status).toBe(503);
    expect(error.domainCode).toBe('registration_unavailable');
    expect(error.recoverable).toBe(true); // the applicant can simply try again; not logged as a defect
    expect(error.validationIssues).toEqual([]);
    expect(error.message).not.toContain('internal backend prose');
  });

  it('does not confuse temporary unavailability with invalid input, conflicts or an existing account', () => {
    const kinds = [
      [422, { detail: { error: 'registration_validation_failed', errors: [] } }],
      [409, { detail: { error: 'clinic_name_unavailable' } }],
      [409, { detail: { error: 'user_already_exists' } }],
      [429, { detail: { error: 'rate_limited' } }],
    ].map(([status, data]) => mapRegistrationSubmissionError(axiosError(status as number, data)).kind);

    expect(kinds).not.toContain('SERVICE_UNAVAILABLE');
    expect(kinds).toEqual(['FORM_VALIDATION', 'CONFLICT', 'USER_ALREADY_EXISTS', 'TOO_MANY_ATTEMPTS']);
  });

  it('keeps an unexpected 5xx distinct from recoverable domain errors', () => {
    const error = mapRegistrationSubmissionError(axiosError(503, { error: 'server_failure' }));
    expect(error.kind).toBe('UNEXPECTED');
    expect(error.recoverable).toBe(false);
  });

  it('maps the stable backend field contract without parsing backend English', () => {
    const error = mapRegistrationSubmissionError(
      axiosError(422, {
        detail: {
          error: 'registration_validation_failed',
          errors: [
            {
              code: 'contact_name_forbidden_term',
              field_key: 'full_name',
              priority: 30,
              message: 'Contact name cannot contain test',
            },
          ],
        },
      })
    );

    expect(error.kind).toBe('FIELD_VALIDATION');
    expect(error.validationIssues).toEqual([
      { code: 'contact_name_forbidden_term', fieldKey: 'full_name', priority: 30 },
    ]);
    expect(error.message).not.toContain('Contact name cannot contain test');
  });
});

describe('registerClinicOwnerApi Idempotency-Key header', () => {
  const { axiosClient } = jest.requireMock('../../core/api/axiosClient');
  const request = { email: 'owner@example.test' } as any;

  beforeEach(() => axiosClient.post.mockReset());

  it('sends the supplied key as the Idempotency-Key header on the register endpoint', async () => {
    axiosClient.post.mockResolvedValue({ data: { success: true } });

    await registerClinicOwnerApi(request, 'attempt-key-1');

    expect(axiosClient.post).toHaveBeenCalledTimes(1);
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/api/v1/auth/register-clinic-owner',
      request,
      { headers: { 'Idempotency-Key': 'attempt-key-1' } }
    );
  });

  it('sends the same key again for a retry that is given the same key', async () => {
    axiosClient.post.mockResolvedValue({ data: { success: true } });

    await registerClinicOwnerApi(request, 'attempt-key-1');
    await registerClinicOwnerApi(request, 'attempt-key-1');

    const keys = axiosClient.post.mock.calls.map((call: any[]) => call[2].headers['Idempotency-Key']);
    expect(keys).toEqual(['attempt-key-1', 'attempt-key-1']);
  });

  it.each(['', '   ', 'x'.repeat(256)])('does not send a request with an invalid key (%#)', async key => {
    await expect(registerClinicOwnerApi(request, key)).rejects.toMatchObject({ kind: 'UNEXPECTED' });
    expect(axiosClient.post).not.toHaveBeenCalled();
  });

  it('resends the SAME key after a 503 registration_unavailable and treats the later success as a normal registration', async () => {
    axiosClient.post
      .mockRejectedValueOnce(axiosError(503, { detail: { error: 'registration_unavailable', retryable: true } }))
      .mockResolvedValueOnce({ data: { success: true, application_status: 'onboarding' } });

    await expect(registerClinicOwnerApi(request, 'attempt-key-1')).rejects.toMatchObject({
      kind: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
    const retry = await registerClinicOwnerApi(request, 'attempt-key-1');

    const keys = axiosClient.post.mock.calls.map((call: any[]) => call[2].headers['Idempotency-Key']);
    expect(keys).toEqual(['attempt-key-1', 'attempt-key-1']);
    expect(retry).toMatchObject({ success: true, application_status: 'onboarding' });
  });

  it('returns a pending-review registration as a success response, never as an error', async () => {
    const response = {
      success: true,
      application_status: 'pending_review',
      auto_approval_result: { eligible: false, reason: 'Pending manual review' },
    };
    axiosClient.post.mockResolvedValue({ data: response });

    await expect(registerClinicOwnerApi(request, 'attempt-key-2')).resolves.toEqual(response);
  });

  it('maps the backend idempotency conflict (409) and key validation (400) like other registration errors', async () => {
    axiosClient.post.mockRejectedValueOnce(axiosError(409, { detail: 'Idempotency-Key was reused with a different request payload' }));
    await expect(registerClinicOwnerApi(request, 'k')).rejects.toMatchObject({ kind: 'CONFLICT', status: 409 });
    axiosClient.post.mockRejectedValueOnce(axiosError(400, { detail: 'Idempotency-Key must be non-empty' }));
    await expect(registerClinicOwnerApi(request, 'k')).rejects.toMatchObject({ kind: 'FORM_VALIDATION', status: 400 });
  });
});
