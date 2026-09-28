import { useMutation } from '@tanstack/react-query';

import { registrationRepository } from '../../data/repositories/registration.repository.impl';
import type { RegistrationRequest } from '../../domain/entities/registration.entity';
import { RegisterClinicOwnerUseCase } from '../../domain/usecases/register-clinic-owner.usecase';

const registerClinicOwner = new RegisterClinicOwnerUseCase(registrationRepository);

export const useRegisterClinicOwner = () =>
  useMutation({
    mutationFn: (request: RegistrationRequest) => registerClinicOwner.execute(request),
  });
