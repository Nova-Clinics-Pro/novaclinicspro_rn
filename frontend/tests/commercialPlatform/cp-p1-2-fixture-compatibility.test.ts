import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { canonicalJson } from '../../features/commercialPlatform/contracts/serialization';
import { ContractValidationError, ContractVersion } from '../../features/commercialPlatform/contracts/version';
import {
  ActorRef,
  AggregateRef,
  CapabilityRef,
  CommercialScopeRef,
  CorrelationRef,
  CustomerAccountRef,
  IdempotencyKey,
  ReferenceValidationError,
} from '../../features/commercialPlatform/domain/references';

type FixtureCase = { classification: string; type?: string; value: unknown; canonical?: string };
type Fixture = {
  canonical_sha256: string;
  fixture_contract_version: string;
  fixture_set_id: string;
  cases: {
    references: FixtureCase[];
    idempotency: FixtureCase[];
    versions: FixtureCase[];
    serialization: FixtureCase[];
  };
};

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../features/commercialPlatform/fixtures/cp-p1-2-v1.json'), 'utf8'),
) as Fixture;

const referenceTypes = {
  ActorRef,
  AggregateRef,
  CapabilityRef,
  CommercialScopeRef,
  CorrelationRef,
  CustomerAccountRef,
};

function classify(action: () => unknown): string {
  try {
    action();
    return 'valid';
  } catch (error) {
    if (error instanceof ReferenceValidationError || error instanceof ContractValidationError) return error.code;
    throw error;
  }
}

describe('CP-P1.2 canonical fixture compatibility', () => {
  it('has the approved identity and canonical-case digest', () => {
    expect(fixture.fixture_contract_version).toBe('1.0');
    expect(fixture.fixture_set_id).toBe('cp-p1.2-v1-20260804');
    expect(createHash('sha256').update(canonicalJson(fixture.cases)).digest('hex')).toBe(
      fixture.canonical_sha256,
    );
  });

  test.each(fixture.cases.references)('classifies reference $value', (testCase) => {
    const referenceType = referenceTypes[testCase.type as keyof typeof referenceTypes];
    expect(classify(() => referenceType.parse(testCase.value))).toBe(testCase.classification);
  });

  test.each(fixture.cases.idempotency)('classifies idempotency $value', (testCase) => {
    expect(classify(() => IdempotencyKey.parse(testCase.value))).toBe(testCase.classification);
  });

  test.each(fixture.cases.versions)('classifies version $value', (testCase) => {
    expect(classify(() => ContractVersion.parse(testCase.value))).toBe(testCase.classification);
  });

  test.each(fixture.cases.serialization)('serializes canonical vector', (testCase) => {
    expect(canonicalJson(testCase.value)).toBe(testCase.canonical);
  });
});
