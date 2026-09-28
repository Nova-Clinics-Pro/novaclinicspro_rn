import type { RegistrationRequest, RegistrationResponse } from '../entities/registration.entity';
import type { RegistrationRepository } from '../repositories/registration.repository';

export class RegisterClinicOwnerUseCase {
  constructor(private readonly repository: RegistrationRepository) {}

  execute(request: RegistrationRequest): Promise<RegistrationResponse> {
    return this.repository.registerClinicOwner(request);
  }
}
