import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(__dirname, '../..');
const repositoryRoot = resolve(packageRoot, '..');
const scanner = join(packageRoot, 'scripts/check-cp-boundaries.mjs');
const baselinePath = join(packageRoot, 'scripts/cp-boundary-baseline.json');

type Observation = {
  fingerprint: string;
  line: number;
  path: string;
  rule_id: string;
  symbol: string;
};

type Baseline = {
  entries: {
    fingerprints: string[];
    id: string;
    max_count: number;
    path: string;
    rule_id: string;
  }[];
  policy: string;
  repository: string;
  retired_fingerprints: string[];
  schema_version: number;
};

function fixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), 'cp-frontend-boundary-'));
}

function write(root: string, relativePath: string, contents: string): string {
  const filename = join(root, relativePath);
  mkdirSync(dirname(filename), { recursive: true });
  writeFileSync(filename, contents, 'utf8');
  return filename;
}

function scan(root: string): Observation[] {
  const expression = [
    `import(${JSON.stringify(scanner)})`,
    `.then(module => console.log(JSON.stringify(module.scan(${JSON.stringify(root)}))))`,
  ].join('');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', expression], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout) as Observation[];
}

function baselineFor(root: string): Baseline {
  const groups = new Map<string, Observation[]>();
  for (const item of scan(root)) {
    const key = `${item.rule_id}\0${item.path}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return {
    entries: [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, items], index) => {
        const [rule_id, path] = key.split('\0');
        return {
          fingerprints: items.map((item) => item.fingerprint).sort(),
          id: `FIX-${String(index + 1).padStart(3, '0')}`,
          max_count: items.length,
          path,
          rule_id,
        };
      }),
    policy: 'legacy-baseline-with-ratchet',
    repository: 'frontend',
    retired_fingerprints: [],
    schema_version: 1,
  };
}

function writeBaseline(root: string, baseline: Baseline): string {
  return write(root, 'baseline.json', JSON.stringify(baseline));
}

function runGuard(root = repositoryRoot, baseline = baselinePath) {
  const result = spawnSync(
    process.execPath,
    [scanner, '--check', '--root', root, '--baseline', baseline],
    { encoding: 'utf8' },
  );
  return {
    ...result,
    report: JSON.parse(result.stdout) as Record<string, unknown>,
  };
}

function protectedFile(root: string, contents: string): string {
  return write(root, 'frontend/features/commercial-platform/domain/sample.ts', contents);
}

describe('CP frontend boundary guard', () => {
  it('matches the corrected reviewed non-vacuous baseline', () => {
    const result = runGuard();

    expect(result.status).toBe(0);
    expect(result.report).toMatchObject({
      status: 'pass',
      observation_count: 11,
      counts: {
        'frontend.forbidden_import': 1,
        'frontend.ui_technical_terminology': 5,
        'frontend.ui_technical_terminology.clinic_entry': 1,
        'frontend.ui_technical_terminology.organization_admin': 4,
      },
    });
  });

  it('accepts generic imports in protected core', () => {
    const root = fixtureRoot();
    protectedFile(root, "import type { Decimal } from './decimal';\ntenantId: string;\n");
    const baseline = writeBaseline(root, baselineFor(root));

    expect(runGuard(root, baseline).status).toBe(0);
  });

  it('accepts transport imports in a datasource adapter', () => {
    const root = fixtureRoot();
    protectedFile(root, 'tenantId: string;\n');
    write(
      root,
      'frontend/features/commercial-platform/data/datasources/commercial.api.ts',
      "import axios from 'axios';\nexport const client = axios;\n",
    );
    const baseline = writeBaseline(root, baselineFor(root));

    expect(runGuard(root, baseline).status).toBe(0);
  });

  it('rejects a new forbidden import', () => {
    const root = fixtureRoot();
    const filename = protectedFile(root, 'tenantId: string;\n');
    const baseline = writeBaseline(root, baselineFor(root));
    writeFileSync(filename, "import React from 'react';\ntenantId: string;\n", 'utf8');

    expect(runGuard(root, baseline).report).toMatchObject({ status: 'fail' });
  });

  it('rejects count growth and accepts reductions', () => {
    const root = fixtureRoot();
    const filename = protectedFile(root, 'tenantId: string;\norganizationId: string;\n');
    const original = baselineFor(root);
    const baseline = writeBaseline(root, original);
    writeFileSync(filename, 'tenantId: string;\n', 'utf8');
    const reduction = runGuard(root, baseline);
    expect(reduction.status).toBe(0);
    expect(reduction.report.reductions).toEqual([
      expect.objectContaining({ actual: 1, baseline: 2 }),
    ]);

    writeFileSync(filename, 'tenantId: string;\norganizationId: string;\ncontractVersion: 1;\n', 'utf8');
    const increase = runGuard(root, baseline);
    expect(increase.status).toBe(1);
    expect(increase.report.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'count_increase' })]),
    );
  });

  it('rejects reintroduction of a retired fingerprint', () => {
    const root = fixtureRoot();
    protectedFile(root, 'tenantId: string;\n');
    const baseline = baselineFor(root);
    const fingerprint = baseline.entries[0].fingerprints.pop() as string;
    baseline.entries[0].max_count = 0;
    baseline.retired_fingerprints = [fingerprint];
    const result = runGuard(root, writeBaseline(root, baseline));

    expect(result.report.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'reintroduced_violation' })]),
    );
  });

  it.each([
    "import('react')",
    "require('react')",
    "eval('1 + 1')",
    "Function('return 1')",
  ])('rejects dynamic execution: %s', (expression) => {
    const root = fixtureRoot();
    const filename = protectedFile(root, 'tenantId: string;\n');
    const baseline = writeBaseline(root, baselineFor(root));
    writeFileSync(filename, `tenantId: string;\n${expression};\n`, 'utf8');

    expect(runGuard(root, baseline).report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule_id: 'frontend.dynamic_import' }),
      ]),
    );
  });

  it('rejects a new user-visible technical term', () => {
    const root = fixtureRoot();
    protectedFile(root, 'tenantId: string;\n');
    write(root, 'frontend/core/localization/translations/en-US.json', '{"safe":"Clinic"}');
    const baseline = writeBaseline(root, baselineFor(root));
    write(
      root,
      'frontend/core/localization/translations/en-US.json',
      '{"unsafe":"Repository payload"}',
    );

    expect(runGuard(root, baseline).status).toBe(1);
  });

  it('fails closed for missing and malformed baselines', () => {
    const root = fixtureRoot();
    protectedFile(root, 'tenantId: string;\n');
    expect(runGuard(root, join(root, 'missing.json')).status).toBe(2);
    const malformed = write(root, 'malformed.json', '{}');
    expect(runGuard(root, malformed).status).toBe(2);
  });

  it('fails closed for an empty protected scope', () => {
    const root = fixtureRoot();
    const baseline: Baseline = {
      entries: [
        {
          fingerprints: [],
          id: 'FIX-001',
          max_count: 0,
          path: 'frontend/features/commercial-platform/domain/sample.ts',
          rule_id: 'frontend.host_terminology',
        },
      ],
      policy: 'legacy-baseline-with-ratchet',
      repository: 'frontend',
      retired_fingerprints: [],
      schema_version: 1,
    };

    expect(runGuard(root, writeBaseline(root, baseline)).report.issues).toEqual([
      { type: 'empty_protected_scope' },
    ]);
  });

  it('is deterministic, safe, and never rewrites the baseline', () => {
    const before = createHash('sha256').update(readFileSync(baselinePath)).digest('hex');
    const first = runGuard();
    const second = runGuard();
    const after = createHash('sha256').update(readFileSync(baselinePath)).digest('hex');

    expect(first.stdout).toBe(second.stdout);
    expect(before).toBe(after);
    expect(first.report).not.toHaveProperty('source');
  });
});
