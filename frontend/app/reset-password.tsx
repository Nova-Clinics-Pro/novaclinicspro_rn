/**
 * Reset Password Screen
 * Handles password reset confirmation after user clicks email link
 * 
 * Flow:
 * 1. User clicks reset link from email
 * 2. Supabase redirects to this screen with access_token in URL
 * 3. User enters new password
 * 4. Password is updated via Supabase
 */

import React, { useState, useEffect } from 'react';
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
import { supabase } from '../core/api/supabaseClient';
import { useClinicTheme } from '../core/theme/useClinicTheme';
import { spacing } from '../core/theme/spacing';

// Password validation schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Verify the session from the URL parameters
  useEffect(() => {
    const verifySession = async () => {
      try {
        setIsVerifying(true);
        setError(null);

        // Check if we have a valid session from the reset link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // If no session, the link may be invalid or expired
        if (!session) {
          // Try to get session from URL hash (for web)
          if (Platform.OS === 'web') {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            if (type === 'recovery' && accessToken && refreshToken) {
              const { error: setError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (setError) {
                throw setError;
              }
            } else {
              throw new Error('Invalid or expired reset link');
            }
          } else {
            throw new Error('Invalid or expired reset link');
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid or expired reset link. Please request a new password reset.'
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verifySession();
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out to clear the recovery session
      await supabase.auth.signOut();

      setSuccess(true);
    } catch (err) {
      console.error('Password update error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verifying session state
  if (isVerifying) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.verifyingText, { color: theme.colors.text.secondary }]}>
            Verifying reset link...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Invalid/expired link error state
  if (error && !success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.errorIconContainer,
              { backgroundColor: theme.colors.feedback.errorLight },
            ]}
          >
            <Ionicons name="alert-circle" size={64} color={theme.colors.feedback.error} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Link Expired
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.text.secondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
              Request New Link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.primary.default }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.successIconContainer,
              { backgroundColor: theme.colors.feedback.successLight },
            ]}
          >
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.feedback.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.colors.text.primary }]}>
            Password Updated!
          </Text>
          <Text style={[styles.successMessage, { color: theme.colors.text.secondary }]}>
            Your password has been successfully updated. You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => router.replace('/login')}
            testID="go-to-login-button"
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.primary.onPrimary }]}>
              Go to Login
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Password reset form
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
          <View style={styles.content}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.primary.soft },
              ]}
            >
              <Ionicons name="key" size={40} color={theme.colors.primary.default} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Create New Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Please enter your new password below. Make sure it&apos;s strong and secure.
            </Text>

            {/* Form Error */}
            {error && (
              <View
                style={[
                  styles.formErrorContainer,
                  {
                    backgroundColor: theme.colors.feedback.errorLight,
                    borderLeftColor: theme.colors.feedback.error,
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={20} color={theme.colors.feedback.error} />
                <Text style={[styles.formErrorText, { color: theme.colors.feedback.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* New Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                New Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.colors.surface.default,
                        borderColor: errors.password
                          ? theme.colors.feedback.error
                          : theme.colors.border.default,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.text.secondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text.primary }]}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.text.tertiary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="new-password-input"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={[styles.fieldError, { color: theme.colors.feedback.error }]}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.colors.surface.default,
                        borderColor: errors.confirmPassword
                          ? theme.colors.feedback.error
                          : theme.colors.border.default,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={theme.colors.text.secondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text.primary }]}
                      placeholder="Confirm new password"
                      placeholderTextColor={theme.colors.text.tertiary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      testID="confirm-password-input"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.confirmPassword && (
                <Text style={[styles.fieldError, { color: theme.colors.feedback.error }]}>
                  {errors.confirmPassword.message}
                </Text>
              )}
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: theme.colors.text.secondary }]}>
                Password Requirements:
              </Text>
              <View style={styles.requirementItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.colors.text.tertiary}
                />
                <Text style={[styles.requirementText, { color: theme.colors.text.tertiary }]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.colors.text.tertiary}
                />
                <Text style={[styles.requirementText, { color: theme.colors.text.tertiary }]}>
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.colors.text.tertiary}
                />
                <Text style={[styles.requirementText, { color: theme.colors.text.tertiary }]}>
                  One lowercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.colors.text.tertiary}
                />
                <Text style={[styles.requirementText, { color: theme.colors.text.tertiary }]}>
                  One number
                </Text>
              </View>
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
              testID="reset-password-button"
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.primary.onPrimary} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Reset Password
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/login')}
              disabled={isLoading}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  verifyingText: {
    fontSize: 16,
    marginTop: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
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
  formErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  formErrorText: {
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
  eyeButton: {
    padding: spacing.xs,
  },
  fieldError: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  requirementsContainer: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
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
  // Success state
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
  // Error state
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
