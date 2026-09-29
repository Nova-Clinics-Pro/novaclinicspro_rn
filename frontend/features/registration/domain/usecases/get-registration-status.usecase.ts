import type { RegistrationStatus } from '../entities/registration.entity';
import type { RegistrationRepository } from '../repositories/registration.repository';

export class GetRegistrationStatusUseCase {
  constructor(private readonly repository: RegistrationRepository) {}

  execute(userId: string): Promise<RegistrationStatus> {
    return this.repository.getRegistrationStatus(userId);
  }
}
