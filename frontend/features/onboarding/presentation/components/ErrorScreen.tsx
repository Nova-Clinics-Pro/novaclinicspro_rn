/**
 * ErrorScreen Component
 * Displays error state with retry option
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
  retryLabel?: string;
  dismissLabel?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  message,
  onRetry,
  onDismiss,
  title = 'Something went wrong',
  retryLabel = 'Try Again',
  dismissLabel = 'Close',
}) => {
  const theme = useClinicTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="assertive"
      style={[styles.container, {
        backgroundColor: theme.colors.background.default,
        padding: theme.spacing.xl,
      }]}
    >
      <Ionicons 
        name="alert-circle" 
        size={64} 
        color={theme.colors.feedback.error} 
      />
      <Text style={[
        styles.title, 
        theme.typography.h4, 
        { 
          color: theme.colors.text.primary,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.sm 
        }
      ]}>
        {title}
      </Text>
      <Text style={[
        styles.message, 
        theme.typography.body1, 
        { 
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.lg 
        }
      ]}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { 
            backgroundColor: theme.colors.primary.default,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.spacing.sm,
          }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={[
            theme.typography.button, 
            { color: theme.colors.text.onPrimary }
          ]}>
            {retryLabel}
          </Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity
          style={[styles.dismissButton, { marginTop: theme.spacing.md }]}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
        >
          <Text style={[theme.typography.button, { color: theme.colors.primary.default }]}>
            {dismissLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    justifyContent: 'center',
  },
  dismissButton: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
