/**
 * Protected Route Component
 * Wraps routes that require authentication and optionally specific permissions
 * Redirects to login if not authenticated
 * 
 * Permission-based access control (not role-based)
 * The backend uses permissions to control access, roles are dynamic
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 
   * Required permissions to access this route (optional)
   * If not provided, just checks authentication
   * User needs ANY ONE of the listed permissions to access
   */
  requiredPermissions?: string[];
  /**
   * If true, user needs ALL listed permissions (AND logic)
   * If false (default), user needs ANY ONE permission (OR logic)
   */
  requireAll?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  requireAll = false,
}) => {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, currentUser } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.text}>Redirecting to login...</Text>
      </View>
    );
  }

  // Check permission access
  if (requiredPermissions && requiredPermissions.length > 0 && currentUser) {
    const userPermissions = currentUser.permissions || [];
    
    // isOrgAdmin bypasses all permission checks (super admin access)
    if (currentUser.isOrgAdmin) {
      console.log('[ProtectedRoute] User is org admin, granting access');
      return <>{children}</>;
    }
    
    let hasAccess = false;
    
    if (requireAll) {
      // User needs ALL permissions
      hasAccess = requiredPermissions.every(perm => 
        userPermissions.some(userPerm => 
          userPerm.toLowerCase() === perm.toLowerCase()
        )
      );
    } else {
      // User needs ANY ONE permission (OR logic)
      hasAccess = requiredPermissions.some(perm => 
        userPermissions.some(userPerm => 
          userPerm.toLowerCase() === perm.toLowerCase()
        )
      );
    }

    if (!hasAccess) {
      console.log('[ProtectedRoute] User lacks required permissions:', { 
        required: requiredPermissions, 
        has: userPermissions,
        requireAll 
      });
      
      return (
        <View style={styles.container}>
          <Ionicons name="lock-closed" size={64} color={colors.error.main} />
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.text}>You don&apos;t have permission to access this page.</Text>
          <Text style={styles.permissionInfo}>
            Required: {requiredPermissions.join(requireAll ? ' AND ' : ' OR ')}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.primary.main} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    padding: spacing.xl,
  },
  text: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    ...typography.h4,
    color: colors.error.main,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionInfo: {
    ...typography.body2,
    color: colors.text.disabled,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main + '15',
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  backButtonText: {
    ...typography.button,
    color: colors.primary.main,
    marginLeft: spacing.sm,
  },
});

export default ProtectedRoute;
