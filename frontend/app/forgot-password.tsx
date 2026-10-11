/**
 * Forgot Password Screen
 * Handles password reset requests via Supabase
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authSessionService } from '../features/auth/application/auth-session.service';
import { useClinicTheme } from '../core/theme/useClinicTheme';
import { spacing } from '../core/theme/spacing';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Supabase will send reset link
      // For mobile, the link should use deep linking (novaclinicspro://reset-password)
      // For web, it redirects to the web URL
      const redirectUrl = Platform.OS === 'web' 
        ? `${window.location.origin}/reset-password`
        : 'novaclinicspro://reset-password';

      await authSessionService.requestPasswordReset(data.email, redirectUrl);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.successContainer}>
          <View
            style={[
              styles.successIconContainer,
              { backgroundColor: theme.colors.feedback.successLight },
            ]}
          >
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.feedback.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.text.primary }]}>
            Check Your Email
          </Text>
          <Text style={[styles.successMessage, { color: theme.colors.text.secondary }]}>
            We&apos;ve sent password reset instructions to your email address.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.primary.onPrimary }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary.soft },
              ]}
            >
              <Ionicons name="lock-closed" size={40} color={theme.colors.primary.default} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Forgot Password?
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Enter your email and we&apos;ll send you instructions to reset your password
            </Text>

            {/* Error Alert */}
            {error && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: theme.colors.feedback.errorLight,
                    borderLeftColor: theme.colors.feedback.error,
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={theme.colors.feedback.error} />
                <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                Email Address
              </Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.colors.surface.default,
                        borderColor: errors.email
                          ? theme.colors.feedback.error
                          : theme.colors.border.default,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={theme.colors.text.secondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text.primary }]}
                      placeholder="your.email@example.com"
                      placeholderTextColor={theme.colors.text.tertiary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="email-input"
                    />
                  </View>
                )}
              />
              {errors.email && (
                <Text style={[styles.fieldError, { color: theme.colors.feedback.error }]}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: theme.colors.primary.default,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              testID="send-reset-link-button"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.primary.onPrimary} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/login')}
              disabled={isLoading}
              testID="back-to-login-link"
            >
              <Text style={[styles.loginLinkText, { color: theme.colors.primary.default }]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  backIconButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  fieldError: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
