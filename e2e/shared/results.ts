import fs from 'node:fs';
import path from 'node:path';
import { config, runDir } from './config';
import type { ClinicType, Platform, ScenarioResult, Status, Track } from './types';

/** One JSON file per (platform, scenario, clinic type). Merged later by reporting/merge-results.ts. */
export const resultPath = (platform: Platform, scenarioId: string, clinicType: ClinicType | 'n/a' = 'n/a', key = 'result') =>
  path.join(runDir(), 'results', platform, `${scenarioId}${clinicType === 'n/a' ? '' : '.' + clinicType}.${key.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80)}.json`);

export const trackFor = (platform: Platform): ScenarioResult['track'] =>
  ({ web: 'WEB', android: 'MAESTRO', backend: 'BACKEND', 'manual-android': 'MANUAL' } as Record<Platform, ScenarioResult['track']>)[platform];

export function writeResult(partial: Partial<ScenarioResult> & Pick<ScenarioResult, 'scenarioId' | 'platform' | 'status' | 'expected' | 'actual'>, key = 'result'): ScenarioResult {
  const now = new Date().toISOString();
  const result: ScenarioResult = {
    runId: config.runId,
    track: trackFor(partial.platform),
    clinicType: 'n/a',
    role: 'n/a',
    startedAt: now,
    completedAt: now,
    evidence: { screenshots: [], traces: [], videos: [], apiEvidence: [], other: [] },
    ...partial,
  } as ScenarioResult;
  const file = resultPath(result.platform, result.scenarioId, result.clinicType, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  return result;
}

export const isStatus = (s: string): s is Status => ['Pass', 'Fail', 'Blocked', 'Not Applicable', 'Not Run'].includes(s);
export type { Track };
