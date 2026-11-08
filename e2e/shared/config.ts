import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const E2E_ROOT = path.resolve(__dirname, '..');

/** Parses KEY=VALUE lines without logging them. */
const parseEnvFile = (file: string): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
};

const frontendEnv = parseEnvFile(path.join(os.homedir(), '.novaclinics-local', 'frontend', '.env'));

export const config = {
  /** Expo Web dev server dedicated to automation (8083); 8081 stays reserved for the physical Android device. */
  webBaseUrl: process.env.NC_WEB_BASE_URL ?? 'http://localhost:8083',
  /**
   * Backend under test. Resolution order: NC_API_BASE_URL, then EXPO_PUBLIC_API_BASE_URL from the isolated UAT
   * config (~/.novaclinics-local/frontend/.env, the file the web build under test is started with, so the
   * browser and these direct API calls cannot disagree), then a local default. The scenarios are stateful and
   * create records: only point this at a non-production backend.
   */
  apiBaseUrl: process.env.NC_API_BASE_URL ?? (frontendEnv.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000'),
  /** Public Supabase values used by the app itself (anon key is shipped in the app bundle). */
  supabaseUrl: process.env.NC_SUPABASE_URL ?? frontendEnv.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NC_SUPABASE_ANON_KEY ?? frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Synthetic address domain for test identities; never a real mailbox. */
  emailDomain: process.env.NC_EMAIL_DOMAIN ?? 'nova-uat.example.com',
  runId: process.env.NC_RUN_ID ?? defaultRunId(),
  resultsRoot: process.env.NC_RESULTS_ROOT ?? path.join(E2E_ROOT, 'results'),
};

function defaultRunId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

export const runDir = (runId = config.runId) => path.join(config.resultsRoot, runId);
