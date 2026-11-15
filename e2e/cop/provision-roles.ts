/**
 * Creates one staff member WITH a login per role in the seeded Ayurveda clinic, through the app's own API
 * (POST /clinic/{tenant}/staff, requires_login=true), exactly as the owner's Add Staff form does.
 *
 *   NC_RUN_ID=<run> python3 cop/uat_env.py npx tsx cop/provision-roles.ts
 *
 * Each login makes a hosted Auth user and sends one activation email to a synthetic address, and the auth provider's
 * email sender is rate limited: the script stops at the first failure and keeps what was created. It writes
 * <run>/role-identities.json (mode 600, gitignored) with a generated password per role. It does NOT set the password:
 * the invitation goes to a mailbox nobody reads, so the password is set afterwards with the operator's admin helper
 * (see README). Roles that already exist are skipped.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ApiSession } from '../shared/api';
import { assertTestingSupabase, config, runDir } from '../shared/config';
import { identityFor } from '../shared/identities';

export interface RoleIdentity { role: string; staffType: string; email: string; password: string; fullName: string; staffId?: string; passwordSet: boolean }

const ROLES = [
  { role: 'admin', staffType: 'admin', gender: 'female', phone: '+919000000401' },
  { role: 'receptionist', staffType: 'receptionist', gender: 'female', phone: '+919000000402' },
  { role: 'doctor', staffType: 'doctor', gender: 'male', phone: '+919000000403', consultation_fee: '500', qualification: 'BAMS' },
  { role: 'therapist', staffType: 'therapist', gender: 'female', phone: '+919000000404', hourly_rate: '300' },
] as const;

const file = () => path.join(runDir(), 'role-identities.json');
export const readRoleIdentities = (): Record<string, RoleIdentity> => (fs.existsSync(file()) ? JSON.parse(fs.readFileSync(file(), 'utf8')) : {});

if (require.main === module || process.argv[1]?.endsWith('provision-roles.ts')) (async () => {
  assertTestingSupabase();
  const owner = new ApiSession(identityFor('WEB', 'ayurveda'));
  await owner.signIn();
  if (!(await owner.reconcileTenantClaim())) throw new Error('owner token has no clinic claim');
  const me = await owner.get('/api/v1/auth/me');
  const tenantId = me.body?.tenant_id as string;
  if (!tenantId) throw new Error(`/auth/me answered ${me.status} without a clinic: ${JSON.stringify(me.body).slice(0, 160)}`);
  const identities = readRoleIdentities();

  for (const r of ROLES) {
    if (identities[r.role]?.staffId) { console.log(`[${r.role}] already provisioned`); continue; }
    // NC_ROLE_EMAIL_BASE (e.g. name@gmail.com) gives name+cop-<role>@gmail.com. The auth provider refuses reserved domains
    // such as example.com for a login, so a real mailbox is needed; otherwise the synthetic domain is used.
    const base = process.env.NC_ROLE_EMAIL_BASE;
    const email = base ? base.replace('@', `+cop-${r.role}@`) : `cop-login-${r.role}-${config.runId}@${config.emailDomain}`;
    // The operator may supply one password for all roles through a private file (NC_ROLE_PASSWORD_FILE); never an env value,
    // never printed. Otherwise a random one is generated.
    const pwFile = process.env.NC_ROLE_PASSWORD_FILE;
    const password = pwFile && fs.existsSync(pwFile) ? fs.readFileSync(pwFile, 'utf8').replace(/\n$/, '') : `Nc!${crypto.randomBytes(9).toString('base64url')}9a`;
    const { role, staffType, ...rest } = r as any;
    // A login that already has an Auth account (created through the admin API with its password, so no sign-up email is
    // sent): record the organisation user, then let the staff flow link it ("existing user" path: no Auth user, no email).
    const authIds: Record<string, string> = process.env.NC_ROLE_AUTH_IDS_FILE && fs.existsSync(process.env.NC_ROLE_AUTH_IDS_FILE) ? JSON.parse(fs.readFileSync(process.env.NC_ROLE_AUTH_IDS_FILE, 'utf8')) : {};
    if (authIds[r.role]) {
      const org = await owner.post('/api/v1/org/users', { email, full_name: `COP Login ${role[0].toUpperCase()}${role.slice(1)}`, phone: r.phone, auth_provider: 'supabase', auth_user_id: authIds[r.role] });
      console.log(`[${r.role}] record organisation user -> ${org.status}${org.status >= 300 ? ' ' + JSON.stringify(org.body?.detail ?? org.body).slice(0, 200) : ''}`);
      if (org.status >= 300 && org.status !== 400) { console.log('stopping'); break; }
    }
    const res = await owner.post(`/api/v1/clinic/${tenantId}/staff`, { full_name: `COP Login ${role[0].toUpperCase()}${role.slice(1)}`, staff_type: staffType, requires_login: true, email, ...rest });
    console.log(`[${r.role}] create staff with login -> ${res.status}${res.status >= 300 ? ' ' + JSON.stringify(res.body?.detail ?? res.body).slice(0, 220) : ''}`);
    if (res.status >= 300) { console.log('stopping: fix the cause (often the email rate limit) before creating more logins'); break; }
    identities[r.role] = { role: r.role, staffType, email, password, fullName: res.body.full_name ?? `COP Login ${role}`, staffId: res.body.id, passwordSet: !!authIds[r.role] };
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(identities, null, 2), { mode: 0o600 });
  }
  console.log(`role identities: ${Object.keys(identities).join(', ') || 'none'} -> ${file()}`);
})().catch(e => { console.error(String(e.message ?? e)); process.exit(1); });
