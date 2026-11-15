import { test } from '../../../cop/fixture';

/**
 * COP cases that cannot be executed, with the reason, so the workbook shows "Blocked" instead of "Not Run".
 * Only genuine blockers are listed. A case that is merely not automated yet is left as "Not Run".
 */
const BLOCKED: [string, string][] = [
  ['CNF_014', 'needs two Receptionist logins; only one exists (each extra login needs an Auth user and a staff link)'],
  ['OWN_015', 'needs one login that belongs to two clinics; the test logins each belong to one'],
  ['DSH_004', 'blocked by a defect: invoice and payment creation answer 500 (see TC_COP_ADM_014), so no payment can be recorded'],
];

for (const [id, reason] of BLOCKED) {
  test(`TC_COP_${id} not executed: ${reason.slice(0, 70)}`, async () => { test.skip(true, reason); });
}
