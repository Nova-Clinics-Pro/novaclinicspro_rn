/**
 * Registers the synthetic clinic owners the seeder needs (step S01), through the same API call the app's
 * registration screen makes (POST /auth/register-clinic-owner with an Idempotency-Key). Idempotent: an owner who can
 * already sign in is left alone. Only runs against the Testing project (assertTestingSupabase).
 *
 *   NC_RUN_ID=<run> python3 cop/uat_env.py npx tsx cop/register-owners.ts [--clinic ayurveda|general]
 */
import crypto from 'node:crypto';
import { ApiSession, isRegistered, registrationPayload } from '../shared/api';
import { assertTestingSupabase, config } from '../shared/config';
import { identityFor } from '../shared/identities';
import type { ClinicType } from '../shared/types';

const args = process.argv.slice(2);
const only = args.includes('--clinic') ? (args[args.indexOf('--clinic') + 1] as ClinicType) : undefined;

(async () => {
  assertTestingSupabase();
  if (!/localhost|127\.0\.0\.1/.test(config.apiBaseUrl)) throw new Error(`API ${config.apiBaseUrl} is not local`);
  for (const t of (only ? [only] : ['ayurveda', 'general']) as ClinicType[]) {
    const owner = identityFor('WEB', t);
    if (await isRegistered(owner)) { console.log(`[${t}] ${owner.label}: already registered, signs in`); }
    else {
      const res = await fetch(`${config.apiBaseUrl}/api/v1/auth/register-clinic-owner`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `nc-cop-${crypto.randomUUID()}` }, body: JSON.stringify(registrationPayload(owner)),
      });
      const body: any = await res.json().catch(() => ({}));
      console.log(`[${t}] register -> ${res.status}${res.status >= 300 ? ' ' + JSON.stringify(body.detail ?? body).slice(0, 200) : ''}`);
      if (res.status >= 300) continue;
    }
    try {
      const api = new ApiSession(owner); await api.signIn();
      const me = await api.get('/api/v1/auth/me');
      console.log(`[${t}] sign-in ok; me -> ${me.status}; tenant ${me.body?.tenant_id ? String(me.body.tenant_id).slice(0, 8) + '…' : 'NOT YET'}`);
      const st = await api.get('/api/v1/auth/registration-status/me');
      console.log(`[${t}] registration status: ${st.body?.status ?? st.status}`);
    } catch (e: any) { console.log(`[${t}] sign-in failed: ${String(e.message).slice(0, 120)}`); }
  }
})().catch(e => { console.error(String(e.message ?? e)); process.exit(1); });
