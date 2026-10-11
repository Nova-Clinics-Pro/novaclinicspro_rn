/**
 * Logout Screen
 * Thin route adapter for the canonical authenticated-user logout command.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '../features/auth/presentation/hooks/useAuth';
import { useClinicTheme } from '../core/theme/useClinicTheme';
import { spacing } from '../core/theme/spacing';

export default function LogoutScreen() {
  const { logout } = useAuth();
  const theme = useClinicTheme();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    performLogout();
  }, [logout]);

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
