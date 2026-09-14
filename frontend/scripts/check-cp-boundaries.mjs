#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const SCHEMA_VERSION = 1;
const POLICY = 'legacy-baseline-with-ratchet';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_BASELINE = path.join(SCRIPT_DIR, 'cp-boundary-baseline.json');

export const IMPORT_RULE = 'frontend.forbidden_import';
export const TERM_RULE = 'frontend.host_terminology';
export const UI_RULE = 'frontend.ui_technical_terminology';
export const UI_HI_ADMIN_RULE = 'frontend.ui_technical_terminology.organization_admin';
export const UI_HI_CLINIC_RULE = 'frontend.ui_technical_terminology.clinic_entry';
export const DYNAMIC_RULE = 'frontend.dynamic_import';
const ALLOWED_RULES = new Set([
  IMPORT_RULE,
  TERM_RULE,
  UI_RULE,
  UI_HI_ADMIN_RULE,
  UI_HI_CLINIC_RULE,
  DYNAMIC_RULE,
]);
const TECHNICAL_IDENTIFIERS = new Set([
  'contractVersion',
  'organizationId',
  'tenantId',
  'aggregateVersion',
]);
const FORBIDDEN_CORE_IMPORTS = [
  '@tanstack/react-query',
  'axios',
  'frontend/core/api',
];
const FUTURE_CP_FORBIDDEN_IMPORTS = [
  'expo-router',
  'react',
  'react-native',
  'frontend/core/localization',
  'frontend/core/theme',
];
const UI_TERMS = [
  { symbol: 'tenant', pattern: /\btenants?\b/giu },
  { symbol: 'टेनेंट', pattern: /टेनेंट/gu },
  { symbol: 'payload', pattern: /\bpayload\b/giu },
  { symbol: 'repository', pattern: /\brepository\b/giu },
  { symbol: 'datasource', pattern: /\bdatasource\b/giu },
  { symbol: 'HTTP', pattern: /\bHTTP\b/gu },
  { symbol: 'Alembic', pattern: /\bAlembic\b/gu },
  { symbol: 'aggregate version', pattern: /\baggregate version\b/giu },
  { symbol: 'contract version', pattern: /\bcontract version\b/giu },
];

export class BaselineError extends Error {}

function normalize(value) {
  return value.trim().replace(/\s+/gu, ' ');
}

export function stableFingerprint(ruleId, relativePath, symbol, context, ordinal = 0) {
  return crypto
    .createHash('sha256')
    .update([ruleId, relativePath, symbol, normalize(context), String(ordinal)].join('\0'))
    .digest('hex');
}

function observation(ruleId, relativePath, symbol, context, line, ordinal = 0) {
  return {
    rule_id: ruleId,
    path: relativePath,
    symbol,
    fingerprint: stableFingerprint(ruleId, relativePath, symbol, context, ordinal),
    line,
  };
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(candidate));
    else if (/\.(?:ts|tsx)$/u.test(entry.name)) output.push(candidate);
  }
  return output.sort();
}

function importProtectedFiles(root) {
  const exact = [
    path.join(root, 'frontend/features/onboarding/data/repositories/onboarding.repository.impl.ts'),
  ];
  const commercialPlatformDirectories = [
    path.join(root, 'frontend/features/commercialPlatform'),
    path.join(root, 'frontend/features/commercial-platform'),
  ];
  return [
    ...new Set([...exact.filter(fs.existsSync), ...commercialPlatformDirectories.flatMap(walk)]),
  ].sort();
}

function termProtectedFiles(root) {
  const exact = [
    path.join(root, 'frontend/features/onboarding/domain/entities/commercial-trial.entity.ts'),
  ];
  const futureDirectories = [
    path.join(root, 'frontend/features/commercial-platform/domain'),
    path.join(root, 'frontend/features/commercial-platform/application'),
  ];
  return [
    ...new Set([...exact.filter(fs.existsSync), ...futureDirectories.flatMap(walk)]),
  ].sort();
}

function isCoreFile(relativePath) {
  if (isCommercialPlatformFile(relativePath)) {
    return (
      relativePath.startsWith('frontend/features/commercialPlatform/contracts/') ||
      relativePath.includes('/domain/')
    );
  }
  return (
    relativePath.includes('/domain/') ||
    relativePath.includes('/application/') ||
    relativePath.includes('/data/repositories/') ||
    relativePath.startsWith('frontend/features/commercialPlatform/contracts/')
  );
}

function isCommercialPlatformFile(relativePath) {
  return (
    relativePath.startsWith('frontend/features/commercialPlatform/') ||
    relativePath.startsWith('frontend/features/commercial-platform/')
  );
}

function matchesImport(moduleName, prefixes) {
  return prefixes.some(
    (prefix) => moduleName === prefix || moduleName.startsWith(`${prefix}/`),
  );
}

function isForbiddenCoreImport(moduleName, relativePath) {
  const commercialPlatform = isCommercialPlatformFile(relativePath);
  return (
    (isCoreFile(relativePath) && matchesImport(moduleName, FORBIDDEN_CORE_IMPORTS)) ||
    (commercialPlatform &&
      ((isCoreFile(relativePath) && matchesImport(moduleName, FUTURE_CP_FORBIDDEN_IMPORTS)) ||
        /(?:^|\/)onboarding(?:\/|$)/u.test(moduleName)))
  );
}

function lineFor(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function sourceLine(source, line) {
  return source.split(/\r?\n/u)[line - 1] ?? '';
}

function scanTypeScript(root) {
  const observations = [];
  const importFiles = new Set(importProtectedFiles(root));
  const termFiles = new Set(termProtectedFiles(root));
  const files = [...new Set([...importFiles, ...termFiles])].sort();

  for (const filename of files) {
    const relativePath = path.relative(root, filename).split(path.sep).join('/');
    const source = fs.readFileSync(filename, 'utf8');
    const sourceFile = ts.createSourceFile(
      relativePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const ordinals = new Map();
    const add = (ruleId, symbol, node) => {
      const line = lineFor(sourceFile, node);
      const context = sourceLine(source, line);
      const key = `${ruleId}\0${symbol}\0${normalize(context)}`;
      const ordinal = ordinals.get(key) ?? 0;
      observations.push(observation(ruleId, relativePath, symbol, context, line, ordinal));
      ordinals.set(key, ordinal + 1);
    };

    const visit = (node) => {
      if (
        importFiles.has(filename) &&
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        isForbiddenCoreImport(node.moduleSpecifier.text, relativePath)
      ) {
        add(IMPORT_RULE, node.moduleSpecifier.text, node);
      }

      if (importFiles.has(filename)) {
        let dynamicSymbol = null;
        if (ts.isCallExpression(node)) {
          if (node.expression.kind === ts.SyntaxKind.ImportKeyword) dynamicSymbol = 'import';
          else if (ts.isIdentifier(node.expression) && ['require', 'eval'].includes(node.expression.text)) {
            dynamicSymbol = node.expression.text;
          } else if (ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
            dynamicSymbol = 'Function';
          }
        } else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
          dynamicSymbol = 'Function';
        }
        if (dynamicSymbol) add(DYNAMIC_RULE, dynamicSymbol, node);
      }

      if (
        termFiles.has(filename) &&
        ts.isIdentifier(node) &&
        TECHNICAL_IDENTIFIERS.has(node.text)
      ) {
        add(TERM_RULE, node.text, node);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return observations;
}

function stringLeaves(value, keys = []) {
  if (typeof value === 'string') return [{ keys, value }];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value)
    .sort()
    .flatMap((key) => stringLeaves(value[key], [...keys, key]));
}

function uiRule(relativePath, keys, symbol) {
  if (relativePath.endsWith('/hi-IN.json') && symbol === 'टेनेंट') {
    const key = keys.join('.');
    if (key.startsWith('errors.tenants.')) return UI_HI_ADMIN_RULE;
    if (key === 'onboarding.progressiveExperience.clinicEntry.newClinic.validation') {
      return UI_HI_CLINIC_RULE;
    }
  }
  return UI_RULE;
}

function scanTranslations(root) {
  const observations = [];
  const translationFiles = [
    'frontend/core/localization/translations/en-US.json',
    'frontend/core/localization/translations/hi-IN.json',
  ];
  for (const relativePath of translationFiles) {
    const filename = path.join(root, relativePath);
    if (!fs.existsSync(filename)) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch {
      throw new BaselineError(`cannot parse protected translation ${relativePath}`);
    }
    for (const { keys, value } of stringLeaves(parsed)) {
      for (const { symbol, pattern } of UI_TERMS) {
        pattern.lastIndex = 0;
        let ordinal = 0;
        while (pattern.exec(value) !== null) {
          const ruleId = uiRule(relativePath, keys, symbol);
          observations.push(
            observation(ruleId, relativePath, symbol, keys.join('.'), 0, ordinal),
          );
          ordinal += 1;
        }
      }
    }
  }
  return observations;
}

export function scan(root) {
  const resolved = path.resolve(root);
  return [...scanTypeScript(resolved), ...scanTranslations(resolved)].sort((left, right) =>
    [left.rule_id, left.path, left.symbol, left.fingerprint].join('\0').localeCompare(
      [right.rule_id, right.path, right.symbol, right.fingerprint].join('\0'),
    ),
  );
}

export function loadBaseline(filename) {
  if (!fs.existsSync(filename)) throw new BaselineError(`baseline is missing: ${filename}`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new BaselineError('baseline is not valid JSON');
  }
  const required = ['entries', 'policy', 'repository', 'retired_fingerprints', 'schema_version'];
  if (JSON.stringify(Object.keys(data).sort()) !== JSON.stringify(required)) {
    throw new BaselineError('baseline has unexpected or missing top-level keys');
  }
  if (data.schema_version !== SCHEMA_VERSION || data.repository !== 'frontend') {
    throw new BaselineError('unsupported frontend baseline identity');
  }
  if (data.policy !== POLICY) throw new BaselineError('baseline policy is not approved');
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    throw new BaselineError('baseline entries must be a non-empty list');
  }
  if (!Array.isArray(data.retired_fingerprints)) {
    throw new BaselineError('retired_fingerprints must be a list');
  }

  const ids = new Set();
  const groups = new Set();
  const fingerprints = new Set();
  for (const entry of data.entries) {
    const keys = ['fingerprints', 'id', 'max_count', 'path', 'rule_id'];
    if (!entry || JSON.stringify(Object.keys(entry).sort()) !== JSON.stringify(keys)) {
      throw new BaselineError('baseline entry has unexpected or missing keys');
    }
    if (typeof entry.id !== 'string' || ids.has(entry.id)) {
      throw new BaselineError('baseline entry IDs must be unique strings');
    }
    ids.add(entry.id);
    const group = `${entry.rule_id}\0${entry.path}`;
    if (groups.has(group)) throw new BaselineError('baseline rule/path groups must be unique');
    groups.add(group);
    if (!ALLOWED_RULES.has(entry.rule_id)) throw new BaselineError(`unknown rule: ${entry.rule_id}`);
    if (
      typeof entry.path !== 'string' ||
      path.isAbsolute(entry.path) ||
      entry.path.split('/').includes('..')
    ) {
      throw new BaselineError('baseline path is unsafe');
    }
    if (!Number.isInteger(entry.max_count) || entry.max_count < 0) {
      throw new BaselineError('baseline max_count is invalid');
    }
    if (!Array.isArray(entry.fingerprints) || entry.fingerprints.length !== entry.max_count) {
      throw new BaselineError('baseline fingerprints must match max_count');
    }
    for (const fingerprint of entry.fingerprints) {
      if (
        typeof fingerprint !== 'string' ||
        !/^[0-9a-f]{64}$/u.test(fingerprint) ||
        fingerprints.has(fingerprint)
      ) {
        throw new BaselineError('baseline fingerprint is invalid or duplicated');
      }
      fingerprints.add(fingerprint);
    }
  }
  const retired = data.retired_fingerprints;
  if (
    new Set(retired).size !== retired.length ||
    retired.some((item) => !/^[0-9a-f]{64}$/u.test(item) || fingerprints.has(item))
  ) {
    throw new BaselineError('retired fingerprint is invalid, duplicated, or active');
  }
  return data;
}

export function evaluate(root, baseline) {
  const observations = scan(root);
  const entries = new Map(
    baseline.entries.map((entry) => [`${entry.rule_id}\0${entry.path}`, entry]),
  );
  const grouped = new Map();
  for (const item of observations) {
    const key = `${item.rule_id}\0${item.path}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const active = new Set(baseline.entries.flatMap((entry) => entry.fingerprints));
  const retired = new Set(baseline.retired_fingerprints);
  const issues = [];
  if (observations.length === 0) issues.push({ type: 'empty_protected_scope' });
  for (const item of observations) {
    if (retired.has(item.fingerprint)) {
      issues.push({ type: 'reintroduced_violation', ...item });
    } else if (!active.has(item.fingerprint)) {
      issues.push({ type: 'new_violation', ...item });
    }
  }
  const reductions = [];
  for (const [key, entry] of entries) {
    const actual = (grouped.get(key) ?? []).length;
    if (actual > entry.max_count) {
      issues.push({
        type: 'count_increase',
        rule_id: entry.rule_id,
        path: entry.path,
        expected_max: entry.max_count,
        actual,
      });
    } else if (actual < entry.max_count) {
      reductions.push({
        rule_id: entry.rule_id,
        path: entry.path,
        baseline: entry.max_count,
        actual,
      });
    }
  }
  issues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  reductions.sort((left, right) =>
    `${left.rule_id}\0${left.path}`.localeCompare(`${right.rule_id}\0${right.path}`),
  );
  const counts = {};
  for (const item of observations) counts[item.rule_id] = (counts[item.rule_id] ?? 0) + 1;
  return {
    counts: Object.fromEntries(Object.entries(counts).sort()),
    issues,
    observation_count: observations.length,
    policy: POLICY,
    reductions,
    repository: 'frontend',
    schema_version: SCHEMA_VERSION,
    status: issues.length === 0 ? 'pass' : 'fail',
  };
}

function parseArguments(argv) {
  const options = { check: false, root: DEFAULT_ROOT, baseline: DEFAULT_BASELINE };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') options.check = true;
    else if (argument === '--root') options.root = path.resolve(argv[++index]);
    else if (argument === '--baseline') options.baseline = path.resolve(argv[++index]);
    else throw new BaselineError(`unknown argument: ${argument}`);
  }
  if (!options.check) throw new BaselineError('--check is required; baseline generation is unsupported');
  return options;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    const report = evaluate(options.root, loadBaseline(options.baseline));
    console.log(JSON.stringify(report));
    return report.status === 'pass' ? 0 : 1;
  } catch (error) {
    console.log(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'unknown scanner error',
        repository: 'frontend',
        schema_version: SCHEMA_VERSION,
        status: 'error',
      }),
    );
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
