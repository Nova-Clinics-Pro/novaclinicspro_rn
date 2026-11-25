import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addAllergyApi, changeAllergyApi, checkAllergiesApi, confirmNoKnownAllergiesApi, getClientAllergiesApi } from '../datasources/clientAllergies.api';
import type { Allergy, AllergyAlert, AllergyError, ClientAllergies, NewAllergy } from '../../domain/clientAllergies';

export const clientAllergyKeys = {
  all: ['client-allergies'] as const,
  one: (tenantId: string, clientId: string) => [...clientAllergyKeys.all, tenantId, clientId] as const,
};

/** A patient's allergy status and entries. */
export const useClientAllergiesQuery = (tenantId: string, clientId: string, enabled = true) =>
  useQuery<ClientAllergies, AllergyError>({
    queryKey: clientAllergyKeys.one(tenantId, clientId),
    queryFn: () => getClientAllergiesApi(tenantId, clientId),
    enabled: !!tenantId && !!clientId && enabled,
  });

const useRefreshing = (tenantId: string, clientId: string) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: clientAllergyKeys.one(tenantId, clientId) });
};

export const useAddAllergyMutation = (tenantId: string, clientId: string) => {
  const refresh = useRefreshing(tenantId, clientId);
  return useMutation<Allergy, AllergyError, NewAllergy>({ mutationFn: (allergy) => addAllergyApi(tenantId, clientId, allergy), onSuccess: refresh });
};

export const useChangeAllergyMutation = (tenantId: string, clientId: string) => {
  const refresh = useRefreshing(tenantId, clientId);
  return useMutation<Allergy, AllergyError, { id: string; changes: Partial<NewAllergy> & { status?: 'active' | 'resolved' } }>({
    mutationFn: ({ id, changes }) => changeAllergyApi(tenantId, clientId, id, changes),
    onSuccess: refresh,
  });
};

export const useConfirmNoKnownAllergiesMutation = (tenantId: string, clientId: string) => {
  const refresh = useRefreshing(tenantId, clientId);
  return useMutation<ClientAllergies, AllergyError, void>({ mutationFn: () => confirmNoKnownAllergiesApi(tenantId, clientId), onSuccess: refresh });
};

/** The patient's active allergies that match the given medicines (by name). */
export const useAllergyCheck = (tenantId: string, clientId: string) =>
  useMutation<AllergyAlert[], AllergyError, string[]>({ mutationFn: (medicines) => checkAllergiesApi(tenantId, clientId, medicines) });
