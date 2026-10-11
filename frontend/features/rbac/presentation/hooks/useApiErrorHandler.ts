/**
 * useApiErrorHandler Hook
 * Handles API errors with user-friendly messages and accessibility announcements
 */

import { useCallback } from 'react';
import { Alert, AccessibilityInfo, Platform } from 'react-native';
import { RbacOperationError } from '../../domain/errors/rbacOperationError';

interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  contextMessage?: string;
}

/**
 * Map of user-friendly error messages for RBAC operations
 */
const rbacErrorMessages: Record<string, string> = {
  // Generic errors
  'API_ERROR': 'An error occurred. Please try again.',
  'CORS_ERROR': 'Unable to connect to server. Please check your connection.',
  'UNKNOWN_ERROR': 'An unexpected error occurred.',
  'NETWORK_ERROR': 'Network connection failed. Please check your internet.',
  
  // Role errors
  'ROLE_NOT_FOUND': 'The requested role was not found.',
  'ROLE_IN_USE': 'This role cannot be deleted as it is assigned to users.',
  'SYSTEM_ROLE': 'System roles cannot be modified or deleted.',
  'DUPLICATE_ROLE': 'A role with this name already exists.',
  
  // Permission errors
  'PERMISSION_NOT_FOUND': 'The requested permission was not found.',
  'PERMISSION_DISABLED': 'This permission is not available for your subscription.',
  
  // User role errors
  'USER_NOT_FOUND': 'The requested user was not found.',
  'ROLE_ALREADY_ASSIGNED': 'This role is already assigned to the user.',
  'CANNOT_REVOKE_LAST_ADMIN': 'Cannot remove the last admin role from this tenant.',
  
  // Auth errors
  'UNAUTHORIZED': 'You are not authorized to perform this action.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
};

/**
 * Get user-friendly message for an error
 */
const getUserFriendlyMessage = (error: RbacOperationError, contextMessage?: string): string => {
  // Check for specific error codes
  if (error.code && rbacErrorMessages[error.code]) {
    return rbacErrorMessages[error.code];
  }
  
  switch (error.kind) {
      case 'VALIDATION_FAILED':
        return contextMessage 
          ? `${contextMessage}: Invalid request data.`
          : 'Invalid request data. Please check your input.';
      case 'AUTHENTICATION_REQUIRED':
        return 'Your session has expired. Please log in again.';
      case 'PERMISSION_DENIED':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return contextMessage
          ? `${contextMessage}: The requested resource was not found.`
          : 'The requested resource was not found.';
      case 'CONFLICT':
        return 'This operation conflicts with existing data.';
      case 'NETWORK_FAILED':
        return rbacErrorMessages.NETWORK_ERROR;
      case 'SAVE_FAILED':
        return 'Server error. Please try again later.';
      default:
        return rbacErrorMessages.UNKNOWN_ERROR;
  }
};

export const useApiErrorHandler = () => {
  /**
   * Handle an API error
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const { showAlert = true, logError = true, contextMessage } = options;
      
      const normalizedError = error instanceof RbacOperationError
        ? error
        : new RbacOperationError('SAVE_FAILED');
      
      // Get user-friendly message
      const userMessage = getUserFriendlyMessage(normalizedError, contextMessage);
      
      // Log the error if enabled
      if (logError) {
        console.error('RBAC Error:', {
          code: normalizedError.code,
          kind: normalizedError.kind,
          context: contextMessage,
        });
      }
      
      // Announce error for screen readers (accessibility)
      if (Platform.OS !== 'web') {
        AccessibilityInfo.announceForAccessibility(
          `Error: ${userMessage}`
        );
      }
      
      // Show alert if enabled
      if (showAlert) {
        Alert.alert('Error', userMessage, [{ text: 'OK' }]);
      }
      
      return {
        normalizedError,
        userMessage,
      };
    },
    []
  );

  /**
   * Create an error handler for React Query onError callback
   */
  const createQueryErrorHandler = useCallback(
    (contextMessage: string, options: Omit<ErrorHandlerOptions, 'contextMessage'> = {}) => {
      return (error: unknown) => handleError(error, { ...options, contextMessage });
    },
    [handleError]
  );

  /**
   * Create an error handler for mutations with custom alert options
   */
  const createMutationErrorHandler = useCallback(
    (
      contextMessage: string,
      onErrorCallback?: (error: RbacOperationError, userMessage: string) => void
    ) => {
      return (error: unknown) => {
        const result = handleError(error, {
          contextMessage,
          showAlert: !onErrorCallback, // Don't show alert if custom callback provided
        });
        
        if (onErrorCallback) {
          onErrorCallback(result.normalizedError, result.userMessage);
        }
      };
    },
    [handleError]
  );

  return {
    handleError,
    createQueryErrorHandler,
    createMutationErrorHandler,
    getUserFriendlyMessage,
  };
};
