/**
 * Client Form Component
 * Form for creating/editing clients
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { DateField } from '../../../../core/components/DateField';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  ClientCreate,
  ClientUpdate,
  ClientResponse,
  GENDERS,
  BLOOD_GROUPS,
  calculateAge,
} from '../../data/models/clients.dtos';

// ============================================
// VALIDATION SCHEMA
// ============================================

const clientSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  phone: z.string().max(20).optional().nullable(),
  mobile_code: z.string().max(5).optional(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  gender: z.string().min(1, 'Gender is required'),
  age: z.number().min(0, 'Age must be 0 or greater').max(150, 'Age must be less than 150').optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  address_line: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  occupation: z.string().optional().nullable(),
  blood_group: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medical_history: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ClientFormData = z.infer<typeof clientSchema>;

// ============================================
// COMPONENT
// ============================================

interface ClientFormProps {
  initialData?: ClientResponse;
  onSubmit: (data: ClientCreate | ClientUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const isEditing = !!initialData;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      phone: initialData?.phone || '',
      mobile_code: initialData?.mobile_code || '+91',
      email: initialData?.email || '',
      gender: initialData?.gender || '',
      age: initialData?.age || undefined,
      date_of_birth: initialData?.date_of_birth || '',
      address_line: initialData?.address_line || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      pincode: initialData?.pincode || '',
      occupation: initialData?.occupation || '',
      blood_group: initialData?.blood_group || '',
      allergies: initialData?.allergies || '',
      medical_history: initialData?.medical_history || '',
      emergency_contact_name: initialData?.emergency_contact_name || '',
      emergency_contact_phone: initialData?.emergency_contact_phone || '',
      notes: initialData?.notes || '',
    },
  });

  // Age is optional: when a date of birth is given, the age is calculated from it (and is not typed by hand).
  const dateOfBirth = watch('date_of_birth');
  const ageFromDateOfBirth = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const hasCalculatedAge = ageFromDateOfBirth !== null && Number.isFinite(ageFromDateOfBirth) && ageFromDateOfBirth >= 0;

  const onFormSubmit = (data: ClientFormData) => {
    // Clean up empty strings to null
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === '' ? null : value,
      ])
    );
    onSubmit(cleanData as ClientCreate | ClientUpdate);
  };

  // Date input formatter
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.full_name && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
            {errors.full_name && (
              <Text style={styles.errorText}>{errors.full_name.message}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <View style={styles.phoneRow}>
              <Controller
                control={control}
                name="mobile_code"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={value || ''}
                    onChangeText={onChange}
                    placeholder="+91"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad"
                  />
                )}
              />
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Phone number"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad"
                  />
                )}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email (Optional)</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter email"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>

          {/* Gender */}
          <View style={styles.field}>
            <Text style={styles.label}>Gender *</Text>
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <View style={styles.optionsRow}>
                  {GENDERS.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.optionButton,
                        value === gender && styles.optionButtonSelected,
                        errors.gender && !value && styles.inputError,
                      ]}
                      onPress={() => onChange(gender)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          value === gender && styles.optionTextSelected,
                        ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.gender && (
              <Text style={styles.errorText}>{errors.gender.message}</Text>
            )}
          </View>

          {/* Age */}
          <View style={styles.field}>
            <Text style={styles.label}>Age (Optional)</Text>
            <Controller
              control={control}
              name="age"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.age && styles.inputError]}
                  value={hasCalculatedAge ? String(ageFromDateOfBirth) : value !== undefined && value !== null ? String(value) : ''}
                  editable={!hasCalculatedAge}
                  onChangeText={(text) => {
                    const numValue = text === '' ? undefined : parseInt(text, 10);
                    onChange(Number.isNaN(numValue) ? undefined : numValue);
                  }}
                  onBlur={onBlur}
                  placeholder="Enter age or date of birth"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  maxLength={3}
                />
              )}
            />
            {hasCalculatedAge ? (
              <Text style={styles.hint}>Calculated from the date of birth</Text>
            ) : null}
            {errors.age && (
              <Text style={styles.errorText}>{errors.age.message}</Text>
            )}
          </View>

          {/* Date of Birth */}
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth (Optional)</Text>
            <Controller
              control={control}
              name="date_of_birth"
              render={({ field: { onChange, onBlur, value } }) => (
                <DateField
                  value={value || ''}
                  onChange={(next) => {
                    onChange(next);
                    const calculated = next ? calculateAge(next) : null;
                    if (calculated !== null && Number.isFinite(calculated) && calculated >= 0) {
                      setValue('age', calculated, { shouldValidate: true });
                    }
                  }}
                  onBlur={onBlur}
                  maximumDate={new Date()}
                  accessibilityLabel="Date of Birth"
                  testID="client-date-of-birth"
                />
              )}
            />
          </View>
        </View>

        {/* Medical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>

          {/* Blood Group */}
          <View style={styles.field}>
            <Text style={styles.label}>Blood Group (Optional)</Text>
            <Controller
              control={control}
              name="blood_group"
              render={({ field: { onChange, value } }) => (
                <View style={styles.bloodGroupGrid}>
                  {BLOOD_GROUPS.map((bg) => (
                    <TouchableOpacity
                      key={bg}
                      style={[
                        styles.bloodGroupButton,
                        value === bg && styles.bloodGroupButtonSelected,
                      ]}
                      onPress={() => onChange(bg)}
                    >
                      <Text
                        style={[
                          styles.bloodGroupText,
                          value === bg && styles.bloodGroupTextSelected,
                        ]}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          {/* Allergies */}
          <View style={styles.field}>
            <Text style={styles.label}>Allergies (Optional)</Text>
            <Controller
              control={control}
              name="allergies"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="List any known allergies"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          {/* Medical History */}
          <View style={styles.field}>
            <Text style={styles.label}>Medical History (Optional)</Text>
            <Controller
              control={control}
              name="medical_history"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Relevant medical history"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            />
          </View>
        </View>

        {/* Address Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Address Line (Optional)</Text>
            <Controller
              control={control}
              name="address_line"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Street address"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>City</Text>
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="City"
                    placeholderTextColor={colors.text.tertiary}
                  />
                )}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Pincode</Text>
              <Controller
                control={control}
                name="pincode"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Pincode"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Name (Optional)</Text>
            <Controller
              control={control}
              name="emergency_contact_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Emergency contact name"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contact Phone (Optional)</Text>
            <Controller
              control={control}
              name="emergency_contact_phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Emergency contact phone"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                />
              )}
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.field}>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Any additional notes about the client"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            />
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit(onFormSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.background.default} />
          ) : (
            <>
              <Ionicons
                name={isEditing ? 'checkmark' : 'add'}
                size={20}
                color={colors.background.default}
              />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Save Changes' : 'Add Client'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error.main,
  },
  multilineInput: {
    minHeight: 80,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeInput: {
    width: 70,
  },
  phoneInput: {
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  optionText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bloodGroupButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  bloodGroupButtonSelected: {
    borderColor: colors.error.main,
    backgroundColor: colors.error.main + '10',
  },
  bloodGroupText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  bloodGroupTextSelected: {
    color: colors.error.main,
    fontWeight: '600',
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
