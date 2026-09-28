import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateCanonicalOnboardingState } from '../../../onboarding/data/repositories/onboardingFreshness';
import {
  getMultiDayAppointmentSettingApi,
  updateMultiDayAppointmentSettingApi,
  type MultiDayAppointmentSettingDTO,
} from '../datasources/clinicAppointmentSettings.api';

export const clinicAppointmentSettingsKeys = {
  multiDay: (tenantId: string) => ['clinic-appointment-settings', tenantId, 'multiday'] as const,
};

export const useMultiDayAppointmentSettingQuery = (tenantId: string) =>
  useQuery({
    queryKey: clinicAppointmentSettingsKeys.multiDay(tenantId),
    queryFn: () => getMultiDayAppointmentSettingApi(tenantId),
    enabled: Boolean(tenantId),
  });

export const useUpdateMultiDayAppointmentSettingMutation = (tenantId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<MultiDayAppointmentSettingDTO, 'enabled' | 'version'>) =>
      updateMultiDayAppointmentSettingApi(tenantId, input),
    onSuccess: async result => {
      queryClient.setQueryData(clinicAppointmentSettingsKeys.multiDay(tenantId), result);
      await invalidateCanonicalOnboardingState(queryClient, tenantId);
    },
  });
};
