/**
 * useRegistrationStatus Hook
 * Fetches and manages registration status
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { registrationRepository } from '../../data/repositories/registration.repository.impl';
import type { RegistrationStatus } from '../../domain/entities/registration.entity';
import { GetRegistrationStatusUseCase } from '../../domain/usecases/get-registration-status.usecase';

const getRegistrationStatus = new GetRegistrationStatusUseCase(registrationRepository);

export const registrationStatusKeys = {
  all: ['registration-status'] as const,
  status: (userId: string) => [...registrationStatusKeys.all, userId] as const,
};

/**
 * Hook to get registration status
 */
export const useRegistrationStatus = (
  userId: string,
  options?: Omit<UseQueryOptions<RegistrationStatus, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<RegistrationStatus, Error>({
    queryKey: registrationStatusKeys.status(userId),
    queryFn: () => getRegistrationStatus.execute(userId),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    ...options,
  });
};
