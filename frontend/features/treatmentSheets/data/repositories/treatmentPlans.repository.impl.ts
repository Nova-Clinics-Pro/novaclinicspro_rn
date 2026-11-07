/**
 * Treatment Plan Repository (T-FE-E.2 closure, T-BE-D.4a)
 *
 * React Query hooks over the new Treatment Plan public contract.
 * `byRecommendation` is the query key `SchedulingModule` also uses to
 * obtain `plan_id` for the scheduling-proposal read -- same query key,
 * so react-query dedupes the two modules' fetches into one request,
 * no prop-threading/shared context needed.
 */
import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import {
  createTreatmentPlanApi,
  getTreatmentPlanApi,
  getTreatmentPlanByRecommendationApi,
} from '../datasources/treatmentPlans.api';
import { CreateTreatmentPlanRequest, TreatmentPlanResponse } from '../models/treatmentPlans.dtos';

export const treatmentPlanKeys = {
  all: ['treatmentPlans'] as const,
  detail: (planId: string) => [...treatmentPlanKeys.all, 'detail', planId] as const,
  byRecommendation: (recommendationId: string) =>
    [...treatmentPlanKeys.all, 'byRecommendation', recommendationId] as const,
};

/**
 * Determines whether a Plan already exists for this Recommendation
 * (FR-TP-1 AC15) -- `data` is `null`, not an error, when it doesn't.
 */
export const useTreatmentPlanByRecommendationQuery = (
  recommendationId: string,
  options?: Omit<UseQueryOptions<TreatmentPlanResponse | null, Error>, 'queryKey' | 'queryFn'>,
) =>
  useQuery<TreatmentPlanResponse | null, Error>({
    queryKey: treatmentPlanKeys.byRecommendation(recommendationId),
    queryFn: () => getTreatmentPlanByRecommendationApi(recommendationId),
    enabled: !!recommendationId,
    ...options,
  });

export const useTreatmentPlanByIdQuery = (
  planId: string,
  options?: Omit<UseQueryOptions<TreatmentPlanResponse, Error>, 'queryKey' | 'queryFn'>,
) =>
  useQuery<TreatmentPlanResponse, Error>({
    queryKey: treatmentPlanKeys.detail(planId),
    queryFn: () => getTreatmentPlanApi(planId),
    enabled: !!planId,
    ...options,
  });

export const useCreateTreatmentPlanMutation = (
  options?: UseMutationOptions<TreatmentPlanResponse, Error, CreateTreatmentPlanRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TreatmentPlanResponse, Error, CreateTreatmentPlanRequest>({
    mutationFn: (payload) => createTreatmentPlanApi(payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.setQueryData(
        treatmentPlanKeys.byRecommendation(variables.originating_recommendation_id),
        data,
      );
      queryClient.setQueryData(treatmentPlanKeys.detail(data.id), data);
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
};
