/**
 * Registration API Datasource
 * Handles API calls for clinic owner registration
 */

import { isAxiosError } from 'axios';
import { axiosClient } from '../../../../core/api/axiosClient';
import {
  ClinicOwnerRegistrationRequest,
  ClinicOwnerRegistrationResponse,
  RegistrationStatusResponse,
} from '../models/registration.dtos';
import type { RegistrationFieldKey, RegistrationValidationCode } from '../../domain/registrationValidation';

export type RegistrationFailureKind =
  | 'USER_ALREADY_EXISTS'
  | 'FIELD_VALIDATION'
  | 'FORM_VALIDATION'
  | 'ELIGIBILITY'
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION'
  | 'TOO_MANY_ATTEMPTS'
  | 'CONFLICT'
  | 'UNEXPECTED';

export interface RegistrationValidationIssue {
  readonly code: RegistrationValidationCode | string;
  readonly fieldKey: RegistrationFieldKey | null;
  readonly priority: number;
}

export class RegistrationSubmissionError extends Error {
  constructor(
    readonly kind: RegistrationFailureKind,
    readonly status?: number,
    readonly domainCode?: string,
    readonly validationIssues: readonly RegistrationValidationIssue[] = []
  ) {
    super(kind);
    this.name = 'RegistrationSubmissionError';
  }

  get recoverable(): boolean {
    return this.kind !== 'UNEXPECTED';
  }
}

const errorCode = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined;
  const response = data as Record<string, unknown>;
  // FastAPI's domain-error envelope is { detail: { error, message,
  // suggestion } }.  Keep this normalization at the transport boundary so
  // presentation never receives backend prose or an AxiosError.
  const record =
    response.detail && typeof response.detail === 'object'
      ? (response.detail as Record<string, unknown>)
      : response;
  const candidate = record.error ?? record.code ?? record.error_code;
  return typeof candidate === 'string' ? candidate : undefined;
};

const validationIssues = (data: unknown): readonly RegistrationValidationIssue[] => {
  if (!data || typeof data !== 'object') return [];
  const response = data as Record<string, unknown>;
  const detail = response.detail && typeof response.detail === 'object'
    ? response.detail as Record<string, unknown>
    : response;
  const errors = detail.errors;
  if (!Array.isArray(errors)) return [];
  return errors.flatMap((value): RegistrationValidationIssue[] => {
    if (!value || typeof value !== 'object') return [];
    const issue = value as Record<string, unknown>;
    if (typeof issue.code !== 'string' || typeof issue.priority !== 'number') return [];
    return [{
      code: issue.code,
      fieldKey: typeof issue.field_key === 'string' ? issue.field_key as RegistrationFieldKey : null,
      priority: issue.priority,
    }];
  }).sort((left, right) => left.priority - right.priority || (left.fieldKey ?? '').localeCompare(right.fieldKey ?? ''));
};

export const mapRegistrationSubmissionError = (error: unknown): RegistrationSubmissionError => {
  if (error instanceof RegistrationSubmissionError) return error;
  if (!isAxiosError(error)) return new RegistrationSubmissionError('UNEXPECTED');

  const status = error.response?.status;
  const responseData = error.response?.data;
  const domainCode = errorCode(responseData)?.toLowerCase();
  const issues = validationIssues(responseData);
  if (domainCode === 'registration_validation_failed') {
    return new RegistrationSubmissionError(
      issues.some(issue => issue.fieldKey) ? 'FIELD_VALIDATION' : 'FORM_VALIDATION',
      status,
      domainCode,
      issues
    );
  }
  if (domainCode === 'user_already_exists' || domainCode === 'email_already_registered') {
    return new RegistrationSubmissionError('USER_ALREADY_EXISTS', status, domainCode, issues);
  }
  if (domainCode === 'invalid_credentials' || domainCode === 'invalid_password') {
    return new RegistrationSubmissionError('INVALID_CREDENTIALS', status, domainCode, issues);
  }
  if (status === 429 || domainCode === 'too_many_attempts' || domainCode === 'rate_limited') {
    return new RegistrationSubmissionError('TOO_MANY_ATTEMPTS', status, domainCode, issues);
  }
  if (status === 400 || status === 422 || domainCode === 'validation_error') {
    return new RegistrationSubmissionError('FORM_VALIDATION', status, domainCode, issues);
  }
  if (status === 409) return new RegistrationSubmissionError('CONFLICT', status, domainCode, issues);
  return new RegistrationSubmissionError('UNEXPECTED', status, domainCode);
};

export const registerClinicOwnerApi = async (
  payload: ClinicOwnerRegistrationRequest
): Promise<ClinicOwnerRegistrationResponse> => {
  try {
    const response = await axiosClient.post(
      '/api/v1/auth/register-clinic-owner',
      payload
    );
    return response.data;
  } catch (error) {
    throw mapRegistrationSubmissionError(error);
  }
};

export const getRegistrationStatusApi = async (
  userId: string
): Promise<RegistrationStatusResponse> => {
  const response = await axiosClient.get<RegistrationStatusResponse>(
    `/api/v1/auth/registration-status/${userId}`
  );
  return response.data;
};
