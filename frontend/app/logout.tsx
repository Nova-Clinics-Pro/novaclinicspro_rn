/**
 * Logout Screen
 * Thin route adapter for the canonical authenticated-user logout command.
 */

import { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/useAuth';
import { useAuthStore } from '../features/auth/presentation/providers/auth.store';
import { useClinicTheme } from '../core/theme/useClinicTheme';
import { spacing } from '../core/theme/spacing';

export default function LogoutScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const theme = useClinicTheme();
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        // `logout()` resolves without signing out when the user cancelled the unsaved-work question. The session is
        // then still active: leave this loading screen instead of stranding the user on it.
        if (useAuthStore.getState().isAuthenticated) {
          if (router.canGoBack()) router.back();
          else setCancelled(true);
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    performLogout();
  }, [logout, router]);

  if (cancelled) return <Redirect href="/" />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <ActivityIndicator size="large" color={theme.colors.primary.default} />
      <Text style={[styles.text, { color: theme.colors.text.secondary }]}>
        Signing out...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: spacing.md,
    fontSize: 16,
  },
});
