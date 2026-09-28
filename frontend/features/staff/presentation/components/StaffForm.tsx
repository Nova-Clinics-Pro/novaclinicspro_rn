/**
 * Staff Form Component
 * Form for creating/editing staff members with all required fields
 * 
 * Fields mapped to API DTOs:
 * - Basic: full_name, phone, gender, staff_type, email, date_of_birth
 * - Professional: staff_code, designation, specialization, qualifications, 
 *                 experience_years, consultation_fee, hourly_rate
 * - Address: address_line, city, state, country, pin
 * - Emergency Contact: emergency_contact_name, emergency_contact_phone, emergency_contact_relation
 * - Employment: employment_start_date, employment_end_date
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  StaffCreate,
  StaffUpdate,
  StaffResponse,
  StaffType,
  getStaffTypeLabel,
} from '../../data/models/staff.dtos';
import { StaffDateOfBirthField } from './StaffDateOfBirthField';

// ============================================
// VALIDATION SCHEMA
// ============================================

const staffSchema = z.object({
  // Basic Info
  full_name: z.string().min(1, 'Full name is required').max(255),
  requires_login: z.boolean(),
  phone: z.string().min(1, 'Phone is required').max(20),
  gender: z.string().min(1, 'Gender is required'),
  staff_type: z.enum(['doctor', 'therapist', 'nurse', 'receptionist', 'pharmacist', 'physiotherapist', 'dentist', 'admin']),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  date_of_birth: z.string().optional().nullable(),
  
  // Professional Details
  staff_code: z.string().max(50).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  specialization: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  experience_years: z.string().optional().nullable(),
  consultation_fee: z.string().optional().nullable(),
  hourly_rate: z.string().optional().nullable(),
  
  // Address fields
  address_line: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pin: z.string().optional().nullable(),
  
  // Emergency Contact
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  emergency_contact_relation: z.string().optional().nullable(),
  
  // Employment Dates
  employment_start_date: z.string().optional().nullable(),
  employment_end_date: z.string().optional().nullable(),
});

type StaffFormData = z.infer<typeof staffSchema>;

// ============================================
// CONSTANTS
// ============================================

const STAFF_TYPES: StaffType[] = [
  'doctor',
  'therapist',
  'nurse',
  'receptionist',
  'pharmacist',
  'physiotherapist',
  'dentist',
  'admin',
];

const GENDERS = ['Male', 'Female', 'Other'];

const RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Compare form data with initial data to check for changes
 */
const hasFormChanges = (formData: StaffFormData, initialData?: StaffResponse): boolean => {
  if (!initialData) return true; // New entry always has changes

  const compareFields: (keyof StaffFormData)[] = [
    'full_name', 'phone', 'gender', 'staff_type', 'email', 'date_of_birth',
    'staff_code', 'designation', 'specialization', 'qualifications',
    'experience_years', 'consultation_fee', 'hourly_rate',
    'address_line', 'city', 'state', 'country', 'pin',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
    'employment_start_date', 'employment_end_date',
  ];

  for (const field of compareFields) {
    const formValue = formData[field];
    let initialValue: any;

    // Map form field to response field (handle naming differences)
    switch (field) {
      case 'experience_years':
        initialValue = initialData.experience_years?.toString() || '';
        break;
      case 'consultation_fee':
        initialValue = initialData.consultation_fee?.toString() || '';
        break;
      case 'hourly_rate':
        initialValue = initialData.hourly_rate?.toString() || '';
        break;
      default:
        initialValue = (initialData as any)[field] || '';
    }

    // Normalize empty values for comparison
    const normalizedFormValue = formValue === '' || formValue === null || formValue === undefined ? '' : String(formValue);
    const normalizedInitialValue = initialValue === null || initialValue === undefined ? '' : String(initialValue);

    if (normalizedFormValue !== normalizedInitialValue) {
      return true;
    }
  }

  return false;
};

// ============================================
// COMPONENT
// ============================================

interface StaffFormProps {
  initialData?: StaffResponse;
  onSubmit: (data: StaffCreate | StaffUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StaffForm: React.FC<StaffFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const scrollViewRef = useRef<ScrollView>(null);
  const [expandedSections, setExpandedSections] = useState({
    address: false,
    emergency: false,
    employment: false,
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    getValues,
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      // Basic Info
      full_name: initialData?.full_name || '',
      requires_login: initialData?.has_login || false,
      phone: initialData?.phone || '',
      gender: initialData?.gender || '',
      staff_type: initialData?.staff_type || 'therapist',
      email: initialData?.email || '',
      date_of_birth: initialData?.date_of_birth || '',
      
      // Professional Details
      staff_code: initialData?.staff_code || '',
      designation: initialData?.designation || '',
      specialization: initialData?.specialization || '',
      qualifications: initialData?.qualifications || '',
      experience_years: initialData?.experience_years?.toString() || '',
      consultation_fee: initialData?.consultation_fee?.toString() || '',
      hourly_rate: initialData?.hourly_rate?.toString() || '',
      
      // Address fields
      address_line: initialData?.address_line || initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      country: initialData?.country || '',
      pin: initialData?.pin || '',
      
      // Emergency Contact
      emergency_contact_name: initialData?.emergency_contact_name || '',
      emergency_contact_phone: initialData?.emergency_contact_phone || initialData?.emergency_contact || '',
      emergency_contact_relation: initialData?.emergency_contact_relation || '',
      
      // Employment Dates
      employment_start_date: initialData?.employment_start_date || initialData?.joining_date || '',
      employment_end_date: initialData?.employment_end_date || '',
    },
  });

  const requiresLogin = watch('requires_login');
  const staffType = watch('staff_type');

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const onFormSubmit = (data: StaffFormData) => {
    // Check if there are any changes for edit mode
    if (isEditing && !hasFormChanges(data, initialData)) {
      // No changes - optionally show a message or just return
      onCancel(); // Close the form without API call
      return;
    }

    // Build the payload with proper type conversions
    const payload: StaffCreate | StaffUpdate = {
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      gender: data.gender,
      staff_type: data.staff_type,
      email: data.email?.trim() || null,
      date_of_birth: data.date_of_birth || null,
      
      // Professional Details
      staff_code: data.staff_code?.trim() || null,
      designation: data.designation?.trim() || null,
      specialization: data.specialization?.trim() || null,
      qualifications: data.qualifications?.trim() || null,
      experience_years: data.experience_years ? parseInt(data.experience_years, 10) : null,
      consultation_fee: data.consultation_fee ? parseFloat(data.consultation_fee) : null,
      hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      
      // Address fields
      address_line: data.address_line?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || null,
      pin: data.pin?.trim() || null,
      
      // Emergency Contact
      emergency_contact_name: data.emergency_contact_name?.trim() || null,
      emergency_contact_phone: data.emergency_contact_phone?.trim() || null,
      emergency_contact_relation: data.emergency_contact_relation?.trim() || null,
      
      // Employment Dates
      employment_start_date: data.employment_start_date || null,
      employment_end_date: data.employment_end_date || null,
    };

    // Add requires_login only for create
    if (!isEditing) {
      (payload as StaffCreate).requires_login = data.requires_login;
    }

    onSubmit(payload);
  };

  // Check if staff type is one that typically has consultation fees
  const showFees = ['doctor', 'therapist', 'physiotherapist', 'dentist'].includes(staffType);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info Section */}
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
            <Text style={styles.label}>Phone *</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                />
              )}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone.message}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Email {requiresLogin ? '*' : '(Optional)'}
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter email address"
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

          {/* Date of Birth */}
          <View style={styles.field}>
            <Controller
              control={control}
              name="date_of_birth"
              render={({ field: { onChange, value } }) => (
                <StaffDateOfBirthField
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </View>

          {/* Staff Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Staff Type *</Text>
            <Controller
              control={control}
              name="staff_type"
              render={({ field: { onChange, value } }) => (
                <View style={styles.typeGrid}>
                  {STAFF_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        value === type && styles.typeButtonSelected,
                      ]}
                      onPress={() => onChange(type)}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          value === type && styles.typeTextSelected,
                        ]}
                      >
                        {getStaffTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>
        </View>

        {/* Login Access Section (only for new staff) */}
        {!isEditing && (
          <View style={styles.section}>
            <View style={styles.switchField}>
              <View style={styles.switchInfo}>
                <Text style={styles.label}>System Login Access</Text>
                <Text style={styles.hint}>
                  Enable if staff needs app login credentials
                </Text>
              </View>
              <Controller
                control={control}
                name="requires_login"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.grey[300], true: colors.primary.light }}
                    thumbColor={value ? colors.primary.main : colors.grey[100]}
                  />
                )}
              />
            </View>
          </View>
        )}

        {/* Professional Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>

          {/* Staff Code */}
          <View style={styles.field}>
            <Text style={styles.label}>Staff Code (Optional)</Text>
            <Controller
              control={control}
              name="staff_code"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., EMP001"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Designation */}
          <View style={styles.field}>
            <Text style={styles.label}>Designation (Optional)</Text>
            <Controller
              control={control}
              name="designation"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., Senior Therapist"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Specialization */}
          <View style={styles.field}>
            <Text style={styles.label}>Specialization (Optional)</Text>
            <Controller
              control={control}
              name="specialization"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., Panchakarma, Ayurvedic Medicine"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Qualifications */}
          <View style={styles.field}>
            <Text style={styles.label}>Qualifications (Optional)</Text>
            <Controller
              control={control}
              name="qualifications"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., BAMS, MD Ayurveda"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          {/* Experience Years */}
          <View style={styles.field}>
            <Text style={styles.label}>Years of Experience (Optional)</Text>
            <Controller
              control={control}
              name="experience_years"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="number-pad"
                />
              )}
            />
          </View>

          {/* Fees (only for relevant staff types) */}
          {showFees && (
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Consultation Fee (₹)</Text>
                <Controller
                  control={control}
                  name="consultation_fee"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g., 500"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Hourly Rate (₹)</Text>
                <Controller
                  control={control}
                  name="hourly_rate"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g., 1000"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
            </View>
          )}
        </View>

        {/* Address Section (Collapsible) */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('address')}
        >
          <Text style={styles.sectionTitle}>Address Details</Text>
          <Ionicons
            name={expandedSections.address ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {expandedSections.address && (
          <View style={styles.section}>
            {/* Address Line */}
            <View style={styles.field}>
              <Text style={styles.label}>Address Line</Text>
              <Controller
                control={control}
                name="address_line"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Street address, building, etc."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                )}
              />
            </View>

            {/* City & State Row */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
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
                <Text style={styles.label}>State</Text>
                <Controller
                  control={control}
                  name="state"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="State"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  )}
                />
              </View>
            </View>

            {/* Country & PIN Row */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.label}>Country</Text>
                <Controller
                  control={control}
                  name="country"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Country"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  )}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>PIN Code</Text>
                <Controller
                  control={control}
                  name="pin"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      value={value || ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="PIN"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="number-pad"
                    />
                  )}
                />
              </View>
            </View>
          </View>
        )}

        {/* Emergency Contact Section (Collapsible) */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('emergency')}
        >
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <Ionicons
            name={expandedSections.emergency ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {expandedSections.emergency && (
          <View style={styles.section}>
            {/* Contact Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Contact Name</Text>
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

            {/* Contact Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Contact Phone</Text>
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

            {/* Relation */}
            <View style={styles.field}>
              <Text style={styles.label}>Relationship</Text>
              <Controller
                control={control}
                name="emergency_contact_relation"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.typeGrid}>
                    {RELATIONS.map((relation) => (
                      <TouchableOpacity
                        key={relation}
                        style={[
                          styles.typeButton,
                          value === relation && styles.typeButtonSelected,
                        ]}
                        onPress={() => onChange(relation)}
                      >
                        <Text
                          style={[
                            styles.typeText,
                            value === relation && styles.typeTextSelected,
                          ]}
                        >
                          {relation}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>
          </View>
        )}

        {/* Employment Dates Section (Collapsible) */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('employment')}
        >
          <Text style={styles.sectionTitle}>Employment Details</Text>
          <Ionicons
            name={expandedSections.employment ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {expandedSections.employment && (
          <View style={styles.section}>
            {/* Start Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Start Date</Text>
              <Controller
                control={control}
                name="employment_start_date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                  />
                )}
              />
            </View>

            {/* End Date (for terminated employees) */}
            <View style={styles.field}>
              <Text style={styles.label}>End Date (if applicable)</Text>
              <Controller
                control={control}
                name="employment_end_date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                  />
                )}
              />
            </View>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: spacing.xl }} />
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
                {isEditing ? 'Save Changes' : 'Add Staff'}
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
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
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
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    marginTop: 4,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  typeButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  typeText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  typeTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.background.default,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
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
