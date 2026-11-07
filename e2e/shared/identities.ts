import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config, runDir } from './config';
import type { ClinicType, Track } from './types';

/**
 * Test identity naming (isolation between the three tracks):
 *   NC-WEB-UAT-<run>      Playwright
 *   NC-MAESTRO-UAT-<run>  automated Android
 *   NC-ANDROID-UAT-<run>  manual Android (documented here, created by the human tester)
 * Each track gets its own Ayurveda and General owner/clinic so no mutable record is shared.
 */
export interface TestIdentity {
  track: Track;
  clinicType: ClinicType;
  runId: string;
  label: string; // NC-WEB-UAT-<run>
  fullName: string;
  email: string;
  phone: string;
  clinicName: string;
  password: string; // synthetic, per run, never reported
  address: { street: string; city: string; state: string; pin: string };
}

const phoneFor = (seed: string) => `+9190${String(parseInt(crypto.createHash('sha1').update(seed).digest('hex').slice(0, 7), 16) % 100000000).padStart(8, '0')}`;

export const identityFor = (track: Track, clinicType: ClinicType, runId = config.runId): TestIdentity => {
  const label = `NC-${track}-UAT-${runId}`;
  const slug = `nc-${track.toLowerCase()}-uat-${runId}-${clinicType}`;
  const stateFile = path.join(runDir(runId), 'identities.json');
  let store: Record<string, TestIdentity> = {};
  if (fs.existsSync(stateFile)) store = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (store[slug]) return store[slug];
  const identity: TestIdentity = {
    track, clinicType, runId, label,
    fullName: `${label} ${clinicType === 'ayurveda' ? 'Ayurveda' : 'General'} Owner`,
    email: `${slug}@${config.emailDomain}`,
    phone: phoneFor(slug),
    clinicName: `${label} ${clinicType === 'ayurveda' ? 'Ayurveda' : 'General'} Clinic`,
    password: `Nc!${crypto.randomBytes(9).toString('base64url')}9a`,
    address: { street: '1 Synthetic Test Street', city: 'Pune', state: 'Maharashtra', pin: '411001' },
  };
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  store[slug] = identity;
  fs.writeFileSync(stateFile, JSON.stringify(store, null, 2), { mode: 0o600 });
  return identity;
};

/** Safe-to-report view: never includes the password. */
export const redactIdentity = (i: TestIdentity) => ({ track: i.track, clinicType: i.clinicType, label: i.label, email: i.email, clinicName: i.clinicName });
