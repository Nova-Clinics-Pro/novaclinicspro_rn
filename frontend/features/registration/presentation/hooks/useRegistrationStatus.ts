/**
 * useRegistrationStatus Hook
 * Fetches and manages registration status
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { registrationRepository } from '../../data/repositories/registration.repository.impl';
import type { RegistrationStatus } from '../../domain/entities/registration.entity';
import { GetRegistrationStatusUseCase } from '../../domain/usecases/get-registration-status.usecase';

const getRegistrationStatus = new GetRegistrationStatusUseCase(registrationRepository);

export const registrationStatusKeys = {
  all: ['registration-status'] as const,
  status: (authenticatedUserId: string | null) =>
    [...registrationStatusKeys.all, 'authenticated-applicant', authenticatedUserId] as const,
};

/**
 * Hook to get registration status
 */
export const useRegistrationStatus = (options?: Omit<UseQueryOptions<RegistrationStatus, Error>, 'queryKey' | 'queryFn'>) => {
  const authenticatedUserId = useAuthStore((state) =>
    state.isAuthenticated ? state.currentUser?.userId ?? null : null,
  );
  const { enabled: enabledOption, ...queryOptions } = options ?? {};

  return useQuery<RegistrationStatus, Error>({
    queryKey: registrationStatusKeys.status(authenticatedUserId),
    queryFn: () => getRegistrationStatus.execute(),
    staleTime: 30000, // 30 seconds
    ...queryOptions,
    enabled: Boolean(authenticatedUserId) && (enabledOption ?? true),
  });
};
