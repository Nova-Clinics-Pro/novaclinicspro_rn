import { classifyApiError } from '../../core/api/apiErrorPresentation';
import { describeApiError, describePermissionAction } from '../../core/localization/apiErrorMessages';
import { changeLanguage, t } from '../../core/localization/i18n';

const forbidden = (details: Record<string, unknown> | null, code = 'MISSING_PERMISSION') => ({
  message: 'Request failed with status code 403',
  response: { status: 403, data: { detail: { error_code: code, message: 'x', details } } },
});

const denial = (permission: string, roles: string[]) =>
  classifyApiError(forbidden({ required_permission: permission, permitted_roles: roles }));

describe('classifyApiError', () => {
  it('classifies a permission 403 with the required permission and who holds it', () => {
    expect(denial('appointment.read', ['Doctor', 'Receptionist'])).toEqual({
      kind: 'permission_denied', status: 403, requiredPermission: 'appointment.read',
      permittedRoles: ['Doctor', 'Receptionist'], userRoles: [], retryable: false,
    });
  });

  it('classifies a commercial-entitlement 403 separately and never as retryable', () => {
    const info = classifyApiError(forbidden({ reason: 'trial_expired' }, 'COMMERCIAL_ENTITLEMENT_REQUIRED'));
    expect(info.kind).toBe('entitlement_required');
    expect(info.retryable).toBe(false);
  });

  it('treats any 403 as a permission refusal even when the backend gave no detail', () => {
    const info = classifyApiError({ response: { status: 403, data: 'Forbidden' } });
    expect(info).toMatchObject({ kind: 'permission_denied', permittedRoles: [], retryable: false });
  });

  it('only 5xx and network failures are retryable', () => {
    expect(classifyApiError({ response: { status: 500 } })).toMatchObject({ kind: 'server', retryable: true });
    expect(classifyApiError(new Error('Network Error'))).toMatchObject({ kind: 'network', retryable: true });
    expect(classifyApiError({ response: { status: 404 } })).toMatchObject({ kind: 'not_found', retryable: false });
    expect(classifyApiError({ response: { status: 401 } })).toMatchObject({ kind: 'unauthenticated', retryable: false });
    expect(classifyApiError({ response: { status: 422 } })).toMatchObject({ kind: 'unknown', retryable: false });
  });
});

describe('describeApiError uses the roles the backend reports for the user', () => {
  beforeAll(() => changeLanguage('en-US'));

  it('names the user from the denial itself, even when the session role list is empty', () => {
    const info = classifyApiError(forbidden({
      required_permission: 'appointment.create', permitted_roles: ['Doctor', 'Receptionist'], user_roles: ['Clinic Owner'],
    }));
    expect(info.userRoles).toEqual(['Clinic Owner']);
    expect(describeApiError(t, info, []).message).toBe(
      "As a clinic owner, you don't have permission to create appointments. Only doctors and receptionists can do this."
    );
  });
});

describe('describeApiError (English)', () => {
  beforeAll(() => changeLanguage('en-US'));

  it('explains the denial in the words a clinic owner can act on', () => {
    const { title, message } = describeApiError(t, denial('appointment.create', ['Doctor', 'Receptionist']), ['clinic_owner']);
    expect(title).toBe("You don't have permission");
    expect(message).toBe(
      "As a clinic owner, you don't have permission to create appointments. Only doctors and receptionists can do this."
    );
  });

  it('lists three or more roles naturally', () => {
    const { message } = describeApiError(t, denial('appointment.read', ['Doctor', 'Nurse', 'Receptionist']), ['clinic_admin']);
    expect(message).toContain('Only doctors, nurses, and receptionists can do this.');
    expect(message).toContain('As a clinic admin');
  });

  it('never leaks the transport message or the raw permission code', () => {
    const { message } = describeApiError(t, denial('appointment.read', ['Doctor']), ['nurse']);
    expect(message).not.toMatch(/status code|403|appointment\.read/i);
  });

  it('falls back to asking the owner/admin when no role is known to hold the permission', () => {
    const { message } = describeApiError(t, denial('user.create', []), ['doctor']);
    expect(message).toBe(
      "As a doctor, you don't have permission to create users. Please ask your clinic owner or administrator for access."
    );
  });

  it('omits the "As ..." clause when the user has no known role', () => {
    expect(describeApiError(t, denial('appointment.read', ['Doctor']), []).message).toBe(
      "You don't have permission to view appointments. Only doctors can do this."
    );
  });

  it('uses a generic action when the permission is unknown or missing', () => {
    expect(describePermissionAction(t, undefined)).toBe('do this');
    expect(describePermissionAction(t, 'made_up.thing')).toBe('do this');
  });

  it('reads naturally for the unusual permission shapes', () => {
    expect(describePermissionAction(t, 'invoice.collect_payment')).toBe('collect payments for invoices');
    expect(describePermissionAction(t, 'onboarding.workspace_preparation.manage')).toBe('manage workspace setup');
    expect(describePermissionAction(t, 'treatment_sheet.view_assigned')).toBe('view assigned treatment sheets');
  });

  it('explains an inactive plan instead of a permission problem', () => {
    const info = classifyApiError(forbidden({ reason: 'x', required_permission: 'appointment.read' }, 'COMMERCIAL_ENTITLEMENT_REQUIRED'));
    const { title, message } = describeApiError(t, info, ['clinic_owner']);
    expect(title).toBe("Your clinic's plan is not active");
    expect(message).toContain("can't view appointments");
  });

  it('gives plain-language messages for network, server and not-found failures', () => {
    expect(describeApiError(t, classifyApiError(new Error('Network Error'))).message).toBe('Check your internet connection and try again.');
    expect(describeApiError(t, classifyApiError({ response: { status: 500 } })).message).toMatch(/our side/);
    expect(describeApiError(t, classifyApiError({ response: { status: 404 } })).message).toMatch(/couldn't find/);
  });
});

describe('describeApiError (Hindi)', () => {
  beforeAll(() => changeLanguage('hi-IN'));
  afterAll(() => changeLanguage('en-US'));

  it('shows the denial in Hindi, in the user\'s language', () => {
    const { title, message } = describeApiError(t, denial('appointment.create', ['Doctor', 'Receptionist']), ['clinic_owner']);
    expect(title).toBe('आपके पास अनुमति नहीं है');
    expect(message).toBe(
      'क्लिनिक स्वामी के रूप में, आपके पास अपॉइंटमेंट बनाने की अनुमति नहीं है। यह केवल डॉक्टर और रिसेप्शनिस्ट ही कर सकते हैं।'
    );
  });

  it('has no English leaking into the Hindi permission, plan and failure messages', () => {
    const samples = [
      describeApiError(t, denial('appointment.read', ['Doctor']), ['nurse']).message,
      describeApiError(t, classifyApiError(forbidden({}, 'COMMERCIAL_ENTITLEMENT_REQUIRED')), []).message,
      describeApiError(t, classifyApiError(new Error('x'))).message,
    ];
    for (const sample of samples) expect(sample).not.toMatch(/[A-Za-z]{4,}/);
  });
});

describe('role management permission wording', () => {
  it('reads naturally in English and Hindi', () => {
    changeLanguage('en-US');
    expect(describePermissionAction(t, 'role.manage_permissions')).toBe('manage permissions for roles');
    changeLanguage('hi-IN');
    expect(describePermissionAction(t, 'role.manage_permissions')).toBe('भूमिकाओं की अनुमतियाँ प्रबंधित करने');
    changeLanguage('en-US');
  });
});
