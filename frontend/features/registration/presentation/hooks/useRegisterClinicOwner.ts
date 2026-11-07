import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

import { createRegistrationAttemptKeyStore } from '../../application/registrationAttemptKey';
import { registrationRepository } from '../../data/repositories/registration.repository.impl';
import type { RegistrationRequest } from '../../domain/entities/registration.entity';
import { RegisterClinicOwnerUseCase } from '../../domain/usecases/register-clinic-owner.usecase';

const registerClinicOwner = new RegisterClinicOwnerUseCase(registrationRepository);

export const useRegisterClinicOwner = () => {
  // One store per screen instance: retries of the same payload reuse the Idempotency-Key,
  // an edited payload or a new screen visit starts a new logical registration attempt.
  const attemptKeys = useRef(createRegistrationAttemptKeyStore()).current;
  return useMutation({
    mutationFn: async (request: RegistrationRequest) => {
      const response = await registerClinicOwner.execute(request, attemptKeys.keyFor(request));
      attemptKeys.complete();
      return response;
    },
  });
};
