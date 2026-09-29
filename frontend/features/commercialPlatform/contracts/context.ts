/** Exact transport-neutral CP command context. */

import {
  ActorRef,
  CommercialScopeRef,
  CorrelationRef,
  CustomerAccountRef,
  IdempotencyKey,
} from '../domain/references';
import { assertExactFields, ContractValidationError, ContractVersion } from './version';

export type CommandContextFields = {
  contractVersion: ContractVersion;
  customerAccountRef: CustomerAccountRef;
  commercialScopeRef: CommercialScopeRef;
  actorRef: ActorRef;
  correlationRef: CorrelationRef;
  idempotencyKey: IdempotencyKey;
  expectedRevision?: number;
};

export class CommandContext {
  readonly contractVersion: ContractVersion;
  readonly customerAccountRef: CustomerAccountRef;
  readonly commercialScopeRef: CommercialScopeRef;
  readonly actorRef: ActorRef;
  readonly correlationRef: CorrelationRef;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedRevision?: number;

  constructor(fields: CommandContextFields) {
    if (!Number.isSafeInteger(fields.expectedRevision ?? 1) || (fields.expectedRevision ?? 1) <= 0) {
      throw new ContractValidationError('contract.invalid_value', ['expected_revision']);
    }
    this.contractVersion = fields.contractVersion;
    this.customerAccountRef = fields.customerAccountRef;
    this.commercialScopeRef = fields.commercialScopeRef;
    this.actorRef = fields.actorRef;
    this.correlationRef = fields.correlationRef;
    this.idempotencyKey = fields.idempotencyKey;
    this.expectedRevision = fields.expectedRevision;
    Object.freeze(this);
  }

  static fromRecord(data: Record<string, unknown>): CommandContext {
    assertExactFields(
      data,
      [
        'contract_version',
        'customer_account_ref',
        'commercial_scope_ref',
        'actor_ref',
        'correlation_ref',
        'idempotency_key',
      ],
      ['expected_revision'],
    );
    const expected = data.expected_revision;
    if (expected !== undefined && (!Number.isSafeInteger(expected) || (expected as number) <= 0)) {
      throw new ContractValidationError('contract.invalid_value', ['expected_revision']);
    }
    return new CommandContext({
      contractVersion: ContractVersion.parse(data.contract_version),
      customerAccountRef: CustomerAccountRef.parse(data.customer_account_ref),
      commercialScopeRef: CommercialScopeRef.parse(data.commercial_scope_ref),
      actorRef: ActorRef.parse(data.actor_ref),
      correlationRef: CorrelationRef.parse(data.correlation_ref),
      idempotencyKey: IdempotencyKey.parse(data.idempotency_key),
      ...(expected === undefined ? {} : { expectedRevision: expected as number }),
    });
  }
}
