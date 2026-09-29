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

const referenceTypes = [
  [CustomerAccountRef, 'acct'],
  [CommercialScopeRef, 'scope'],
  [ActorRef, 'actor'],
  [CapabilityRef, 'cap'],
  [AggregateRef, 'agg'],
  [CorrelationRef, 'corr'],
] as const;

describe('CP-P1.2 opaque references', () => {
  test.each(referenceTypes)('%s accepts boundaries and preserves case', (referenceType, namespace) => {
    const minimum = `${namespace}:${'Aa0_-'.repeat(4)}Aa`;
    const maximum = `${namespace}:${'A'.repeat(128)}`;
    expect(referenceType.parse(minimum).value).toBe(minimum);
    expect(referenceType.parse(maximum).value).toBe(maximum);
    expect(referenceType.parse(minimum).token).toBe(minimum.split(':')[1]);
  });

  test.each([
    [null, 'reference.required'],
    ['', 'reference.required'],
    [123, 'reference.invalid_type'],
    ['actorABCDEFGHIJKLMNOPQRSTUV', 'reference.invalid_separator'],
    ['actor:ABC:DEFGHIJKLMNOPQRSTUV', 'reference.invalid_separator'],
    ['unknown:ABCDEFGHIJKLMNOPQRSTUV', 'reference.unknown_namespace'],
    ['acct:ABCDEFGHIJKLMNOPQRSTUV', 'reference.namespace_mismatch'],
    [`actor:${'A'.repeat(21)}`, 'reference.invalid_token_length'],
    [`actor:${'A'.repeat(129)}`, 'reference.invalid_token_length'],
    ['actor:ABCDEFGHIJKLMNOPQRSTU!', 'reference.invalid_token_characters'],
    ['actor:ABCDEFGHIJKLMNOPQRSTU ', 'reference.invalid_token_characters'],
    ['actor:ABCDEFGHIJKLMNOPQRSTUé', 'reference.invalid_token_characters'],
    ['Actor:ABCDEFGHIJKLMNOPQRSTUV', 'reference.unknown_namespace'],
  ])('fails closed for %p', (value, code) => {
    try {
      ActorRef.parse(value);
      throw new Error('expected validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ReferenceValidationError);
      expect((error as ReferenceValidationError).code).toBe(code);
      if (value !== null && value !== '') expect(String(error)).not.toContain(String(value));
    }
  });

  it('is immutable and generates only CP-owned reference types', () => {
    const actor = ActorRef.parse('actor:ABCDEFGHIJKLMNOPQRSTUV');
    expect(Object.isFrozen(actor)).toBe(true);
    expect(AggregateRef.generate().value).toMatch(/^agg:[A-Za-z0-9_-]{22}$/);
    expect(CorrelationRef.generate().value).toMatch(/^corr:[A-Za-z0-9_-]{22}$/);
    expect(CorrelationRef.ensure('invalid').value).toMatch(/^corr:/);
    expect(CorrelationRef.ensure('corr:ABCDEFGHIJKLMNOPQRSTUV').value).toBe('corr:ABCDEFGHIJKLMNOPQRSTUV');
  });
});

describe('CP-P1.2 IdempotencyKey', () => {
  test.each([
    [null, 'idempotency.required'],
    ['', 'idempotency.required'],
    [7, 'idempotency.invalid_type'],
    ['A'.repeat(15), 'idempotency.invalid_length'],
    ['A'.repeat(129), 'idempotency.invalid_length'],
    ['request key 0001', 'idempotency.invalid_characters'],
    ['request-key-000é', 'idempotency.invalid_characters'],
  ])('fails closed for %p', (value, code) => {
    expect(() => IdempotencyKey.parse(value)).toThrow(
      expect.objectContaining({ code }),
    );
  });

  it('is case-sensitive and untrimmed', () => {
    expect(IdempotencyKey.parse('request-key-0001').value).toBe('request-key-0001');
    expect(IdempotencyKey.parse('REQUEST-key-0001')).not.toEqual(IdempotencyKey.parse('request-key-0001'));
    expect(() => IdempotencyKey.parse(' request-key-0001')).toThrow();
  });
});
