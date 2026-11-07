/**
 * Treatment Plan API (T-FE-E.2 closure, T-BE-D.4a)
 *
 * All three endpoints derive tenant_id server-side from the
 * authenticated context (no tenant_id URL segment) — matches the
 * backend router's own convention (`treatment_plans_router.py`), the
 * same pattern already used by `scheduleRowApi`/`sendToSchedulingApi`.
 */
import { axiosClient } from '../../../../core/api/axiosClient';
import { CreateTreatmentPlanRequest, TreatmentPlanResponse } from '../models/treatmentPlans.dtos';

/** POST /api/v1/treatment-plans */
export const createTreatmentPlanApi = async (
  payload: CreateTreatmentPlanRequest,
): Promise<TreatmentPlanResponse> => {
  const response = await axiosClient.post('/api/v1/treatment-plans', payload);
  return response.data;
};

/** GET /api/v1/treatment-plans/{plan_id} */
export const getTreatmentPlanApi = async (planId: string): Promise<TreatmentPlanResponse> => {
  const response = await axiosClient.get(`/api/v1/treatment-plans/${planId}`);
  return response.data;
};

/**
 * GET /api/v1/treatment-plans/by-recommendation/{recommendation_id}
 * Returns null (200 body `null`), not a 404, when no Plan has been
 * created from this Recommendation yet -- a valid, expected state.
 */
export const getTreatmentPlanByRecommendationApi = async (
  recommendationId: string,
): Promise<TreatmentPlanResponse | null> => {
  const response = await axiosClient.get(`/api/v1/treatment-plans/by-recommendation/${recommendationId}`);
  return response.data;
};
