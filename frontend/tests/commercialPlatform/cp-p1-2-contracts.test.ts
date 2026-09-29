import { CommandContext } from '../../features/commercialPlatform/contracts/context';
import { PublicErrorDetail, PublicFailure } from '../../features/commercialPlatform/contracts/errors';
import { CommercialResultMetadata } from '../../features/commercialPlatform/contracts/result';
import { canonicalJson, toPublicValue } from '../../features/commercialPlatform/contracts/serialization';
import { ContractValidationError, ContractVersion } from '../../features/commercialPlatform/contracts/version';
import { CorrelationRef } from '../../features/commercialPlatform/domain/references';

const context = {
  actor_ref: 'actor:0123456789ABCDEFGHIJKL',
  commercial_scope_ref: 'scope:abcdefghijklmnopqrstuv',
  contract_version: '1.0',
  correlation_ref: 'corr:ABCDEFGHIJKLMNOPQRSTUV',
  customer_account_ref: 'acct:ABCDEFGHIJKLMNOPQRSTUV',
  idempotency_key: 'request-key-0001',
};

describe('CP-P1.2 public contracts', () => {
  it('supports only strict contract version 1.0', () => {
    expect(ContractVersion.parse('1.0').value).toBe('1.0');
    expect(() => ContractVersion.parse('1.1')).toThrow(
      expect.objectContaining({ code: 'contract.unsupported_version' }),
    );
    expect(() => ContractVersion.parse('01.0')).toThrow(
      expect.objectContaining({ code: 'contract.invalid_version' }),
    );
  });

  it('accepts only exact CommandContext fields and positive revisions', () => {
    const parsed = CommandContext.fromRecord({ ...context, expected_revision: 3 });
    expect(toPublicValue(parsed)).toEqual({ ...context, expected_revision: 3 });
    for (const value of [0, -1, true, '1']) {
      expect(() => CommandContext.fromRecord({ ...context, expected_revision: value })).toThrow();
    }
    expect(() => CommandContext.fromRecord({ ...context, tenant_id: 'forbidden' })).toThrow(
      expect.objectContaining({ code: 'contract.unknown_field' }),
    );
  });

  it('normalizes authoritative instants and pairs aggregate identity with revision', () => {
    const metadata = CommercialResultMetadata.fromRecord({
      aggregate_ref: 'agg:abcdefghijklmnopqrstuv',
      contract_version: '1.0',
      correlation_ref: 'corr:ABCDEFGHIJKLMNOPQRSTUV',
      occurred_at: '2026-08-04T08:30:00+05:30',
      revision: 2,
    });
    expect(toPublicValue(metadata)).toMatchObject({ occurred_at: '2026-08-04T03:00:00.000Z' });
    expect(() => CommercialResultMetadata.fromRecord({
      contract_version: '1.0',
      correlation_ref: 'corr:ABCDEFGHIJKLMNOPQRSTUV',
      occurred_at: '2026-08-04T08:30:00',
    })).toThrow(expect.objectContaining({ code: 'contract.invalid_instant' }));
  });

  it('uses a closed safe public failure shape', () => {
    const detail = new PublicErrorDetail({
      code: 'reference.invalid_token',
      messageToken: 'commercial.reference.invalid',
      retryable: false,
      correlationRef: CorrelationRef.parse('corr:ABCDEFGHIJKLMNOPQRSTUV'),
    });
    const failure = new PublicFailure(ContractVersion.parse('1.0'), detail);
    expect(toPublicValue(failure)).toEqual({
      contract_version: '1.0',
      error: {
        code: 'reference.invalid_token',
        correlation_ref: 'corr:ABCDEFGHIJKLMNOPQRSTUV',
        message_token: 'commercial.reference.invalid',
        retryable: false,
      },
    });
    expect(() => PublicErrorDetail.fromRecord({
      ...(toPublicValue(detail) as Record<string, unknown>),
      details: { submitted_value: 'secret' },
    })).toThrow(expect.objectContaining({ code: 'contract.unknown_field' }));
  });

  it('serializes deterministically and rejects unsafe numbers', () => {
    const expected = '{"a":{"a":1,"b":2},"z":["α",true,null]}';
    expect(canonicalJson({ z: ['α', true, null], a: { b: 2, a: 1 } })).toBe(expected);
    expect(canonicalJson({ a: { a: 1, b: 2 }, z: ['α', true, null] })).toBe(expected);
    expect(() => canonicalJson({ value: Number.MAX_SAFE_INTEGER + 1 })).toThrow(ContractValidationError);
  });
});
