/** Writes SEED-PLAN.md from cop/seed-plan.ts, so the document and the seeder cannot disagree. Usage: npx tsx cop/plan-to-md.ts [out.md] */
import fs from 'node:fs';
import { orderPlan } from './seed-plan';

const rows = orderPlan();
const md = [
  '# COP seed plan: steps in the order the app requires',
  '',
  'Generated from `e2e/cop/seed-plan.ts`. A step runs only when every step it needs has finished and passed its check. Steps marked *test cases* are not created by the seeder: the workbook cases create them because they are the behaviour under test.',
  '',
  '| Step | What | Needs | How | Creates | Why this order (rule in the app) | Seeder check | Cases it unlocks |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map(s => `| ${s.id} | ${s.title}${s.seeded ? '' : ' *(test cases)*'} | ${s.dependsOn.join(', ') || '-'} | ${s.method} | ${s.creates} | ${s.appRule} | ${s.verify} | ${s.unlocks.join(', ')} |`),
  '',
].join('\n');
const out = process.argv[2];
if (out) fs.writeFileSync(out, md); else console.log(md);
