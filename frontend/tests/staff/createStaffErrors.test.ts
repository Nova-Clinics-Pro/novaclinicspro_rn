import { createStaffApi } from '../../features/staff/data/datasources/staff.api';
import { StaffOperationError } from '../../features/staff/domain/errors/staffOperationError';
import { createStaffErrorMessage } from '../../features/staff/domain/createStaffErrorMessage';
import { changeLanguage, t } from '../../core/localization/i18n';
import { axiosClient } from '../../core/api/axiosClient';

jest.mock('../../core/api/axiosClient', () => ({ axiosClient: { post: jest.fn() } }));

const post = axiosClient.post as jest.Mock;
const fail = (status?: number, data?: unknown) => post.mockRejectedValueOnce({ response: status ? { status, data } : undefined });
const reason = async () => { try { await createStaffApi('t1', {} as never); } catch (e) { return e as StaffOperationError; } throw new Error('did not fail'); };

describe('creating a staff member: failures say what happened', () => {
  beforeEach(() => { post.mockReset(); changeLanguage('en-US'); });

  it('a duplicate email is reported as such, not as a generic failure', async () => {
    fail(409, { detail: 'A staff member with this email already exists' });
    const error = await reason();
    expect(error.kind).toBe('EMAIL_EXISTS');
    expect(createStaffErrorMessage(t, error)).toBe(
      'A staff member with this email already exists in your clinic. Use a different email, or open the existing staff member instead.'
    );
  });

  it('a duplicate phone is told apart from a duplicate email', async () => {
    fail(409, { detail: { error_code: 'STAFF_PHONE_EXISTS', message: 'x' } });
    const error = await reason();
    expect(error.kind).toBe('PHONE_EXISTS');
    expect(createStaffErrorMessage(t, error)).toBe(
      'A staff member with this phone number already exists in your clinic. Use a different phone number.'
    );
  });

  it('an email rate limit says to wait, instead of a generic failure', async () => {
    fail(429, { detail: { error_code: 'AUTH_EMAIL_RATE_LIMITED' } });
    const error = await reason();
    expect(error.kind).toBe('RATE_LIMITED');
    expect(createStaffErrorMessage(t, error)).toMatch(/wait a while and try again/);
  });

  it('both are available in Hindi', async () => {
    changeLanguage('hi-IN');
    fail(409, { detail: { error_code: 'STAFF_PHONE_EXISTS' } });
    expect(createStaffErrorMessage(t, await reason())).toMatch(/फ़ोन नंबर/);
    fail(429);
    expect(createStaffErrorMessage(t, await reason())).toMatch(/कुछ देर बाद/);
  });

  it('a refusal explains who can do it, in the user\'s language', async () => {
    fail(403, { detail: { error_code: 'MISSING_PERMISSION', details: { required_permission: 'staff.create', permitted_roles: ['Clinic Admin', 'Clinic Owner'] } } });
    const error = await reason();
    expect(error.kind).toBe('PERMISSION_DENIED');
    expect(createStaffErrorMessage(t, error)).toMatch(/create staff/);
    expect(createStaffErrorMessage(t, error)).not.toMatch(/status code|403/);
  });

  it('anything else stays the generic message and exposes no transport text', async () => {
    fail(500, { detail: 'boom' });
    const error = await reason();
    expect(error.kind).toBe('SAVE_FAILED');
    expect(createStaffErrorMessage(t, error)).toBe('Could not create staff member. Please try again.');
    fail(undefined);
    expect((await reason()).kind).toBe('SAVE_FAILED');
  });

  it('shows the duplicate-email message in Hindi', async () => {
    fail(409);
    changeLanguage('hi-IN');
    expect(createStaffErrorMessage(t, await reason())).toMatch(/पहले से मौजूद है/);
  });
});
