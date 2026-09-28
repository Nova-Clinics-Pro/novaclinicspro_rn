/**
 * Auth API Datasource
 * Handles API calls to FastAPI backend auth endpoints
 */

import { axiosClient } from '../../../../core/api/axiosClient';
import { CurrentUserResponse } from '../models/auth.dtos';

/**
 * Get current user info from JWT token
 * GET /api/v1/auth/me
 */
export const getCurrentUserApi = async (): Promise<CurrentUserResponse> => {
  const response = await axiosClient.get<CurrentUserResponse>('/api/v1/auth/me');
  return response.data;
};
