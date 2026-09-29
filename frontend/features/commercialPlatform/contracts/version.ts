/** Public Commercial Platform contract-version primitive. */

const VERSION_PATTERN = /^(?:[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;

export class ContractValidationError extends Error {
  readonly code: string;
  readonly path: readonly string[];

  constructor(code: string, path: readonly string[] = []) {
    super(code);
    this.name = 'ContractValidationError';
    this.code = code;
    this.path = Object.freeze([...path]);
  }
}

export class ContractVersion {
  static readonly supported = new Set(['1.0']);
  readonly value: string;

  constructor(value: string) {
    this.value = ContractVersion.validate(value);
    Object.freeze(this);
  }

  static parse(value: unknown): ContractVersion {
    return new ContractVersion(this.validate(value));
  }

  private static validate(value: unknown): string {
    if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
      throw new ContractValidationError('contract.invalid_version', ['contract_version']);
    }
    if (!this.supported.has(value)) {
      throw new ContractValidationError('contract.unsupported_version', ['contract_version']);
    }
    return value;
  }

  toString(): string {
    return this.value;
  }
}

export function assertExactFields(
  data: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(data).filter((key) => !allowed.has(key)).sort();
  if (unknown.length > 0) throw new ContractValidationError('contract.unknown_field', [unknown[0]]);
  const missing = required.filter((key) => !(key in data)).sort();
  if (missing.length > 0) throw new ContractValidationError('contract.missing_field', [missing[0]]);
}

export function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractValidationError('contract.invalid_value', [path]);
  }
  return value as Record<string, unknown>;
}
