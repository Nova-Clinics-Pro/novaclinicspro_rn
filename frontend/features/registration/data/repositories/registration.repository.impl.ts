import { getRegistrationStatusApi, registerClinicOwnerApi } from '../datasources/registration.api';
import type { RegistrationRequest, RegistrationResponse, RegistrationStatus } from '../../domain/entities/registration.entity';
import type { RegistrationRepository } from '../../domain/repositories/registration.repository';

class RegistrationRepositoryImpl implements RegistrationRepository {
  registerClinicOwner(request: RegistrationRequest): Promise<RegistrationResponse> {
    return registerClinicOwnerApi(request);
  }

  getRegistrationStatus(userId: string): Promise<RegistrationStatus> {
    return getRegistrationStatusApi(userId);
  }
}

export const registrationRepository: RegistrationRepository = new RegistrationRepositoryImpl();
