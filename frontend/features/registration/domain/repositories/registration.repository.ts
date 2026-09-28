import type { RegistrationRequest, RegistrationResponse, RegistrationStatus } from '../entities/registration.entity';

export interface RegistrationRepository {
  registerClinicOwner(request: RegistrationRequest): Promise<RegistrationResponse>;
  getRegistrationStatus(userId: string): Promise<RegistrationStatus>;
}
