import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CommercialTrialError, commercialTrialRepository } from '../../../commercialPlatform';

/** Platform-admin extension channel recorded with every Super Admin grant. */
export const PLATFORM_EXTENSION_CHANNEL = 'SUPPORT';

export type PlatformTrialCommandResult = { aggregateVersion: number; expiresAt: string | null; state: string };
export type PlatformTrialFailure = { kind: CommercialTrialError['kind'] | 'UNKNOWN'; retryable: boolean };

export const createOperationKey = (): string => {
  const cryptoRandomUUID = globalThis.crypto?.randomUUID;
  if (cryptoRandomUUID) return cryptoRandomUUID.call(globalThis.crypto);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

export const toPlatformTrialFailure = (error: unknown): PlatformTrialFailure =>
  error instanceof CommercialTrialError ? { kind: error.kind, retryable: error.retryable } : { kind: 'UNKNOWN', retryable: true };

/**
 * Super Admin commercial-trial commands. Results are the backend's response (never a locally
 * synthesized success); the platform clinic caches are invalidated afterwards so the next read
 * reflects the persisted state. The idempotency key is supplied by the caller so a retry of the
 * same attempt replays instead of duplicating.
 */
export const usePlatformTrialCommands = () => {
  const queryClient = useQueryClient();
  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-tenant'] }),
    ]);
  }, [queryClient]);

  const initialize = useCallback(async (organizationId: string, tenantId: string, idempotencyKey: string): Promise<PlatformTrialCommandResult> => {
    const trial = await commercialTrialRepository.initializeLegacyCommercialTrial(organizationId, tenantId, undefined, true, idempotencyKey);
    await invalidate();
    return { aggregateVersion: trial.aggregateVersion, expiresAt: trial.expiresAt, state: trial.state };
  }, [invalidate]);

  const grant = useCallback(async (organizationId: string, tenantId: string, input: { aggregateVersion: number; extensionDays: number; reason: string; idempotencyKey: string }): Promise<PlatformTrialCommandResult> => {
    const trial = await commercialTrialRepository.grantCommercialTrialExtension(organizationId, tenantId, input.aggregateVersion, input.extensionDays, input.reason, PLATFORM_EXTENSION_CHANNEL, input.idempotencyKey);
    await invalidate();
    return { aggregateVersion: trial.aggregateVersion, expiresAt: trial.expiresAt, state: trial.state };
  }, [invalidate]);

  return { initialize, grant };
};
