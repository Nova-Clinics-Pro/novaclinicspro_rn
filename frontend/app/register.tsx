/**
 * Clinic Owner Registration Screen
 * Multi-step form for clinic owner self-registration
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClinicTheme } from '../core/theme/useClinicTheme';
import { spacing } from '../core/theme/spacing';
import { RegistrationSubmissionError } from '../features/registration/data/datasources/registration.api';
import { CLINIC_TYPES } from '../features/registration/data/models/registration.dtos';
import { supabase } from '../core/api/supabaseClient';
import { logError } from '../core/utils/errorHandler';
import { RegistrationErrorNotice } from '../features/registration/presentation/components/RegistrationErrorNotice';
import { useRegisterClinicOwner } from '../features/registration/presentation/hooks/useRegisterClinicOwner';
import {
  isRegistrationFieldKey,
  registrationFieldStep,
  registrationFormSchema,
  type RegistrationFormData,
} from '../features/registration/domain/registrationValidation';
import type { RegistrationRequest } from '../features/registration/domain/entities/registration.entity';
import { useTranslation } from '../core/localization/useTranslation';

const STEPS = [
  { title: 'Personal Info', icon: 'person' as const },
  { title: 'Clinic Details', icon: 'business' as const },
  { title: 'Address', icon: 'location' as const },
];

export default function ClinicOwnerRegistrationScreen() {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const registrationMutation = useRegisterClinicOwner();
  const localizeFieldError = (message?: string) =>
    t(message ?? 'errors.auth.registration.validation.field_invalid');
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<RegistrationSubmissionError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    setError: setFieldError,
    clearErrors,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      tenant_name: '',
      clinic_type: '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    if (currentStep === 0) {
      fieldsToValidate = ['full_name', 'email', 'phone', 'password', 'confirmPassword'];
    } else if (currentStep === 1) {
      fieldsToValidate = ['tenant_name', 'clinic_type'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['address_line1', 'city', 'state', 'postal_code'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      setIsLoading(true);
      setSubmissionError(null);
      clearErrors();

      // Build the request payload
      const payload: RegistrationRequest = {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
        tenant_name: data.tenant_name,
        clinic_type: data.clinic_type,
        business_profile: {
          business_name: data.tenant_name,
        },
        contact_details: {
          primary_contact: {
            name: data.full_name,
            phone: data.phone,
            email: data.email,
          },
          clinic_address: {
            street: data.address_line1,
            city: data.city,
            state: data.state,
            pincode: data.postal_code,
            country: 'India',
          },
        },
        app_context: {
          source: Platform.OS === 'ios' ? 'app_store' : Platform.OS === 'android' ? 'play_store' : 'web',
          device_info: {
            platform: Platform.OS,
          },
          urgency: 'within_week',
        },
      };

      const response = await registrationMutation.mutateAsync(payload);

      if (response.success) {
        // Sign out the user immediately after registration
        // This prevents session issues when redirecting
        await supabase.auth.signOut();

        // Check if application was auto-approved
        const isAutoApproved = response.auto_approval_result?.eligible && 
                               response.application_status?.toUpperCase() === 'APPROVED';
        
        if (Platform.OS === 'web') {
          // Web: Use direct navigation instead of Alert
          router.replace('/login');
        } else {
          // Mobile: Use Alert with callback
          if (isAutoApproved) {
            // Auto-approved - go directly to login (they need to log in first)
            Alert.alert(
              'Registration Successful!',
              'Your application has been approved! Please login to continue setting up your clinic.',
              [
                {
                  text: 'Go to Login',
                  onPress: () => router.replace('/login'),
                },
              ]
            );
          } else {
            // Pending review - go to login
            Alert.alert(
              'Registration Successful!',
              `Your application has been submitted for review. ${response.next_steps?.[0] || 'You can now login with your credentials.'}`,
              [
                {
                  text: 'Go to Login',
                  onPress: () => router.replace('/login'),
                },
              ]
            );
          }
        }
      } else {
        throw new Error(response.validation_errors?.[0] || 'Registration failed');
      }
    } catch (err: unknown) {
      const registrationError =
        err instanceof RegistrationSubmissionError
          ? err
          : new RegistrationSubmissionError('UNEXPECTED');
      if (registrationError.validationIssues.length > 0) {
        const firstFieldIssue = registrationError.validationIssues.find(
          issue => isRegistrationFieldKey(issue.fieldKey)
        );
        registrationError.validationIssues.forEach(issue => {
          if (isRegistrationFieldKey(issue.fieldKey)) {
            setFieldError(issue.fieldKey, { type: 'server', message: `errors.auth.registration.validation.${issue.code}` });
          }
        });
        if (firstFieldIssue && isRegistrationFieldKey(firstFieldIssue.fieldKey)) {
          setCurrentStep(registrationFieldStep[firstFieldIssue.fieldKey]);
        }
        return;
      }
      if (!registrationError.recoverable) {
        logError('registration.submit', registrationError);
      }
      setSubmissionError(registrationError);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  index <= currentStep
                    ? theme.colors.primary.default
                    : theme.colors.border.default,
              },
            ]}
          >
            <Ionicons
              name={index < currentStep ? 'checkmark' : step.icon}
              size={20}
              color={index <= currentStep ? theme.colors.primary.onPrimary : theme.colors.text.tertiary}
            />
          </View>
          <Text
            style={[
              styles.stepLabel,
              {
                color:
                  index <= currentStep
                    ? theme.colors.text.primary
                    : theme.colors.text.tertiary,
              },
            ]}
          >
            {step.title}
          </Text>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    index < currentStep
                      ? theme.colors.primary.default
                      : theme.colors.border.default,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
        Personal Information
      </Text>

      {/* Full Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Full Name *</Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.full_name
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
            />
          )}
        />
        {errors.full_name && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.full_name.message)}
          </Text>
        )}
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email *</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.email
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="your.email@example.com"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          )}
        />
        {errors.email && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.email.message)}
          </Text>
        )}
      </View>

      {/* Phone */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Phone *</Text>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.phone
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="+91 1234567890"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          )}
        />
        {errors.phone && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.phone.message)}
          </Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Password *</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: theme.colors.surface.default,
                    color: theme.colors.text.primary,
                    borderColor: errors.password
                      ? theme.colors.feedback.error
                      : theme.colors.border.default,
                  },
                ]}
                placeholder="Minimum 8 characters"
                placeholderTextColor={theme.colors.text.tertiary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.password.message)}
          </Text>
        )}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>
          Confirm Password *
        </Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: theme.colors.surface.default,
                    color: theme.colors.text.primary,
                    borderColor: errors.confirmPassword
                      ? theme.colors.feedback.error
                      : theme.colors.border.default,
                  },
                ]}
                placeholder="Re-enter password"
                placeholderTextColor={theme.colors.text.tertiary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.confirmPassword && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.confirmPassword.message)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
        Clinic Details
      </Text>

      {/* Clinic Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Clinic Name *</Text>
        <Controller
          control={control}
          name="tenant_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.tenant_name
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="Your Clinic Name"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
            />
          )}
        />
        {errors.tenant_name && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.tenant_name.message)}
          </Text>
        )}
      </View>

      {/* Clinic Type */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Clinic Type *</Text>
        <Controller
          control={control}
          name="clinic_type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.clinicTypeContainer}>
              {CLINIC_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.clinicTypeCard,
                    {
                      backgroundColor:
                        value === type
                          ? theme.colors.primary.soft
                          : theme.colors.surface.default,
                      borderColor:
                        value === type
                          ? theme.colors.primary.default
                          : theme.colors.border.default,
                    },
                  ]}
                  onPress={() => onChange(type)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.clinicTypeText,
                      {
                        color:
                          value === type
                            ? theme.colors.primary.default
                            : theme.colors.text.primary,
                      },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </Text>
                  {value === type && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.primary.default}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.clinic_type && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.clinic_type.message)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
        Clinic Address
      </Text>

      {/* Address Line 1 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Address *</Text>
        <Controller
          control={control}
          name="address_line1"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.address_line1
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="Street address"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
            />
          )}
        />
        {errors.address_line1 && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.address_line1.message)}
          </Text>
        )}
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>City *</Text>
        <Controller
          control={control}
          name="city"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.default,
                  color: theme.colors.text.primary,
                  borderColor: errors.city
                    ? theme.colors.feedback.error
                    : theme.colors.border.default,
                },
              ]}
              placeholder="City"
              placeholderTextColor={theme.colors.text.tertiary}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
            />
          )}
        />
        {errors.city && (
          <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.city.message)}
          </Text>
        )}
      </View>

      {/* State and Postal Code in a row */}
      <View style={styles.rowContainer}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>State *</Text>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface.default,
                    color: theme.colors.text.primary,
                    borderColor: errors.state
                      ? theme.colors.feedback.error
                      : theme.colors.border.default,
                  },
                ]}
                placeholder="State"
                placeholderTextColor={theme.colors.text.tertiary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
              />
            )}
          />
          {errors.state && (
            <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.state.message)}
            </Text>
          )}
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Postal Code *</Text>
          <Controller
            control={control}
            name="postal_code"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface.default,
                    color: theme.colors.text.primary,
                    borderColor: errors.postal_code
                      ? theme.colors.feedback.error
                      : theme.colors.border.default,
                  },
                ]}
                placeholder="PIN"
                placeholderTextColor={theme.colors.text.tertiary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                editable={!isLoading}
              />
            )}
          />
          {errors.postal_code && (
            <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
            {localizeFieldError(errors.postal_code.message)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Register Clinic
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Form Steps */}
          <View style={styles.formContainer}>
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </View>

          {submissionError ? (
            <RegistrationErrorNotice error={submissionError} onSignIn={() => router.replace('/login')} />
          ) : null}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    borderColor: theme.colors.border.default,
                  },
                ]}
                onPress={handleBack}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
                <Text style={[styles.backButtonText, { color: theme.colors.text.primary }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}

            {currentStep < STEPS.length - 1 ? (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: theme.colors.primary.default,
                    flex: currentStep > 0 ? 1 : undefined,
                  },
                ]}
                onPress={handleNext}
                disabled={isLoading}
              >
                <Text style={[styles.nextButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Next
                </Text>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.primary.onPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.colors.primary.default,
                    flex: 1,
                    opacity: isLoading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.primary.onPrimary} />
                ) : (
                  <>
                    <Text
                      style={[styles.submitButtonText, { color: theme.colors.primary.onPrimary }]}
                    >
                      Submit Registration
                    </Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.primary.onPrimary}
                    />
                  </>
                )}
              </TouchableOpacity>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  stepItem: {
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepLine: {
    position: 'absolute',
    top: 20,
    left: 50,
    width: 40,
    height: 2,
  },
  formContainer: {
    paddingHorizontal: spacing.lg,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  clinicTypeContainer: {
    gap: spacing.sm,
  },
  clinicTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
  },
  clinicTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowContainer: {
    flexDirection: 'row',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    cursor: 'pointer' as any,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.xs,
    cursor: 'pointer' as any,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.xs,
    cursor: 'pointer' as any,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
