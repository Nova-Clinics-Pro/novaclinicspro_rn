/** Common metadata composed into later operation-specific results. */

import { AggregateRef, CorrelationRef } from '../domain/references';
import { assertExactFields, ContractValidationError, ContractVersion } from './version';

const RFC3339_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function normalizeUtcInstant(value: unknown): string {
  if (typeof value !== 'string' || !RFC3339_WITH_ZONE.test(value)) {
    throw new ContractValidationError('contract.invalid_instant', ['occurred_at']);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new ContractValidationError('contract.invalid_instant', ['occurred_at']);
  }
  return parsed.toISOString();
}

export type CommercialResultMetadataFields = {
  contractVersion: ContractVersion;
  correlationRef: CorrelationRef;
  occurredAt: string;
  aggregateRef?: AggregateRef;
  revision?: number;
};

export class CommercialResultMetadata {
  readonly contractVersion: ContractVersion;
  readonly correlationRef: CorrelationRef;
  readonly occurredAt: string;
  readonly aggregateRef?: AggregateRef;
  readonly revision?: number;

  constructor(fields: CommercialResultMetadataFields) {
    if ((fields.aggregateRef === undefined) !== (fields.revision === undefined)) {
      throw new ContractValidationError('contract.invalid_value', ['aggregate_ref']);
    }
    if (fields.revision !== undefined && (!Number.isSafeInteger(fields.revision) || fields.revision <= 0)) {
      throw new ContractValidationError('contract.invalid_value', ['revision']);
    }
    this.contractVersion = fields.contractVersion;
    this.correlationRef = fields.correlationRef;
    this.occurredAt = normalizeUtcInstant(fields.occurredAt);
    this.aggregateRef = fields.aggregateRef;
    this.revision = fields.revision;
    Object.freeze(this);
  }

  static fromRecord(data: Record<string, unknown>): CommercialResultMetadata {
    assertExactFields(data, ['contract_version', 'correlation_ref', 'occurred_at'], ['aggregate_ref', 'revision']);
    return new CommercialResultMetadata({
      contractVersion: ContractVersion.parse(data.contract_version),
      correlationRef: CorrelationRef.parse(data.correlation_ref),
      occurredAt: data.occurred_at as string,
      ...(data.aggregate_ref === undefined ? {} : { aggregateRef: AggregateRef.parse(data.aggregate_ref) }),
      ...(data.revision === undefined ? {} : { revision: data.revision as number }),
    });
  }
}
