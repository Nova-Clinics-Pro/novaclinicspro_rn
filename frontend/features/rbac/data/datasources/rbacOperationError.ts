import { isAxiosError } from 'axios';
import { RbacOperationError } from '../../domain/errors/rbacOperationError';

type ErrorEnvelope = { error?: unknown; detail?: unknown; code?: unknown };

export const normalizeRbacOperationError = (error: unknown): RbacOperationError => {
  if (error instanceof RbacOperationError) return error;
  if (!isAxiosError(error)) return new RbacOperationError('SAVE_FAILED');
  const envelope = error.response?.data as ErrorEnvelope | undefined;
  const code = typeof envelope?.error === 'string' ? envelope.error : typeof envelope?.code === 'string' ? envelope.code : undefined;
  switch (error.response?.status) {
    case 401: return new RbacOperationError('AUTHENTICATION_REQUIRED', code);
    case 403: return new RbacOperationError('PERMISSION_DENIED', code);
    case 404: return new RbacOperationError('NOT_FOUND', code);
    case 409: return new RbacOperationError('CONFLICT', code);
    case 400:
    case 422: return new RbacOperationError('VALIDATION_FAILED', code);
    default: return new RbacOperationError(!error.response ? 'NETWORK_FAILED' : 'SAVE_FAILED', code);
  }
};
