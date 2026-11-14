/**
 * Staff Leave Form Component
 * Form for creating leave requests
 */

import { DateField } from '../../../../core/components/DateField';
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
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { StaffLeaveCreate, getLeaveTypeLabel } from '../../data/models/staff.dtos';

// ============================================
// VALIDATION SCHEMA
// ============================================

const leaveSchema = z.object({
  leave_type: z.string().min(1, 'Leave type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().optional().nullable(),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  { message: 'End date must be after start date', path: ['end_date'] }
);

type LeaveFormData = z.infer<typeof leaveSchema>;

// ============================================
// COMPONENT
// ============================================

interface StaffLeaveFormProps {
  onSubmit: (data: StaffLeaveCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LEAVE_TYPES = ['SICK', 'CASUAL', 'VACATION', 'PERSONAL', 'OTHER'];

export const StaffLeaveForm: React.FC<StaffLeaveFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type: '',
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  const onFormSubmit = (data: LeaveFormData) => {
    onSubmit({
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || null,
    });
  };

  // Simple date input helper (YYYY-MM-DD format)
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
        {/* Leave Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leave Request</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Leave Type *</Text>
            <Controller
              control={control}
              name="leave_type"
              render={({ field: { onChange, value } }) => (
                <View style={styles.typeGrid}>
                  {LEAVE_TYPES.map((type) => (
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
                        {getLeaveTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.leave_type && (
              <Text style={styles.errorText}>{errors.leave_type.message}</Text>
            )}
          </View>

          {/* Date Fields */}
          <View style={styles.dateRow}>
            <View style={[styles.field, styles.dateField]}>
              <Text style={styles.label}>Start Date *</Text>
              <Controller
                control={control}
                name="start_date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DateField value={value} onChange={onChange} onBlur={onBlur} error={!!errors.start_date} />
                )}
              />
              {errors.start_date && (
                <Text style={styles.errorText}>{errors.start_date.message}</Text>
              )}
            </View>

            <View style={[styles.field, styles.dateField]}>
              <Text style={styles.label}>End Date *</Text>
              <Controller
                control={control}
                name="end_date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DateField value={value} onChange={onChange} onBlur={onBlur} error={!!errors.end_date} />
                )}
              />
              {errors.end_date && (
                <Text style={styles.errorText}>{errors.end_date.message}</Text>
              )}
            </View>
          </View>

          {/* Reason */}
          <View style={styles.field}>
            <Text style={styles.label}>Reason (Optional)</Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter reason for leave"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={4}
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
              <Ionicons name="paper-plane" size={20} color={colors.background.default} />
              <Text style={styles.submitButtonText}>Submit Request</Text>
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dateInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  multilineInput: {
    minHeight: 100,
  },
  errorText: {
    ...typography.caption,
    color: colors.error.main,
    marginTop: 4,
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
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
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
