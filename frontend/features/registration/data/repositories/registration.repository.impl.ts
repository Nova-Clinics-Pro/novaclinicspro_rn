import { getRegistrationStatusApi, registerClinicOwnerApi } from '../datasources/registration.api';
import type { RegistrationRequest, RegistrationResponse, RegistrationStatus } from '../../domain/entities/registration.entity';
import type { RegistrationRepository } from '../../domain/repositories/registration.repository';

class RegistrationRepositoryImpl implements RegistrationRepository {
  registerClinicOwner(request: RegistrationRequest, idempotencyKey: string): Promise<RegistrationResponse> {
    return registerClinicOwnerApi(request, idempotencyKey);
  }

  getRegistrationStatus(): Promise<RegistrationStatus> {
    return getRegistrationStatusApi();
  }
}

export const registrationRepository: RegistrationRepository = new RegistrationRepositoryImpl();
