/**
 * Auth DTOs - Data Transfer Objects
 * Based on OpenAPI CurrentUserResponse schema
 */

/**
 * Current user response from /api/v1/auth/me
 */
export interface CurrentUserResponse {
  user_id: string;
  email: string;
  tenant_id: string | null;
  roles: string[];
  permissions: string[];
  is_org_admin: boolean;
  /** Backend-authoritative classification of the effective tenant. */
  is_demo_tenant: boolean;
  application_status?: 'draft' | 'pending_review' | 'approved' | 'onboarding' | 'active' | 'rejected' | null;
  full_name?: string;
  clinic_name?: string;  // single string (legacy / owner path)
  clinic_names?: string[]; // list shape from new backend implementation
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Supabase session data
 */
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  password: string;
  confirmPassword: string;
}

/**
 * Auth error types for better error handling
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'TOO_MANY_REQUESTS'
  | 'USER_NOT_FOUND'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'PASSWORD_TOO_WEAK'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Map Supabase error messages to error codes
 */
export const mapAuthError = (error: Error): AuthErrorCode => {
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid login credentials')) {
    return 'INVALID_CREDENTIALS';
  }
  if (message.includes('email not confirmed')) {
    return 'EMAIL_NOT_CONFIRMED';
  }
  if (message.includes('too many requests')) {
    return 'TOO_MANY_REQUESTS';
  }
  if (message.includes('user not found')) {
    return 'USER_NOT_FOUND';
  }
  if (message.includes('invalid') && message.includes('token')) {
    return 'INVALID_TOKEN';
  }
  if (message.includes('expired')) {
    return 'TOKEN_EXPIRED';
  }
  if (message.includes('weak') || message.includes('password')) {
    return 'PASSWORD_TOO_WEAK';
  }
  if (message.includes('network')) {
    return 'NETWORK_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
};

/**
 * Get user-friendly error message
 */
export const getAuthErrorMessage = (code: AuthErrorCode): string => {
  const messages: Record<AuthErrorCode, string> = {
    INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
    EMAIL_NOT_CONFIRMED: 'Please verify your email address before logging in.',
    TOO_MANY_REQUESTS: 'Too many attempts. Please wait a few minutes and try again.',
    USER_NOT_FOUND: 'No account found with this email address.',
    INVALID_TOKEN: 'Invalid or expired reset link. Please request a new one.',
    TOKEN_EXPIRED: 'This link has expired. Please request a new password reset.',
    PASSWORD_TOO_WEAK: 'Password is too weak. Please choose a stronger password.',
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  };
  
  return messages[code];
};
