import crypto from 'node:crypto';
import type { TestIdentity } from './identities';

/** Synthetic, non-sensitive record factories. All names carry the run label so records are attributable. */
export const patientFor = (owner: TestIdentity, n = 1) => ({
  name: `${owner.label} Patient ${n}`,
  phone: `+9180${String(parseInt(crypto.createHash('sha1').update(owner.email + n).digest('hex').slice(0, 7), 16) % 100000000).padStart(8, '0')}`,
  email: `patient${n}-${owner.label.toLowerCase()}@${owner.email.split('@')[1]}`,
});

/** Base date used by scheduling scenarios: next weekday, 09:00 local, so runs are repeatable. */
export const scheduleBase = (daysAhead = 2): Date => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(9, 0, 0, 0);
  return d;
};
export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
