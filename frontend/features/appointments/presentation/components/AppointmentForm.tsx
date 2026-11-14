/**
 * Appointment Form Component
 * Form for creating/editing appointments
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
import {
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentResponse,
  APPOINTMENT_STATUSES,
} from '../../data/models/appointments.dtos';
import {
  getStatusLabel,
  getStatusColor,
} from '../../domain/helpers';

// ============================================
// VALIDATION SCHEMA
// ============================================

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  doctor_id: z.string().optional().nullable(),
  therapist_ids: z.array(z.string()).optional(),
  room_id: z.string().optional().nullable(),
  treatment_id: z.string().optional().nullable(),
  appointment_date: z.string().min(1, 'Date is required'),
  appointment_time: z.string().min(1, 'Time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional().nullable(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ============================================
// COMPONENT
// ============================================

interface AppointmentFormProps {
  initialData?: AppointmentResponse;
  onSubmit: (data: AppointmentCreate | AppointmentUpdate) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const isEditing = !!initialData;

  // Parse initial date/time from ISO string
  const parseDateTime = (isoString: string | null) => {
    if (!isoString) return { date: '', time: '' };
    const date = new Date(isoString);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);
    return { date: dateStr, time: timeStr };
  };

  const initialDateTime = parseDateTime(initialData?.appointment_start || null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_id: initialData?.client_id || '',
      doctor_id: initialData?.doctor_id || '',
      therapist_ids: initialData?.therapist_ids || [],
      room_id: initialData?.room_id || '',
      treatment_id: initialData?.treatment_id || '',
      appointment_date: initialDateTime.date,
      appointment_time: initialDateTime.time,
      duration_minutes: 30,
      status: initialData?.status || 'scheduled',
      notes: initialData?.notes || '',
    },
  });

  const onFormSubmit = (data: AppointmentFormData) => {
    // Construct ISO datetime
    const appointmentStart = `${data.appointment_date}T${data.appointment_time}:00`;
    const endDate = new Date(appointmentStart);
    endDate.setMinutes(endDate.getMinutes() + data.duration_minutes);
    const appointmentEnd = endDate.toISOString();

    const payload: AppointmentCreate | AppointmentUpdate = {
      client_id: data.client_id,
      doctor_id: data.doctor_id || null,
      therapist_ids: data.therapist_ids || [],
      room_id: data.room_id || null,
      treatment_id: data.treatment_id || null,
      appointment_start: appointmentStart,
      appointment_end: appointmentEnd,
      status: data.status,
      notes: data.notes || null,
    };

    onSubmit(payload);
  };

  // Date input formatter
  // Time input formatter
  const formatTimeInput = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
  };

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
        {/* Client Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Client ID *</Text>
            <Controller
              control={control}
              name="client_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.client_id && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter client ID"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
            {errors.client_id && (
              <Text style={styles.errorText}>{errors.client_id.message}</Text>
            )}
            <Text style={styles.hint}>Tip: Copy client ID from the Clients screen</Text>
          </View>

          {/* Doctor ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Doctor ID (Optional)</Text>
            <Controller
              control={control}
              name="doctor_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter doctor ID"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Therapist IDs - Note: This is simplified, in production you'd want a multi-select */}
          <View style={styles.field}>
            <Text style={styles.label}>Therapist IDs (Optional, comma-separated)</Text>
            <Controller
              control={control}
              name="therapist_ids"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value?.join(', ') || ''}
                  onChangeText={(text) => onChange(text.split(',').map(id => id.trim()).filter(Boolean))}
                  onBlur={onBlur}
                  placeholder="Enter therapist IDs separated by commas"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Treatment ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Treatment ID (Optional)</Text>
            <Controller
              control={control}
              name="treatment_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter treatment ID"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>

          {/* Room ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Room ID (Optional)</Text>
            <Controller
              control={control}
              name="room_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter room ID"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            />
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date *</Text>
              <Controller
                control={control}
                name="appointment_date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <DateField value={value} onChange={onChange} onBlur={onBlur} error={!!errors.appointment_date} />
                )}
              />
              {errors.appointment_date && (
                <Text style={styles.errorText}>{errors.appointment_date.message}</Text>
              )}
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Time *</Text>
              <Controller
                control={control}
                name="appointment_time"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWithIcon, errors.appointment_time && styles.inputError]}>
                    <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
                    <TextInput
                      style={styles.iconInput}
                      value={value}
                      onChangeText={(text) => onChange(formatTimeInput(text))}
                      onBlur={onBlur}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                )}
              />
              {errors.appointment_time && (
                <Text style={styles.errorText}>{errors.appointment_time.message}</Text>
              )}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <Controller
              control={control}
              name="duration_minutes"
              render={({ field: { onChange, value } }) => (
                <View style={styles.durationRow}>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationButton,
                        value === mins && styles.durationButtonSelected,
                      ]}
                      onPress={() => onChange(mins)}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          value === mins && styles.durationTextSelected,
                        ]}
                      >
                        {mins}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>

          <Controller
            control={control}
            name="status"
            render={({ field: { onChange, value } }) => (
              <View style={styles.statusGrid}>
                {APPOINTMENT_STATUSES.map((status) => {
                  const statusColor = getStatusColor(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        value === status && {
                          borderColor: statusColor,
                          backgroundColor: statusColor + '10',
                        },
                      ]}
                      onPress={() => onChange(status)}
                    >
                      <View
                        style={[
                          styles.statusIndicator,
                          { backgroundColor: statusColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusLabel,
                          value === status && { color: statusColor },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
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
                  placeholder="Add any notes about this appointment"
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
                {isEditing ? 'Save Changes' : 'Create Appointment'}
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
  hint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 4,
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
  iconInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
    alignItems: 'center',
  },
  durationButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  durationText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  durationTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.default,
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...typography.body2,
    color: colors.text.secondary,
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
