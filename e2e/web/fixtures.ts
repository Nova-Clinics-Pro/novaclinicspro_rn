import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import scenarios from '../scenarios/scenarios.json';
import { config, runDir } from '../shared/config';
import { writeResult } from '../shared/results';
import type { ClinicType, Platform, ScenarioSpec, Status } from '../shared/types';

export const scenarioSpecs = scenarios as unknown as ScenarioSpec[];
export const specOf = (id: string) => {
  const s = scenarioSpecs.find(x => x.id === id);
  if (!s) throw new Error(`unknown scenario ${id}`);
  return s;
};

/** Browser-side diagnostics collected for every test (console errors, page errors, failed or 5xx API calls). */
export interface Diagnostics { consoleErrors: string[]; pageErrors: string[]; failedRequests: string[]; serverErrors: string[] }

const redact = (s: string) => s.replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, '$1<redacted>').replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<jwt>').slice(0, 300);

export const test = base.extend<{ diagnostics: Diagnostics; evidence: { shot: (name: string) => Promise<string> }; scenario: { id: string; clinicType: ClinicType | 'n/a'; role: string; platform?: Platform } }>({
  scenario: [{ id: 'unset', clinicType: 'n/a', role: 'n/a' }, { option: true }],
  diagnostics: async ({ page }, use) => {
    const d: Diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [], serverErrors: [] };
    page.on('console', m => { if (m.type() === 'error') d.consoleErrors.push(redact(m.text())); });
    page.on('pageerror', e => d.pageErrors.push(redact(String(e))));
    page.on('requestfailed', r => { if (!r.url().includes('/hot') && !r.url().includes('favicon')) d.failedRequests.push(`${r.method()} ${new URL(r.url()).pathname} ${r.failure()?.errorText ?? ''}`); });
    page.on('response', r => { if (r.status() >= 500) d.serverErrors.push(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`); });
    await use(d);
  },
  evidence: async ({ page }, use, testInfo) => {
    const dir = path.join(runDir(), 'web', 'evidence');
    fs.mkdirSync(dir, { recursive: true });
    const shot = async (name: string) => {
      const file = path.join(dir, `${testInfo.title.replace(/[^A-Za-z0-9._-]+/g, '_')}__${name}.png`);
      await page.screenshot({ path: file, fullPage: false }).catch(() => undefined);
      return path.relative(runDir(), file);
    };
    await use({ shot });
  },
});

const startedAt = new WeakMap<object, number>();
test.beforeEach(async ({}, testInfo) => { startedAt.set(testInfo, Date.now()); });

/** Writes the shared-contract result for the scenario after each test. */
test.afterEach(async ({ page, diagnostics, evidence, scenario }, testInfo) => {
  const spec = specOf(scenario.id);
  const shotRef = await evidence.shot('final');
  const skipped = testInfo.status === 'skipped';
  const testTitle = testInfo.title;
  void testTitle;
  const passed = testInfo.status === 'passed';
  const status: Status = skipped ? 'Blocked' : passed ? 'Pass' : 'Fail';
  const skipNote = testInfo.annotations.find(a => a.type === 'skip' || a.type === 'blocked')?.description;
  const traces = testInfo.attachments.filter(a => a.name === 'trace').map(a => path.relative(runDir(), a.path ?? ''));
  const videos = testInfo.attachments.filter(a => a.name === 'video').map(a => path.relative(runDir(), a.path ?? ''));
  const err = testInfo.error?.message ? redact(testInfo.error.message.split('\n').slice(0, 4).join(' ')) : '';
  writeResult({
    scenarioId: scenario.id, platform: scenario.platform ?? 'web', clinicType: scenario.clinicType, role: scenario.role, status,
    startedAt: new Date(startedAt.get(testInfo) ?? Date.now()).toISOString(), completedAt: new Date().toISOString(),
    expected: spec.expectedOutcomes.join(' | '),
    actual: passed ? `[${testInfo.title}] As expected. Diagnostics: ${diagnostics.pageErrors.length} page errors, ${diagnostics.serverErrors.length} 5xx API responses, ${diagnostics.consoleErrors.length} console errors.` : skipped ? `[${testInfo.title}] Not executed: ${skipNote ?? 'skipped'}` : `[${testInfo.title}] Failed: ${err}`,
    evidence: { screenshots: [shotRef], traces, videos, apiEvidence: [], other: [`console errors: ${diagnostics.consoleErrors.length}`, ...diagnostics.serverErrors.slice(0, 5)] },
    ...(status === 'Fail' ? { severity: spec.severityIfFails, reproduction: [`Run: npm run web -- --grep "${scenario.id}"`, `Test: ${testInfo.title}`] } : {}),
    ...(skipped ? { limitation: { exact: skipNote ?? 'skipped', alternative: 'See platform applicability note', manualRequired: true } } : {}),
  }, testInfo.title);
});

export { expect, config };
export type { Page };
