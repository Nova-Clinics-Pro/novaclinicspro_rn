import { axiosClient } from '../../../../core/api/axiosClient';
import { type ActivateCommercialTrialRequestDTO, CommercialTrialDatasourceError, type CommercialTrialHandoffDTO, type CommercialTrialResponseDTO, type CommercialRetentionResponseDTO, type GrantCommercialTrialExtensionDTO, type RequestCommercialTrialExtensionDTO } from '../../contracts/commercial-trial';

const fail = (error: any): never => {
  if (error?.code === 'ERR_CANCELED') throw error;
  const detail = error?.response?.data?.detail ?? {};
  const body = detail.error ?? detail;
  throw new CommercialTrialDatasourceError(body.error_code ?? 'commercial_trial.application_failure', body.message_token ?? 'errors.commercialTrial.application_failure', Boolean(body.retryable), error?.response?.status);
};
const headers = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } });
export const getCommercialTrialApi = async (tenantId: string, signal?: AbortSignal): Promise<CommercialTrialResponseDTO> => { try { return (await axiosClient.get<CommercialTrialResponseDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial`, { signal })).data; } catch (error) { return fail(error); } };
export const getCommercialRetentionApi = async (tenantId: string, signal?: AbortSignal): Promise<CommercialRetentionResponseDTO> => { try { return (await axiosClient.get<CommercialRetentionResponseDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial/retention`, { signal })).data; } catch (error) { return fail(error); } };
export const activateCommercialTrialApi = async (tenantId: string, request: ActivateCommercialTrialRequestDTO, idempotencyKey: string): Promise<CommercialTrialResponseDTO> => { try { return (await axiosClient.post<CommercialTrialResponseDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial/activate`, request, headers(idempotencyKey))).data; } catch (error) { return fail(error); } };
export const requestCommercialTrialExtensionApi = async (tenantId: string, request: RequestCommercialTrialExtensionDTO, idempotencyKey: string): Promise<CommercialTrialResponseDTO> => { try { return (await axiosClient.post<CommercialTrialResponseDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial/extension-requests`, request, headers(idempotencyKey))).data; } catch (error) { return fail(error); } };
export const grantCommercialTrialExtensionApi = async (tenantId: string, request: GrantCommercialTrialExtensionDTO, idempotencyKey: string): Promise<CommercialTrialResponseDTO> => { try { return (await axiosClient.post<CommercialTrialResponseDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial/extensions`, request, headers(idempotencyKey))).data; } catch (error) { return fail(error); } };
export const requestCommercialTrialSubscriptionApi = async (tenantId: string): Promise<CommercialTrialHandoffDTO> => { try { return (await axiosClient.post<CommercialTrialHandoffDTO>(`/api/v1/onboarding/${tenantId}/commercial-trial/subscription-request`)).data; } catch (error) { return fail(error); } };
