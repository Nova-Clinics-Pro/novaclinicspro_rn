import { assertTestingSupabase, config } from './config';
import type { TestIdentity } from './identities';

/** Minimal API client for black-box verification. Tokens stay in memory; nothing sensitive is logged. */
export class ApiSession {
  private token = '';
  readonly evidence: string[] = [];
  constructor(readonly identity: TestIdentity) {}

  async signIn(): Promise<void> {
    assertTestingSupabase();
    const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.identity.email, password: this.identity.password }),
    });
    this.evidence.push(`POST auth/token -> ${res.status}`);
    if (!res.ok) throw new Error(`sign-in failed with status ${res.status}`);
    this.token = (await res.json()).access_token;
  }

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    this.evidence.push(`${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '{id}')} -> ${res.status}`);
    return { status: res.status, body: json };
  }
  /**
   * A freshly registered owner's token has no clinic (tenant) claim yet: /auth/me reports session_refresh_required and
   * every clinic route answers 403 "No tenant_id in JWT token". The app fixes this in its clinic-entry handoff:
   * POST /auth/organizations/{org}/session-refresh, then a refreshed token. This does the same, then signs in again.
   * Returns true when the token now carries the clinic.
   */
  async reconcileTenantClaim(): Promise<boolean> {
    const me = (await this.get('/api/v1/auth/me')).body;
    if (!me?.session_refresh_required) return true;
    const org = me.effective_organization_id ?? me.organization_memberships?.[0]?.organization_id;
    if (!org) return false;
    const res = await this.post(`/api/v1/auth/organizations/${org}/session-refresh`);
    if (res.status >= 300) return false;
    await this.signIn();
    return !(await this.get('/api/v1/auth/me')).body?.session_refresh_required;
  }
  get = (p: string) => this.request('GET', p);
  post = (p: string, b?: unknown, h?: Record<string, string>) => this.request('POST', p, b, h);
}

/** Unauthenticated probe used for authorization checks. */
export const anonymous = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${config.apiBaseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return res.status;
};

/** Request body of POST /api/v1/auth/register-clinic-owner as built by the application's registration screen. */
export const registrationPayload = (i: TestIdentity, source: 'web' | 'play_store' = 'web') => ({
  email: i.email, password: i.password, full_name: i.fullName, phone: i.phone, tenant_name: i.clinicName, clinic_type: i.clinicType,
  business_profile: { business_name: i.clinicName },
  contact_details: {
    primary_contact: { name: i.fullName, phone: i.phone, email: i.email },
    clinic_address: { street: i.address.street, city: i.address.city, state: i.address.state, pincode: i.address.pin, country: 'India' },
  },
  app_context: { source, device_info: { platform: source === 'web' ? 'web' : 'android' }, urgency: 'within_week' },
});

/** True when the identity can already sign in (used to keep scenario re-runs from duplicating registrations). */
export const isRegistered = async (i: TestIdentity): Promise<boolean> => {
  try { await new ApiSession(i).signIn(); return true; } catch (e: any) {
    // Only "wrong or unknown credentials" (400/401) means not registered. A rate limit (429), a server error or a network
    // problem must surface: reporting it as "not registered" silently skips tests and could trigger a second registration.
    if (/status (400|401)\b/.test(String(e?.message))) return false;
    throw e;
  }
};
