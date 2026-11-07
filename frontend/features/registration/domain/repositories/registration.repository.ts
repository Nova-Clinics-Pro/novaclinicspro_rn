import type { RegistrationRequest, RegistrationResponse, RegistrationStatus } from '../entities/registration.entity';

export interface RegistrationRepository {
  registerClinicOwner(request: RegistrationRequest, idempotencyKey: string): Promise<RegistrationResponse>;
  getRegistrationStatus(): Promise<RegistrationStatus>;
}
