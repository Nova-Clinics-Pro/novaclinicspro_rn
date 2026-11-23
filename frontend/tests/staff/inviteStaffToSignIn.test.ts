import { inviteStaffToSignInApi } from '../../features/staff/data/datasources/staff.api';
import { StaffOperationError } from '../../features/staff/domain/errors/staffOperationError';
import { inviteStaffErrorMessage } from '../../features/staff/domain/inviteStaffErrorMessage';
import { changeLanguage, t } from '../../core/localization/i18n';
import { axiosClient } from '../../core/api/axiosClient';

jest.mock('../../core/api/axiosClient', () => ({ axiosClient: { post: jest.fn() } }));

const post = axiosClient.post as jest.Mock;
const fail = (status?: number, data?: unknown) => post.mockRejectedValueOnce({ response: status ? { status, data } : undefined });
const reason = async () => {
  try { await inviteStaffToSignInApi('t1', 's1', 'a@example.com'); } catch (e) { return e as StaffOperationError; }
  throw new Error('did not fail');
};

describe('inviting an existing staff member to sign in (DEF_COP_008)', () => {
  beforeEach(() => { post.mockReset(); changeLanguage('en-US'); });

  it('posts the email to the staff member\'s invite action and returns the updated staff member', async () => {
    post.mockResolvedValueOnce({ data: { id: 's1', has_login: true, email: 'a@example.com', qualification: null, specializations: null } });
    const staff = await inviteStaffToSignInApi('t1', 's1', 'a@example.com');
    expect(post).toHaveBeenCalledWith('/api/v1/clinic/t1/staff/s1/invite', { email: 'a@example.com' });
    expect(staff.has_login).toBe(true);
  });

  it('says when the person can already sign in', async () => {
    fail(409, { detail: { error_code: 'STAFF_ALREADY_HAS_LOGIN' } });
    const error = await reason();
    expect(error.kind).toBe('ALREADY_HAS_LOGIN');
    expect(inviteStaffErrorMessage(t, error)).toBe('This staff member can already sign in.');
  });

  it('reuses the reasons Add Staff already explains', async () => {
    fail(409, { detail: { error_code: 'STAFF_EMAIL_EXISTS' } });
    expect((await reason()).kind).toBe('EMAIL_EXISTS');
    fail(409, { detail: { error_code: 'AUTH_EMAIL_REGISTERED' } });
    expect((await reason()).kind).toBe('AUTH_EMAIL_REGISTERED');
    fail(429, { detail: { error_code: 'AUTH_EMAIL_RATE_LIMITED' } });
    const limited = await reason();
    expect(limited.kind).toBe('RATE_LIMITED');
    expect(inviteStaffErrorMessage(t, limited)).toMatch(/wait a while and try again/);
  });

  it('any other failure is the invitation failing, not a failure to create staff', async () => {
    fail(500);
    expect(inviteStaffErrorMessage(t, await reason())).toBe('Could not send invitation. Please try again.');
    expect(inviteStaffErrorMessage(t, new Error('boom'))).toBe('Could not send invitation. Please try again.');
  });

  it('is available in Hindi', async () => {
    changeLanguage('hi-IN');
    fail(409, { detail: { error_code: 'STAFF_ALREADY_HAS_LOGIN' } });
    expect(inviteStaffErrorMessage(t, await reason())).toMatch(/साइन इन/);
  });
});
