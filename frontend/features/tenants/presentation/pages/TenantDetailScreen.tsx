/**
 * Tenant Detail Screen
 * View and edit individual tenant details
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import {
  useTenantQuery,
  useUpdateTenantMutation,
  useDeactivateTenantMutation,
} from '../../data/repositories/tenants.repository.impl';
import { OrgTenantUpdate, CLINIC_TYPES } from '../../data/models/tenants.dtos';
import { useOrganizationTenantScope } from '../hooks/useOrganizationTenantScope';

// Validation schema for tenant update
const tenantUpdateSchema = z.object({
  name: z.string().min(2, 'Name is required').max(255),
  clinic_type: z.string().min(1, 'Clinic type is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  website_address: z.string().url('Valid URL required').optional().or(z.literal('')),
  clinic_registration: z.string().optional(),
  clinic_pan: z.string().optional(),
  clinic_gst: z.string().optional(),
  language: z.string().min(1, 'Language is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
});

type TenantUpdateFormData = z.infer<typeof tenantUpdateSchema>;

export default function TenantDetailScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const { organizationId } = useOrganizationTenantScope();

  // Fetch tenant data
  const { data: tenant, isLoading, isError, error } = useTenantQuery(organizationId, tenantId);

  // Update mutation
  const updateMutation = useUpdateTenantMutation(organizationId, tenantId);
  const deactivateMutation = useDeactivateTenantMutation(organizationId, tenantId);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<TenantUpdateFormData>({
    resolver: zodResolver(tenantUpdateSchema),
    values: tenant
      ? {
          name: tenant.name,
          clinic_type: tenant.clinic_type,
          email: tenant.email || '',
          website_address: tenant.website_address || '',
          clinic_registration: tenant.clinic_registration || '',
          clinic_pan: tenant.clinic_pan || '',
          clinic_gst: tenant.clinic_gst || '',
          language: tenant.language,
          timezone: tenant.timezone,
          currency: tenant.currency,
        }
      : undefined,
  });

  const onSubmit = async (data: TenantUpdateFormData) => {
    try {
      const payload: OrgTenantUpdate = {
        name: data.name,
        clinic_type: data.clinic_type,
        email: data.email || null,
        website_address: data.website_address || null,
        clinic_registration: data.clinic_registration || null,
        clinic_pan: data.clinic_pan || null,
        clinic_gst: data.clinic_gst || null,
        language: data.language,
        timezone: data.timezone,
        currency: data.currency,
      };

      await updateMutation.mutateAsync(payload);
      Alert.alert('Success', 'Tenant updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update tenant');
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Tenant',
      'Are you sure you want to deactivate this tenant? This action can be reversed later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateMutation.mutateAsync();
              Alert.alert('Success', 'Tenant deactivated successfully');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to deactivate tenant');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading tenant details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !tenant) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      >
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.feedback.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Unable to Load Tenant
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.colors.text.secondary }]}>
            {error?.message || 'Tenant not found'}
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.primary.onPrimary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface.default }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Tenant Details
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (isEditing) {
              reset();
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Ionicons
            name={isEditing ? 'close' : 'create-outline'}
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusSection,
            {
              backgroundColor: theme.colors.surface.default,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
              Status:
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    tenant.status === 'active'
                      ? theme.colors.feedback.successLight
                      : theme.colors.feedback.warningLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      tenant.status === 'active'
                        ? theme.colors.feedback.success
                        : theme.colors.feedback.warning,
                  },
                ]}
              >
                {tenant.status}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
              Code:
            </Text>
            <Text style={[styles.statusValue, { color: theme.colors.text.primary }]}>
              {tenant.code}
            </Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Basic Information
          </Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Name *</Text>
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
                {errors.name.message}
              </Text>
            )}
          </View>

          {/* Clinic Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>
              Clinic Type *
            </Text>
            {isEditing ? (
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
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            ) : (
              <Text style={[styles.readOnlyValue, { color: theme.colors.text.primary }]}>
                {tenant.clinic_type}
              </Text>
            )}
          </View>

          {/* Email */}
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: theme.colors.feedback.error }]}>
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Website */}
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  keyboardType="url"
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
          </View>
        </View>

        {/* Compliance Section */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Compliance & Registration
          </Text>

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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>PAN</Text>
            <Controller
              control={control}
              name="clinic_pan"
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>GST</Text>
            <Controller
              control={control}
              name="clinic_gst"
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  editable={isEditing}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              )}
            />
          </View>
        </View>

        {/* Subscription Info (Read-only) */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Subscription & Trial
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Plan:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {tenant.subscription_plan}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
              Status:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {tenant.subscription_status}
            </Text>
          </View>

          {tenant.trial_end_date && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                Trial Ends:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.feedback.warning }]}>
                {new Date(tenant.trial_end_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Metadata
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
              Created:
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {new Date(tenant.created_at).toLocaleString()}
            </Text>
          </View>

          {tenant.updated_at && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>
                Updated:
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {new Date(tenant.updated_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* RBAC Management */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Access Control
          </Text>
          <TouchableOpacity
            style={[
              styles.rbacButton,
              {
                backgroundColor: theme.colors.surface.default,
                borderColor: theme.colors.border.default,
              },
            ]}
            onPress={() => router.push(`/super-admin/tenants/${tenantId}/rbac`)}
          >
            <View style={[styles.rbacIconContainer, { backgroundColor: '#2F6F4E' + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#2F6F4E" />
            </View>
            <View style={styles.rbacTextContainer}>
              <Text style={[styles.rbacTitle, { color: theme.colors.text.primary }]}>
                RBAC Management
              </Text>
              <Text style={[styles.rbacSubtitle, { color: theme.colors.text.secondary }]}>
                Manage roles, permissions, and user access
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        {tenant.is_active && (
          <View style={styles.dangerSection}>
            <Text style={[styles.dangerTitle, { color: theme.colors.feedback.error }]}>
              Danger Zone
            </Text>
            <TouchableOpacity
              style={[
                styles.dangerButton,
                {
                  borderColor: theme.colors.feedback.error,
                },
              ]}
              onPress={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? (
                <ActivityIndicator color={theme.colors.feedback.error} />
              ) : (
                <>
                  <Ionicons name="warning" size={20} color={theme.colors.feedback.error} />
                  <Text style={[styles.dangerButtonText, { color: theme.colors.feedback.error }]}>
                    Deactivate Tenant
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Save Button (shown when editing) */}
      {isEditing && (
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
              styles.saveButton,
              {
                backgroundColor: theme.colors.primary.default,
                opacity: !isDirty || updateMutation.isPending ? 0.5 : 1,
              },
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color={theme.colors.primary.onPrimary} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={theme.colors.primary.onPrimary} />
                <Text style={[styles.saveButtonText, { color: theme.colors.primary.onPrimary }]}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    gap: spacing.lg,
    paddingBottom: 100,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSection: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  formSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
  readOnlyValue: {
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontSize: 12,
  },
  clinicTypeContainer: {
    gap: spacing.xs,
  },
  clinicTypeCard: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
  },
  clinicTypeText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  dangerSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    gap: spacing.sm,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rbacButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
  },
  rbacIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rbacTextContainer: {
    flex: 1,
  },
  rbacTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rbacSubtitle: {
    fontSize: 14,
  },
});
