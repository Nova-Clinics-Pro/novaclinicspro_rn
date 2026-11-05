/**
 * Auth Repository Interface
 * Defines contract for auth data operations
 */

import { AuthUserSession } from '../entities/auth.entity';

export interface AuthRepository {
  /**
   * Get current user session from backend
   */
  getCurrentUser(): Promise<AuthUserSession>;

  /**
   * Ask the backend to synchronise the authoritative effective tenant into the
   * provider token claims (the provider session must be refreshed afterwards).
   */
  refreshEffectiveTenantSession(organizationId: string): Promise<void>;
  /** Revoke the session behind the token on the server; resolves true when the server confirmed. */
  revokeServerSession(accessToken: string): Promise<boolean>;
}
