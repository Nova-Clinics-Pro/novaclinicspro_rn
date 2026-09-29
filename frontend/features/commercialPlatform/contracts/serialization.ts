/** Deterministic public serialization without host or UI dependencies. */

import { IdempotencyKey } from '../domain/references';
import { CommandContext } from './context';
import { PublicErrorDetail, PublicFailure } from './errors';
import { CommercialResultMetadata } from './result';
import { ContractValidationError, ContractVersion } from './version';

function isReference(value: unknown): value is { value: string; token: string } {
  return typeof value === 'object' && value !== null && 'value' in value && 'token' in value;
}

export function toPublicValue(value: unknown): unknown {
  if (isReference(value) || value instanceof IdempotencyKey || value instanceof ContractVersion) return value.value;
  if (value instanceof CommandContext) {
    return {
      actor_ref: value.actorRef.value,
      commercial_scope_ref: value.commercialScopeRef.value,
      contract_version: value.contractVersion.value,
      correlation_ref: value.correlationRef.value,
      customer_account_ref: value.customerAccountRef.value,
      idempotency_key: value.idempotencyKey.value,
      ...(value.expectedRevision === undefined ? {} : { expected_revision: value.expectedRevision }),
    };
  }
  if (value instanceof CommercialResultMetadata) {
    return {
      ...(value.aggregateRef === undefined ? {} : { aggregate_ref: value.aggregateRef.value }),
      contract_version: value.contractVersion.value,
      correlation_ref: value.correlationRef.value,
      occurred_at: value.occurredAt,
      ...(value.revision === undefined ? {} : { revision: value.revision }),
    };
  }
  if (value instanceof PublicErrorDetail) {
    return {
      code: value.code,
      correlation_ref: value.correlationRef.value,
      message_token: value.messageToken,
      retryable: value.retryable,
      ...(value.validationPath === undefined ? {} : { validation_path: [...value.validationPath] }),
    };
  }
  if (value instanceof PublicFailure) {
    return { contract_version: value.contractVersion.value, error: toPublicValue(value.error) };
  }
  if (Array.isArray(value)) return value.map(toPublicValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPublicValue(item)]));
  }
  if (typeof value === 'number' && (!Number.isFinite(value) || !Number.isSafeInteger(value))) {
    throw new ContractValidationError('contract.invalid_number');
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  throw new TypeError(`Unsupported public value type: ${typeof value}`);
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRecursively);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortRecursively(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortRecursively(toPublicValue(value)));
}
