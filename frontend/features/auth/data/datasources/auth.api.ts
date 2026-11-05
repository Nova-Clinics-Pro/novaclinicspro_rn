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

/**
 * Ask the backend to project the authoritative effective tenant into the
 * provider token claims. The caller must then refresh the provider session.
 * POST /api/v1/auth/organizations/{organization_id}/session-refresh
 */
export const refreshEffectiveTenantSessionApi = async (organizationId: string): Promise<void> => {
  await axiosClient.post(`/api/v1/auth/organizations/${organizationId}/session-refresh`);
};

export interface ServerLogoutResponse {
  status: string;
  provider_session_revoked: boolean;
}

/**
 * Revoke the session behind `accessToken` on the server (idempotent). The token
 * is passed explicitly because local session state is already cleared when
 * logout calls this. POST /api/v1/auth/logout
 */
export const revokeServerSessionApi = async (accessToken: string): Promise<ServerLogoutResponse> => {
  const response = await axiosClient.post<ServerLogoutResponse>('/api/v1/auth/logout', null, {
    headers: { Authorization: `Bearer ${accessToken}` },
    skipAuthRefreshRetry: true,
    timeout: 5000,
  });
  return response.data;
};
