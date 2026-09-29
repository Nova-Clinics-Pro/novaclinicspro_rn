/**
 * LoadingScreen Component
 * Displays loading state with theme styling
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  const theme = useClinicTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary.default} />
      <Text style={[
        styles.message, 
        theme.typography.body1, 
        { 
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.md 
        }
      ]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
