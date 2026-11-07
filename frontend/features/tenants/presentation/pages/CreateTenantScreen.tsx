/**
 * Create Tenant Screen
 * Form to create a new tenant
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { useCreateTenantMutation } from '../../data/repositories/tenants.repository.impl';
import { OrgTenantCreate, CLINIC_TYPES } from '../../data/models/tenants.dtos';
import { useOrganizationTenantScope } from '../hooks/useOrganizationTenantScope';

// Validation schema
const createTenantSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  clinic_type: z.string().min(1, 'Clinic type is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  website_address: z.string().url('Valid URL required').optional().or(z.literal('')),
  clinic_registration: z.string().optional(),
  language: z.string().min(1, 'Language is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
});

type CreateTenantFormData = z.infer<typeof createTenantSchema>;

export default function CreateTenantScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const { organizationId } = useOrganizationTenantScope();
  const createMutation = useCreateTenantMutation(organizationId);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTenantFormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      clinic_type: '',
      email: '',
      website_address: '',
      clinic_registration: '',
      language: 'en',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  const onSubmit = async (data: CreateTenantFormData) => {
    try {
      const payload: OrgTenantCreate = {
        name: data.name,
        clinic_type: data.clinic_type,
        email: data.email || null,
        website_address: data.website_address || null,
        clinic_registration: data.clinic_registration || null,
        language: data.language,
        timezone: data.timezone,
        currency: data.currency,
      };

      const result = await createMutation.mutateAsync(payload);
      Alert.alert('Success', 'Tenant created successfully', [
        {
          text: 'View Tenant',
          onPress: () => router.replace(`/super-admin/tenants/${result.id}`),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create tenant');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface.default }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Create Tenant
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Basic Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                Clinic Name *
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface.default,
                        color: theme.colors.text.primary,
                        borderColor: errors.name
                          ? theme.colors.feedback.error
                          : theme.colors.border.default,
                      },
                    ]}
                    placeholder="Enter clinic name"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {errors.name && (
                <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
                  {errors.name.message}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                Clinic Type *
              </Text>
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
                  {errors.clinic_type.message}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>Email</Text>
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
                    placeholder="clinic@example.com"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                )}
              />
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
                  {errors.email.message}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>Website</Text>
              <Controller
                control={control}
                name="website_address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface.default,
                        color: theme.colors.text.primary,
                        borderColor: errors.website_address
                          ? theme.colors.feedback.error
                          : theme.colors.border.default,
                      },
                    ]}
                    placeholder="https://example.com"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>
                Registration Number
              </Text>
              <Controller
                control={control}
                name="clinic_registration"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface.default,
                        color: theme.colors.text.primary,
                        borderColor: theme.colors.border.default,
                      },
                    ]}
                    placeholder="Enter registration number"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
          </View>

          {/* Localization */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Localization
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>Language *</Text>
              <Controller
                control={control}
                name="language"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.radioGroup}>
                    {['en', 'hi', 'ta', 'te', 'kn', 'ml'].map((lang) => (
                      <TouchableOpacity
                        key={lang}
                        style={[
                          styles.radioOption,
                          {
                            backgroundColor:
                              value === lang
                                ? theme.colors.primary.soft
                                : theme.colors.surface.default,
                            borderColor:
                              value === lang
                                ? theme.colors.primary.default
                                : theme.colors.border.default,
                          },
                        ]}
                        onPress={() => onChange(lang)}
                      >
                        <Text
                          style={[
                            styles.radioText,
                            {
                              color:
                                value === lang
                                  ? theme.colors.primary.default
                                  : theme.colors.text.primary,
                            },
                          ]}
                        >
                          {lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text.primary }]}>Currency *</Text>
              <Controller
                control={control}
                name="currency"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.radioGroup}>
                    {['INR', 'USD', 'EUR', 'GBP'].map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        style={[
                          styles.radioOption,
                          {
                            backgroundColor:
                              value === curr
                                ? theme.colors.primary.soft
                                : theme.colors.surface.default,
                            borderColor:
                              value === curr
                                ? theme.colors.primary.default
                                : theme.colors.border.default,
                          },
                        ]}
                        onPress={() => onChange(curr)}
                      >
                        <Text
                          style={[
                            styles.radioText,
                            {
                              color:
                                value === curr
                                  ? theme.colors.primary.default
                                  : theme.colors.text.primary,
                            },
                          ]}
                        >
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>
          </View>
        </ScrollView>

        {/* Create Button */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface.default,
              borderTopColor: theme.colors.border.default,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: theme.colors.primary.default,
                opacity: createMutation.isPending ? 0.5 : 1,
              },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary.onPrimary} />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color={theme.colors.primary.onPrimary} />
                <Text style={[styles.createButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Create Tenant
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 100,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
  },
  clinicTypeContainer: {
    gap: spacing.xs,
  },
  clinicTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
  },
  clinicTypeText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  radioOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomBar: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
