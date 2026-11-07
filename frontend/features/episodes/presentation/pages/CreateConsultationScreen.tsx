import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { formatDateTime, toISODateString } from '../../../../core/utils/dateTimeUtils';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useAppointmentDetailQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { useCreateEpisodeMutation } from '../../data/repositories/episodes.repository.impl';
import {
  consultationRoute,
  episodeWorkspaceRoute,
} from '../../../doctorDashboard/application/consultationRoutes';

interface CreateConsultationScreenProps {
  appointmentId: string;
  clientId: string;
  destination?: 'consultation' | 'workspace';
}

export const CreateConsultationScreen: React.FC<CreateConsultationScreenProps> = ({
  appointmentId,
  clientId,
  destination = 'workspace',
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser, selectedClinicId } = useAuth();
  const tenantId = selectedClinicId || currentUser?.tenantId || '';
  const { colors, spacing, typography } = useClinicTheme();
  const { data: appointment } = useAppointmentDetailQuery(tenantId, appointmentId);
  const createEpisodeMutation = useCreateEpisodeMutation();
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [caseStartDate, setCaseStartDate] = useState(toISODateString(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const title = chiefComplaint.trim();
    if (!title) {
      setValidationError('Chief Complaint is required.');
      return;
    }
    setValidationError(null);
    setApiError(null);
    setIsSubmitting(true);
    try {
      const episode = await createEpisodeMutation.mutateAsync({
        tenantId,
        data: {
          client_id: clientId,
          title,
          appointment_id: appointmentId,
          start_date: caseStartDate,
        } as any,
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments', 'detail', tenantId, appointmentId] }),
        queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['episodes', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['episode', tenantId, episode.id] }),
        queryClient.invalidateQueries({ queryKey: ['episode', tenantId, episode.id, 'details'] }),
        queryClient.invalidateQueries({ queryKey: ['client-episodes', tenantId, clientId] }),
        queryClient.invalidateQueries({ queryKey: ['staffDashboards'] }),
      ]);
      const nextRoute = destination === 'workspace'
        ? episodeWorkspaceRoute(episode.id, appointmentId, clientId, 'doctor', 'assessment')
        : consultationRoute(episode.id, appointmentId, clientId);
      router.replace(nextRoute as any);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to start consultation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background.default }]}>
      <View style={[styles.header, { padding: spacing.md, borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h5, { color: colors.text.primary }]}>New Consultation</Text>
        <View style={styles.iconButton} />
      </View>

      <View
        style={[
          styles.contextBar,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
            margin: spacing.md,
            padding: spacing.md,
            borderRadius: spacing.sm,
            gap: spacing.xs,
          },
        ]}
      >
        <Text style={[typography.subtitle1, { color: colors.text.primary }]}>
          {appointment?.client_name || 'Patient'}
        </Text>
        <Text style={[typography.body2, { color: colors.text.secondary }]}>
          {formatDateTime(appointment?.appointment_start)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>Chief Complaint</Text>
          <TextInput
            value={chiefComplaint}
            onChangeText={(value) => {
              setChiefComplaint(value);
              setValidationError(null);
            }}
            multiline
            textAlignVertical="top"
            placeholder="Primary reason for today's visit"
            placeholderTextColor={colors.text.tertiary}
            style={[
              typography.body1,
              styles.textarea,
              {
                color: colors.text.primary,
                backgroundColor: colors.surface.default,
                borderColor: validationError ? colors.feedback.error : colors.border.default,
                borderRadius: spacing.sm,
                padding: spacing.md,
              },
            ]}
          />
          {!!validationError && (
            <Text style={[typography.body2, { color: colors.feedback.error }]}>{validationError}</Text>
          )}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>Case Start Date</Text>
          <TextInput
            value={caseStartDate}
            onChangeText={setCaseStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.tertiary}
            style={[
              typography.body1,
              styles.input,
              {
                color: colors.text.primary,
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
                borderRadius: spacing.sm,
                padding: spacing.md,
              },
            ]}
          />
        </View>

        {!!apiError && (
          <View style={[styles.errorBox, { backgroundColor: colors.feedback.errorLight, padding: spacing.md, borderRadius: spacing.sm }]}>
            <Text style={[typography.body2, { color: colors.feedback.error }]}>{apiError}</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          style={[
            styles.submit,
            { backgroundColor: colors.primary.default, borderRadius: spacing.sm, padding: spacing.md, gap: spacing.xs },
          ]}
        >
          {isSubmitting && <ActivityIndicator size="small" color={colors.primary.onPrimary} />}
          <Text style={[typography.button, { color: colors.primary.onPrimary }]}>Start Consultation</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  contextBar: { borderWidth: 1 },
  input: { borderWidth: 1, minHeight: 44 },
  textarea: { borderWidth: 1, minHeight: 132 },
  errorBox: {},
  submit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
