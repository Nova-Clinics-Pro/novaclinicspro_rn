/**
 * Patient Feedback Form Screen
 * Public page for patients to submit feedback via token-based link
 * Route: /feedback/[token]
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { StarRatingInput } from '../components/StarRatingInput';
import {
  useFeedbackFormQuery,
  useSubmitFeedbackMutation,
} from '../../data/repositories/feedback.repository.impl';
import type {
  FeedbackSubmitPayload,
  DoctorFeedback,
  TherapistFeedback,
  ClinicFeedback,
} from '../../data/models/feedback.dtos';
import { formatFeedbackDate } from '../../domain/entities/feedback.entity';
import { FeedbackFormError } from '../../domain/errors/feedbackFormError';

// ==================== Form Schema ====================

const feedbackFormSchema = z.object({
  // Doctor feedback
  doctorRating: z.number().min(1).max(5).optional(),
  doctorProfessionalism: z.number().min(1).max(5).optional(),
  doctorCommunication: z.number().min(1).max(5).optional(),
  doctorTreatmentEffectiveness: z.number().min(1).max(5).optional(),
  doctorComments: z.string().max(500).optional(),
  // Therapist feedback (will be arrays per therapist)
  // Clinic feedback
  clinicRating: z.number().min(1, 'Please rate the clinic').max(5),
  clinicCleanliness: z.number().min(1).max(5).optional(),
  clinicComfort: z.number().min(1).max(5).optional(),
  clinicStaffProfessionalism: z.number().min(1).max(5).optional(),
  clinicSchedulingEase: z.number().min(1).max(5).optional(),
  clinicValueForMoney: z.number().min(1).max(5).optional(),
  clinicComments: z.string().max(500).optional(),
  // Google review opt-in
  optedForGoogleReview: z.boolean(),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

// ==================== Component ====================

export const FeedbackFormScreen: React.FC = () => {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [therapistRatings, setTherapistRatings] = useState<Record<string, number>>({});
  const [therapistComments, setTherapistComments] = useState<Record<string, string>>({});

  // Fetch form data
  const {
    data: formData,
    isLoading,
    isError,
    error,
  } = useFeedbackFormQuery(token || '');

  // Submit mutation
  const submitMutation = useSubmitFeedbackMutation(token || '');

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      clinicRating: 0,
      optedForGoogleReview: false,
    },
  });

  const clinicRating = watch('clinicRating');
  const optedForGoogleReview = watch('optedForGoogleReview');

  // Build submit payload
  const onSubmit = async (data: FeedbackFormValues) => {
    if (!formData) return;

    // Build doctor feedback if doctor present
    let doctorFeedback: DoctorFeedback | undefined;
    if (formData.doctor && data.doctorRating) {
      doctorFeedback = {
        rating: data.doctorRating,
        professionalism: data.doctorProfessionalism,
        communication: data.doctorCommunication,
        treatment_effectiveness: data.doctorTreatmentEffectiveness,
        comments: data.doctorComments,
      };
    }

    // Build therapist feedback
    const therapistFeedback: TherapistFeedback[] = formData.therapists
      .map((t) => ({
        therapist_id: t.id,
        rating: therapistRatings[t.id] || 0,
        comments: therapistComments[t.id],
      }))
      .filter((tf) => tf.rating > 0);

    // Build clinic feedback (required)
    const clinicFeedback: ClinicFeedback = {
      rating: data.clinicRating,
      cleanliness: data.clinicCleanliness,
      comfort: data.clinicComfort,
      staff_professionalism: data.clinicStaffProfessionalism,
      scheduling_ease: data.clinicSchedulingEase,
      value_for_money: data.clinicValueForMoney,
      comments: data.clinicComments,
    };

    const payload: FeedbackSubmitPayload = {
      doctor_feedback: doctorFeedback || null,
      therapist_feedback: therapistFeedback,
      clinic_feedback: clinicFeedback,
      opted_for_google_review: data.optedForGoogleReview,
    };

    await submitMutation.mutateAsync(payload);
  };

  // Handle Google Review link
  const handleGoogleReview = () => {
    if (submitMutation.data?.google_review_link) {
      Linking.openURL(submitMutation.data.google_review_link);
    } else if (formData?.google_review_link) {
      Linking.openURL(formData.google_review_link);
    }
  };

  // ==================== Render States ====================

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading feedback form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !formData) {
    const errorMessage = error instanceof FeedbackFormError && error.kind === 'INVALID_LINK'
      ? 'This feedback link is invalid or has expired.'
      : error instanceof FeedbackFormError && error.kind === 'ALREADY_SUBMITTED'
      ? 'This feedback has already been submitted.'
      : 'Could not load the feedback form. Please try again later.';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          </View>
          <Text style={styles.errorTitle}>Unable to Load Form</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state (after submission)
  if (submitMutation.isSuccess) {
    const showGoogleReviewPrompt =
      optedForGoogleReview &&
      clinicRating >= 4 &&
      (submitMutation.data?.google_review_link || formData.google_review_link);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success.main} />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successMessage}>
            Your feedback has been submitted successfully. We appreciate your time and input.
          </Text>
          
          {showGoogleReviewPrompt && (
            <View style={styles.googleReviewContainer}>
              <Text style={styles.googleReviewText}>
                Would you like to share your experience on Google Reviews?
              </Text>
              <TouchableOpacity
                style={styles.googleReviewButton}
                onPress={handleGoogleReview}
                testID="google-review-button"
              >
                <Ionicons name="logo-google" size={20} color={colors.common.white} />
                <Text style={styles.googleReviewButtonText}>Leave a Google Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ==================== Main Form ====================

  const hasDoctor = !!formData.doctor;
  const hasTherapists = formData.therapists.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <View style={styles.clinicBadge}>
              <Ionicons name="medical" size={24} color={colors.primary.main} />
            </View>
            <Text style={styles.clinicName}>{formData.clinic_name}</Text>
            <Text style={styles.appointmentInfo}>
              Appointment on {formatFeedbackDate(formData.appointment_date)}
            </Text>
          </View>

          <Text style={styles.formTitle}>We Value Your Feedback</Text>
          <Text style={styles.formSubtitle}>
            Please take a moment to share your experience with us.
          </Text>

          {/* Section A: Doctor Feedback */}
          {hasDoctor && (
            <View style={styles.section} testID="doctor-feedback-section">
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={colors.primary.main} />
                <Text style={styles.sectionTitle}>Doctor Feedback</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                How was your experience with Dr. {formData.doctor?.name}?
              </Text>

              <Controller
                control={control}
                name="doctorRating"
                render={({ field: { onChange, value } }) => (
                  <StarRatingInput
                    value={value || 0}
                    onChange={onChange}
                    label="Overall Rating"
                    size={36}
                    testID="doctor-rating"
                  />
                )}
              />

              <Controller
                control={control}
                name="doctorProfessionalism"
                render={({ field: { onChange, value } }) => (
                  <StarRatingInput
                    value={value || 0}
                    onChange={onChange}
                    label="Professionalism"
                    size={28}
                    testID="doctor-professionalism"
                  />
                )}
              />

              <Controller
                control={control}
                name="doctorCommunication"
                render={({ field: { onChange, value } }) => (
                  <StarRatingInput
                    value={value || 0}
                    onChange={onChange}
                    label="Communication"
                    size={28}
                    testID="doctor-communication"
                  />
                )}
              />

              <Controller
                control={control}
                name="doctorTreatmentEffectiveness"
                render={({ field: { onChange, value } }) => (
                  <StarRatingInput
                    value={value || 0}
                    onChange={onChange}
                    label="Treatment Effectiveness"
                    size={28}
                    testID="doctor-effectiveness"
                  />
                )}
              />

              <Controller
                control={control}
                name="doctorComments"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Comments (optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Share your thoughts about the doctor..."
                      placeholderTextColor={colors.text.tertiary}
                      multiline
                      maxLength={500}
                      testID="doctor-comments"
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* Section B: Therapist Feedback */}
          {hasTherapists && (
            <View style={styles.section} testID="therapist-feedback-section">
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color={colors.success.main} />
                <Text style={styles.sectionTitle}>Therapist Feedback</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                How was your experience with our therapists?
              </Text>

              {formData.therapists.map((therapist, index) => (
                <View key={therapist.id} style={styles.therapistCard}>
                  <Text style={styles.therapistName}>{therapist.name}</Text>
                  <StarRatingInput
                    value={therapistRatings[therapist.id] || 0}
                    onChange={(rating) =>
                      setTherapistRatings((prev) => ({ ...prev, [therapist.id]: rating }))
                    }
                    label="Rating"
                    size={32}
                    testID={`therapist-rating-${index}`}
                  />
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Comments (optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={therapistComments[therapist.id] || ''}
                      onChangeText={(text) =>
                        setTherapistComments((prev) => ({ ...prev, [therapist.id]: text }))
                      }
                      placeholder="Share your thoughts..."
                      placeholderTextColor={colors.text.tertiary}
                      multiline
                      maxLength={500}
                      testID={`therapist-comments-${index}`}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section C: Clinic Feedback (Always Required) */}
          <View style={styles.section} testID="clinic-feedback-section">
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={20} color={colors.warning.main} />
              <Text style={styles.sectionTitle}>Clinic Experience</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              How was your overall experience at our clinic?
            </Text>

            <Controller
              control={control}
              name="clinicRating"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Overall Rating"
                  required
                  error={errors.clinicRating?.message}
                  size={40}
                  testID="clinic-rating"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicCleanliness"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Cleanliness"
                  size={28}
                  testID="clinic-cleanliness"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicComfort"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Comfort"
                  size={28}
                  testID="clinic-comfort"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicStaffProfessionalism"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Staff Professionalism"
                  size={28}
                  testID="clinic-staff"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicSchedulingEase"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Scheduling Ease"
                  size={28}
                  testID="clinic-scheduling"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicValueForMoney"
              render={({ field: { onChange, value } }) => (
                <StarRatingInput
                  value={value || 0}
                  onChange={onChange}
                  label="Value for Money"
                  size={28}
                  testID="clinic-value"
                />
              )}
            />

            <Controller
              control={control}
              name="clinicComments"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Additional Comments (optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputLarge]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Share any additional feedback about your experience..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    maxLength={500}
                    testID="clinic-comments"
                  />
                </View>
              )}
            />
          </View>

          {/* Google Review Opt-in */}
          {formData.google_review_link && (
            <View style={styles.googleOptInContainer}>
              <Controller
                control={control}
                name="optedForGoogleReview"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => onChange(!value)}
                    testID="google-review-optin"
                  >
                    <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                      {value && <Ionicons name="checkmark" size={16} color={colors.common.white} />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I&apos;d like to share my experience on Google Reviews
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitMutation.isPending}
            testID="submit-feedback-button"
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.common.white} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.common.white} />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Submit Error */}
          {submitMutation.isError && (
            <View style={styles.submitError}>
              <Ionicons name="alert-circle" size={16} color={colors.error.main} />
              <Text style={styles.submitErrorText}>
                Could not submit feedback. Please try again.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorIconContainer: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h3,
    color: colors.success.main,
    marginBottom: spacing.sm,
  },
  successMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  googleReviewContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  googleReviewText: {
    ...typography.body2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  googleReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  googleReviewButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  clinicBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  clinicName: {
    ...typography.h5,
    color: colors.text.primary,
    textAlign: 'center',
  },
  appointmentInfo: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  formTitle: {
    ...typography.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  therapistCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  therapistName: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    padding: spacing.sm,
    ...typography.body2,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textInputLarge: {
    minHeight: 100,
  },
  googleOptInContainer: {
    marginBottom: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary.main,
  },
  checkboxLabel: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  submitErrorText: {
    ...typography.caption,
    color: colors.error.main,
  },
});

export default FeedbackFormScreen;
