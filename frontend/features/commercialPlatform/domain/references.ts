/** Framework-free typed opaque references for CP contract version 1. */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_.-]{16,128}$/;
const KNOWN_NAMESPACES = new Set(['acct', 'scope', 'actor', 'cap', 'agg', 'corr']);

export class ReferenceValidationError extends Error {
  readonly code: string;
  readonly expectedType: string;

  constructor(code: string, expectedType: string) {
    super(`${code}: expected ${expectedType}`);
    this.name = 'ReferenceValidationError';
    this.code = code;
    this.expectedType = expectedType;
  }
}

function validateReference(value: unknown, namespace: string, expectedType: string): string {
  if (value === null || value === undefined || value === '') {
    throw new ReferenceValidationError('reference.required', expectedType);
  }
  if (typeof value !== 'string') {
    throw new ReferenceValidationError('reference.invalid_type', expectedType);
  }
  if (value.split(':').length !== 2) {
    throw new ReferenceValidationError('reference.invalid_separator', expectedType);
  }
  const [actualNamespace, token] = value.split(':');
  if (!KNOWN_NAMESPACES.has(actualNamespace)) {
    throw new ReferenceValidationError('reference.unknown_namespace', expectedType);
  }
  if (actualNamespace !== namespace) {
    throw new ReferenceValidationError('reference.namespace_mismatch', expectedType);
  }
  if (token.length < 22 || token.length > 128) {
    throw new ReferenceValidationError('reference.invalid_token_length', expectedType);
  }
  if (!TOKEN_PATTERN.test(token)) {
    throw new ReferenceValidationError('reference.invalid_token_characters', expectedType);
  }
  return value;
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

abstract class OpaqueReference {
  readonly value: string;

  protected constructor(value: string, namespace: string, expectedType: string) {
    this.value = validateReference(value, namespace, expectedType);
    Object.freeze(this);
  }

  get token(): string {
    return this.value.split(':', 2)[1];
  }

  toString(): string {
    return this.value;
  }
}

export class CustomerAccountRef extends OpaqueReference {
  static readonly namespace = 'acct';
  constructor(value: string) {
    super(value, CustomerAccountRef.namespace, 'CustomerAccountRef');
  }
  static parse(value: unknown): CustomerAccountRef {
    return new CustomerAccountRef(validateReference(value, this.namespace, this.name));
  }
}

export class CommercialScopeRef extends OpaqueReference {
  static readonly namespace = 'scope';
  constructor(value: string) {
    super(value, CommercialScopeRef.namespace, 'CommercialScopeRef');
  }
  static parse(value: unknown): CommercialScopeRef {
    return new CommercialScopeRef(validateReference(value, this.namespace, this.name));
  }
}

export class ActorRef extends OpaqueReference {
  static readonly namespace = 'actor';
  constructor(value: string) {
    super(value, ActorRef.namespace, 'ActorRef');
  }
  static parse(value: unknown): ActorRef {
    return new ActorRef(validateReference(value, this.namespace, this.name));
  }
}

export class CapabilityRef extends OpaqueReference {
  static readonly namespace = 'cap';
  constructor(value: string) {
    super(value, CapabilityRef.namespace, 'CapabilityRef');
  }
  static parse(value: unknown): CapabilityRef {
    return new CapabilityRef(validateReference(value, this.namespace, this.name));
  }
}

export class AggregateRef extends OpaqueReference {
  static readonly namespace = 'agg';
  constructor(value: string) {
    super(value, AggregateRef.namespace, 'AggregateRef');
  }
  static parse(value: unknown): AggregateRef {
    return new AggregateRef(validateReference(value, this.namespace, this.name));
  }
  static generate(): AggregateRef {
    return new AggregateRef(`${this.namespace}:${randomToken()}`);
  }
}

export class CorrelationRef extends OpaqueReference {
  static readonly namespace = 'corr';
  constructor(value: string) {
    super(value, CorrelationRef.namespace, 'CorrelationRef');
  }
  static parse(value: unknown): CorrelationRef {
    return new CorrelationRef(validateReference(value, this.namespace, this.name));
  }
  static generate(): CorrelationRef {
    return new CorrelationRef(`${this.namespace}:${randomToken()}`);
  }
  static ensure(value?: unknown): CorrelationRef {
    try {
      return this.parse(value);
    } catch (error) {
      if (!(error instanceof ReferenceValidationError)) throw error;
      return this.generate();
    }
  }
}

export class IdempotencyKey {
  readonly value: string;

  constructor(value: string) {
    this.value = IdempotencyKey.validate(value);
    Object.freeze(this);
  }

  static parse(value: unknown): IdempotencyKey {
    return new IdempotencyKey(this.validate(value));
  }

  private static validate(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      throw new ReferenceValidationError('idempotency.required', 'IdempotencyKey');
    }
    if (typeof value !== 'string') {
      throw new ReferenceValidationError('idempotency.invalid_type', 'IdempotencyKey');
    }
    if (value.length < 16 || value.length > 128) {
      throw new ReferenceValidationError('idempotency.invalid_length', 'IdempotencyKey');
    }
    if (!IDEMPOTENCY_PATTERN.test(value)) {
      throw new ReferenceValidationError('idempotency.invalid_characters', 'IdempotencyKey');
    }
    return value;
  }

  toString(): string {
    return this.value;
  }
}
