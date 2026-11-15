/**
 * COP test-data seeder. Runs the steps of cop/seed-plan.ts in dependency order; a step runs only when every step it
 * depends on has completed and passed its own check.
 *
 *   npx tsx cop/seed.ts --plan                 print the ordered plan (no network)
 *   npx tsx cop/seed.ts                        dry run: reads the clinic, prints what each step would create
 *   npx tsx cop/seed.ts --apply                creates what is missing (idempotent: existing names are reused)
 *   npx tsx cop/seed.ts --apply --clinic ayurveda
 *   npx tsx cop/seed.ts --apply --with-logins  also gives staff a login (activation emails; needs approval)
 *
 * Safety:
 *  - Seeds only the synthetic NC-WEB-UAT-<run> owner clinics made by NC-UAT-02; refuses any other clinic name.
 *  - Refuses a non-local API unless NC_ALLOW_REMOTE_API=1 (the UAT backend runs locally against the Testing project).
 *  - Writes ids (never tokens or passwords) to <run>/cop-seed.json for the specs.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ApiSession, isRegistered } from '../shared/api';
import { config, runDir } from '../shared/config';
import { identityFor } from '../shared/identities';
import type { ClinicType } from '../shared/types';
import { INVENTORY, OPERATING_HOURS, PATIENTS, ROOMS, STAFF, TREATMENTS, USABLES } from './seed-data';
import { orderPlan, type SeedStep } from './seed-plan';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const WITH_LOGINS = args.includes('--with-logins');
const only = args.includes('--clinic') ? (args[args.indexOf('--clinic') + 1] as ClinicType) : undefined;
const log = (m: string) => console.log(m);
const items = (b: any): any[] => (Array.isArray(b) ? b : b?.items ?? b?.data ?? b?.results ?? []);

export interface SeedMap {
  tenantId: string; clinicType: ClinicType; categoryCode: string;
  rules: { genderMatching: boolean; therapyEnabled: boolean };
  rooms: Record<string, string>; staff: Record<string, string>; treatments: Record<string, string>;
  inventory: Record<string, string>; patients: Record<string, string>;
}

if (args.includes('--plan')) {
  for (const s of orderPlan()) {
    log(`${s.id}  ${s.title}${s.seeded ? '' : '   [created by test cases]'}`);
    log(`      needs: ${s.dependsOn.join(', ') || '-'}   method: ${s.method}`);
    log(`      why:   ${s.appRule}`);
    log(`      check: ${s.verify}`);
  }
  process.exit(0);
}

interface Ctx { api: ApiSession; base: string; map: SeedMap; owner: ReturnType<typeof identityFor>; clinicName: string }
type Runner = (c: Ctx) => Promise<boolean>; // true = step done and its check passed

const list = async (c: Ctx, p: string, q = '') => items((await c.api.get(`${c.base}/${p}?limit=500${q}`)).body);

/** Create the record unless one with the same name already exists; returns false when a create fails. */
async function ensure(c: Ctx, label: string, listPath: string, exists: (x: any) => boolean, body: any, into: Record<string, string>, key: string): Promise<boolean> {
  const found = (await list(c, listPath)).find(exists);
  if (found) { into[key] = found.id; log(`    = ${label} ${key}`); return true; }
  if (!APPLY) { log(`    + ${label} ${key} (would create)`); return true; }
  const res = await c.api.post(`${c.base}/${listPath}`, body);
  if (res.status >= 300) { log(`    ! ${label} ${key}: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`); return false; }
  into[key] = res.body.id ?? res.body.data?.id;
  log(`    + ${label} ${key}`);
  return true;
}
const allOk = async (xs: Promise<boolean>[]) => (await Promise.all(xs)).every(Boolean);
const seq = async (fs_: (() => Promise<boolean>)[]) => { let ok = true; for (const f of fs_) ok = (await f()) && ok; return ok; };

/** Re-read check: every wanted record is present and, where the API returns the field, has the wanted value. */
function sameField(have: any[], want: readonly any[], nameKey: string, field: string, label: string): boolean {
  let ok = true;
  for (const w of want) {
    const wantName = w[nameKey] ?? w.full_name;
    const h = have.find(x => (x.name ?? x.full_name) === wantName);
    if (!h) { log(`    ! check: ${label} ${wantName} not found`); ok = false; continue; }
    if (h[field] !== undefined && h[field] !== w[field]) { log(`    ! check: ${label} ${wantName} has ${field}=${h[field]}, wanted ${w[field]}`); ok = false; }
  }
  return ok;
}

const RUN: Record<string, Runner> = {
  S01: async c => {
    if (!/^NC-[A-Z]+-UAT-/.test(c.clinicName) || !c.map.tenantId) return false;
    const me = (await c.api.get('/api/v1/auth/me')).body;
    if (me?.session_refresh_required) {
      if (!APPLY) { log('    owner token has no clinic claim yet (would reconcile like the app does)'); return true; }
      if (!(await c.api.reconcileTenantClaim())) { log('    ! could not reconcile the clinic claim'); return false; }
      log('    clinic claim reconciled (session-refresh, new token)');
    }
    const probe = await c.api.get(`${c.base}/rooms?limit=1`);
    if (probe.status !== 200) { log(`    ! clinic-scoped call answered ${probe.status}`); return false; }
    return true;
  },
  S02: async c => {
    const f = await c.api.get(`/api/v1/tenants/${c.map.tenantId}/features`);
    if (f.status !== 200) return false;
    c.map.rules = { genderMatching: !!f.body?.appointments?.enable_gender_matching, therapyEnabled: !!f.body?.treatment_sheets?.enable_treatment_sheets || (f.body?.appointments?.multiday_appointment_types?.length ?? 0) > 0 };
    log(`    clinic rules: gender matching ${c.map.rules.genderMatching ? 'on' : 'off'}, therapy ${c.map.rules.therapyEnabled ? 'on' : 'off'}`);
    return true;
  },
  S03: async c => {
    if (APPLY) for (const h of OPERATING_HOURS) {
      const body: any = { ...h }; for (const k of ['open_time', 'close_time', 'break_start', 'break_end']) if (!body[k]) delete body[k];
      const r = await c.api.post(`${c.base}/operating-hours`, body);
      if (r.status >= 300 && r.status !== 409) { log(`    ! hours day ${h.day_of_week}: ${r.status}`); return false; }
    } else log('    + operating hours (would apply, 7 days)');
    return !APPLY || (await list(c, 'operating-hours')).length >= 7;
  },
  S04: async c => {
    const ok = await seq(ROOMS.map(r => () => ensure(c, 'room', 'rooms', x => x.name === r.name, { name: r.name, room_type: r.room_type, capacity: r.capacity }, c.map.rooms, r.key)));
    return ok && (!APPLY || sameField(await list(c, 'rooms'), ROOMS, 'name', 'room_type', 'room'));
  },
  S05: async c => {
    const ok = await seq(STAFF.map(s => () => {
      const { key, ...rest } = s as any;
      return ensure(c, 'staff', 'staff', x => (x.full_name ?? x.name) === s.full_name,
        { ...rest, requires_login: WITH_LOGINS, ...(WITH_LOGINS ? { email: `cop-${key.toLowerCase()}-${c.owner.runId}@${config.emailDomain}` } : {}) }, c.map.staff, key);
    }));
    return ok && (!APPLY || sameField(await list(c, 'staff'), STAFF.map(s => ({ name: s.full_name, staff_type: s.staff_type })), 'name', 'staff_type', 'staff'));
  },
  S06: async c => {
    const cats = items((await c.api.get('/api/v1/clinic/treatment-categories')).body);
    const want = c.map.clinicType === 'ayurveda' ? 'therapy' : 'general';
    if (!cats.some((x: any) => x.code === want)) { log(`    ! category ${want} is not active (have: ${cats.map((x: any) => x.code).join(', ')})`); return false; }
    c.map.categoryCode = want; log(`    category: ${want}`); return true;
  },
  S07: c => seq(TREATMENTS.map(t => () => ensure(c, 'treatment', 'treatments', x => x.code === t.code, { ...t, category_code: c.map.categoryCode }, c.map.treatments, t.code))),
  S08: c => seq(INVENTORY.map(i => () => ensure(c, 'inventory', 'inventory', x => x.name === i.name, { ...i, location: {} }, c.map.inventory, i.name))),
  S09: async c => {
    for (const u of USABLES) {
      const tid = c.map.treatments[u.treatment], iid = c.map.inventory[u.inventory];
      if (!tid || !iid) { if (APPLY) { log(`    ! usable ${u.material_name}: treatment or stock item missing`); return false; } log(`    + usable ${u.material_name} (would create)`); continue; }
      const have = items((await c.api.get(`${c.base}/therapy-usables?treatment_id=${tid}`)).body).find((x: any) => x.material_name === u.material_name);
      if (have) { log(`    = usable ${u.material_name}`); continue; }
      if (!APPLY) { log(`    + usable ${u.material_name} (would create)`); continue; }
      const r = await c.api.post(`${c.base}/therapy-usables`, { treatment_id: tid, inventory_item_id: iid, material_name: u.material_name, standard_quantity: u.standard_quantity, unit: u.unit, ml_per_unit: u.ml_per_unit, category: u.category });
      if (r.status >= 300) { log(`    ! usable ${u.material_name}: ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`); return false; }
      log(`    + usable ${u.material_name}`);
    }
    return true;
  },
  S11: async c => {
    if (!APPLY) { log('    + workspace preparation (would start and wait)'); return true; }
    const start = await c.api.post(`/api/v1/onboarding/${c.map.tenantId}/workspace-preparation`, { contract_version: 'workspace_preparation_v1' });
    if (start.status >= 300) { log(`    ! start: ${start.status} ${JSON.stringify(start.body)?.slice(0, 200)}`); return false; }
    for (let i = 0; i < 40; i++) {
      const r = await c.api.get(`/api/v1/onboarding/${c.map.tenantId}/workspace-preparation`);
      const st = r.body?.state;
      if (st === 'PERSONALIZATION_AVAILABLE') { log('    workspace prepared'); return true; }
      if (st === 'TERMINAL_FAILURE' || st === 'RETRYABLE_FAILURE') { log(`    ! preparation ${st}: ${r.body?.reason_code ?? ''}`); return false; }
      await new Promise(res => setTimeout(res, 3000));
    }
    log('    ! preparation did not finish within 2 minutes'); return false;
  },
  S12: async c => {
    const url = `/api/v1/onboarding/${c.map.tenantId}/commercial-trial`;
    let t = await c.api.get(url);
    if (t.status === 200 && t.body?.state === 'ACTIVE') { log('    = trial already active'); return true; }
    if (!APPLY) { log(`    + trial activation (would run; current: ${t.status === 200 ? t.body?.state : 'no trial record yet'})`); return true; }
    // First activation: there is no record yet and the server establishes eligibility in the same command (aggregate_version
    // omitted). A record that already exists needs the version from the read (optimistic concurrency).
    const body: any = { confirmed: true };
    if (t.status === 200) { body.contract_version = t.body.contract_version; body.aggregate_version = t.body.aggregate_version; }
    else if (t.status !== 404) { log(`    ! trial read answered ${t.status}`); return false; }
    const act = await c.api.post(`${url}/activate`, body, { 'Idempotency-Key': `nc-cop-${crypto.randomUUID()}` });
    if (act.status >= 300) { log(`    ! activate: ${act.status} ${JSON.stringify(act.body)?.slice(0, 200)}`); return false; }
    t = await c.api.get(url);
    const ok = t.body?.state === 'ACTIVE' && new Date(t.body.expires_at).getTime() > Date.now();
    log(`    trial ${t.body?.state}, expires ${String(t.body?.expires_at).slice(0, 10)}`);
    return ok;
  },
  S10: c => seq(PATIENTS.map(p => () => { const { key, ...rest } = p as any; return ensure(c, 'patient', 'clients', x => x.full_name === p.full_name, rest, c.map.patients, key); })),
};

async function seedClinic(clinicType: ClinicType): Promise<SeedMap | null> {
  const owner = identityFor('WEB', clinicType);
  if (!(await isRegistered(owner))) { log(`[${clinicType}] owner not registered (run NC-UAT-02 first); skipped`); return null; }
  const api = new ApiSession(owner); await api.signIn();
  const me = await api.get('/api/v1/auth/me');
  const tenantId: string = me.body.tenant_id;
  const clinicName: string = (await api.get(`/api/v1/tenants/${tenantId}`)).body?.name ?? owner.clinicName;
  log(`[${clinicType}] ${clinicName} (${tenantId.slice(0, 8)}…) ${APPLY ? 'APPLY' : 'dry run'}`);
  const c: Ctx = { api, owner, clinicName, base: `/api/v1/clinic/${tenantId}`,
    map: { tenantId, clinicType, categoryCode: '', rules: { genderMatching: false, therapyEnabled: false }, rooms: {}, staff: {}, treatments: {}, inventory: {}, patients: {} } };

  const passed = new Set<string>();
  for (const step of orderPlan() as SeedStep[]) {
    if (!step.seeded) { log(`  ${step.id} ${step.title}: ${step.method === 'API + approval' ? 'needs the owner\'s approval (--with-logins)' : 'created by test cases'}`); continue; }
    const missing = step.dependsOn.filter(d => !passed.has(d) && PLAN_SEEDED(d));
    if (missing.length) { log(`  ${step.id} ${step.title}: SKIPPED, needs ${missing.join(', ')}`); continue; }
    log(`  ${step.id} ${step.title}`);
    if (await RUN[step.id](c)) passed.add(step.id); else log(`    -> ${step.id} did not pass; steps that need it are skipped`);
  }
  return c.map;
}
const PLAN_SEEDED = (id: string) => orderPlan().find(s => s.id === id)?.seeded ?? false;

(async () => {
  if (!/localhost|127\.0\.0\.1/.test(config.apiBaseUrl) && process.env.NC_ALLOW_REMOTE_API !== '1') throw new Error(`API ${config.apiBaseUrl} is not local; set NC_ALLOW_REMOTE_API=1 only for a non-production backend`);
  orderPlan(); // throws on a broken plan before anything is touched
  const out: Record<string, SeedMap> = {};
  for (const t of (only ? [only] : ['ayurveda', 'general']) as ClinicType[]) { const m = await seedClinic(t); if (m) out[t] = m; }
  if (APPLY) {
    const file = path.join(runDir(), 'cop-seed.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Merge: a single-clinic run (--clinic) must not erase the other clinic's ids.
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, JSON.stringify({ ...previous, ...out }, null, 2));
    log(`ids written to ${file}`);
  } else log('Dry run only. Re-run with --apply to create the records.');
})().catch(e => { console.error(String(e.message ?? e)); process.exit(1); });
