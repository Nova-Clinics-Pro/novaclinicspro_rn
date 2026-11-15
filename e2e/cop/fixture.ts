import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ApiSession, isRegistered } from '../shared/api';
import { runDir } from '../shared/config';
import { identityFor } from '../shared/identities';
import type { ClinicType } from '../shared/types';
import type { SeedMap } from './seed';

/**
 * Every COP test title starts with its workbook ID, e.g. "TC_COP_RCP_004 doctor consultation is created".
 * After each test this fixture writes <run>/cop-results/<TC id>.json, which cop/sync_workbook.py copies into
 * COP_Test_Cases.xlsx (Status, Actual Result, Executed By / Date) and uses to draft rows in COP_Defects.xlsx.
 * Add "@known-gap" to the title for cases the workbook marks KNOWN GAP: they are expected to fail until fixed.
 */
export const CASE_ID = /TC_COP_[A-Z]{3}_\d{3}/;

export interface CopResult { caseId: string; status: 'Pass' | 'Fail' | 'Blocked'; actual: string; knownGap: boolean; durationMs: number; finishedAt: string; apiEvidence: string[] }

/** True when the named case passed earlier in this run: lets a dependent case skip with a reason instead of failing for the wrong cause. */
export const passedEarlier = (caseId: string): boolean => {
  try { return JSON.parse(fs.readFileSync(path.join(runDir(), 'cop-results', `${caseId}.json`), 'utf8')).status === 'Pass'; } catch { return false; }
};

export const readSeed = (): Record<string, SeedMap> | null => {
  const file = path.join(runDir(), 'cop-seed.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

export const test = base.extend<{ copCase: { api: ApiSession | null; evidence: string[] }; clinic: (t: ClinicType) => Promise<{ api: ApiSession; seed: SeedMap } | null> }>({
  copCase: [async ({}, use, testInfo) => {
    const state = { api: null as ApiSession | null, evidence: [] as string[] };
    const started = Date.now();
    await use(state);
    const id = testInfo.title.match(CASE_ID)?.[0];
    if (!id) return;
    const skipped = testInfo.status === 'skipped';
    const status = skipped ? 'Blocked' : testInfo.status === 'passed' ? 'Pass' : 'Fail';
    const skipNote = testInfo.annotations.find(a => a.type === 'skip' || a.type === 'blocked')?.description;
    // Cases written for another role but run with the clinic Owner's login (who holds the admin and front-desk permissions)
    // say so in the result, so a pass is never read as proof for the role the case names.
    const executedAs = testInfo.annotations.find(a => a.type === 'executed-as')?.description;
    const err = testInfo.error?.message?.split('\n').slice(0, 3).join(' ').replace(/\x1b\[[0-9;]*m/g, '').replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt>').slice(0, 400);
    const result: CopResult = {
      caseId: id, status,
      actual: `${executedAs ? `[executed as ${executedAs}] ` : ''}${status === 'Pass' ? 'As expected (automated).' : skipped ? `Not executed: ${skipNote ?? 'skipped'}` : `Failed: ${err}`}`,
      knownGap: /@known-gap/.test(testInfo.title), durationMs: Date.now() - started, finishedAt: new Date().toISOString(),
      apiEvidence: state.evidence.slice(-12),
    };
    const dir = path.join(runDir(), 'cop-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(result, null, 2));
  }, { auto: true }],

  /** Signed-in owner session for a seeded clinic, or null (the spec then skips with a reason). */
  clinic: async ({ copCase }, use) => {
    await use(async (clinicType: ClinicType) => {
      const seeds = readSeed();
      const seed = seeds?.[clinicType];
      const owner = identityFor('WEB', clinicType);
      if (!seed || !(await isRegistered(owner))) return null;
      const api = new ApiSession(owner);
      await api.signIn();
      copCase.api = api;
      return { api, seed };
    });
  },
});

export { expect };

/** Next weekday (Mon-Sat) at the given local time, `daysAhead` days out: keeps bookings inside operating hours. */
export const slot = (daysAhead: number, hh: number, mm = 0, minutes = 30) => {
  const d = new Date(); d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(hh, mm, 0, 0);
  const end = new Date(d.getTime() + minutes * 60_000);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:00`;
  return { start: iso(d), end: iso(end) };
};
