/** Safe typed CP public failures. */

import { CorrelationRef } from '../domain/references';
import { asRecord, assertExactFields, ContractValidationError, ContractVersion } from './version';

const CODE_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;

export type PublicErrorDetailFields = {
  code: string;
  messageToken: string;
  retryable: boolean;
  correlationRef: CorrelationRef;
  validationPath?: readonly string[];
};

export class PublicErrorDetail {
  readonly code: string;
  readonly messageToken: string;
  readonly retryable: boolean;
  readonly correlationRef: CorrelationRef;
  readonly validationPath?: readonly string[];

  constructor(fields: PublicErrorDetailFields) {
    if (!CODE_PATTERN.test(fields.code)) throw new ContractValidationError('contract.invalid_value', ['code']);
    if (!CODE_PATTERN.test(fields.messageToken)) throw new ContractValidationError('contract.invalid_value', ['message_token']);
    if (typeof fields.retryable !== 'boolean') throw new ContractValidationError('contract.invalid_value', ['retryable']);
    if (fields.validationPath !== undefined && (fields.validationPath.length === 0 || fields.validationPath.some((part) => !part))) {
      throw new ContractValidationError('contract.invalid_value', ['validation_path']);
    }
    this.code = fields.code;
    this.messageToken = fields.messageToken;
    this.retryable = fields.retryable;
    this.correlationRef = fields.correlationRef;
    this.validationPath = fields.validationPath === undefined ? undefined : Object.freeze([...fields.validationPath]);
    Object.freeze(this);
  }

  static fromRecord(data: Record<string, unknown>): PublicErrorDetail {
    assertExactFields(data, ['code', 'message_token', 'retryable', 'correlation_ref'], ['validation_path']);
    const rawPath = data.validation_path;
    if (rawPath !== undefined && (!Array.isArray(rawPath) || rawPath.some((item) => typeof item !== 'string'))) {
      throw new ContractValidationError('contract.invalid_value', ['validation_path']);
    }
    return new PublicErrorDetail({
      code: data.code as string,
      messageToken: data.message_token as string,
      retryable: data.retryable as boolean,
      correlationRef: CorrelationRef.parse(data.correlation_ref),
      ...(rawPath === undefined ? {} : { validationPath: rawPath as string[] }),
    });
  }
}

export class PublicFailure {
  readonly contractVersion: ContractVersion;
  readonly error: PublicErrorDetail;

  constructor(contractVersion: ContractVersion, error: PublicErrorDetail) {
    this.contractVersion = contractVersion;
    this.error = error;
    Object.freeze(this);
  }

  static fromRecord(data: Record<string, unknown>): PublicFailure {
    assertExactFields(data, ['contract_version', 'error']);
    return new PublicFailure(
      ContractVersion.parse(data.contract_version),
      PublicErrorDetail.fromRecord(asRecord(data.error, 'error')),
    );
  }
}
