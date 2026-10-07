/**
 * OperatingHoursScreen (Onboarding)
 * Review and confirm operating hours during setup
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useSubmitStepMutation } from '../../../data/repositories/onboarding.repository.impl';
import { useOnboardingOperatingHoursQuery } from '../../../../operatingHours/data/repositories/operatingHours.repository.impl';
import { clearStepDraftAndSync, useWizardStore } from '../../stores/wizard.store';
import { RestoredDraftIndicator } from '../../components/RestoredDraftIndicator';

interface OperatingHoursScreenProps {
  tenantId: string;
  isWizardMode?: boolean;
  onSuccess?: () => void;
}

interface DaySchedule {
  day: string;
  is_open: boolean;
  open_time?: string;
  close_time?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const createDefaultSchedule = (): DaySchedule[] =>
  DAYS.map((day) => ({
    day,
    is_open: day !== 'Sunday',
    open_time: '09:00',
    close_time: '18:00',
  }));

export function OperatingHoursScreen({ tenantId, isWizardMode = false, onSuccess }: OperatingHoursScreenProps) {
  const theme = useClinicTheme();
  const hoursQuery = useOnboardingOperatingHoursQuery(tenantId);

  if (hoursQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
          Loading operating hours...
        </Text>
      </View>
    );
  }

  return (
    <OperatingHoursConfirmation
      key={tenantId}
      tenantId={tenantId}
      isWizardMode={isWizardMode}
      onSuccess={onSuccess}
      sourceSchedule={hoursQuery.data}
    />
  );
}

interface OperatingHoursConfirmationProps extends OperatingHoursScreenProps {
  sourceSchedule?: DaySchedule[];
}

function OperatingHoursConfirmation({
  tenantId,
  isWizardMode = false,
  onSuccess,
  sourceSchedule,
}: OperatingHoursConfirmationProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const submitStepMutation = useSubmitStepMutation(tenantId, 'operating_hours');
  const { setOperatingHours, getStepData } = useWizardStore();
  const draft = getStepData('operating_hours');
  const hasSourceSchedule = Boolean(sourceSchedule?.length);
  const [schedule] = useState<DaySchedule[]>(() =>
    hasSourceSchedule
      ? sourceSchedule!
      : draft?.schedule && Array.isArray(draft.schedule)
        ? draft.schedule
        : createDefaultSchedule()
  );
  const [draftRestored, setDraftRestored] = useState(
    !hasSourceSchedule && Boolean(draft?.schedule && Array.isArray(draft.schedule))
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOperatingHours({ schedule });
    }, 500);

    return () => clearTimeout(timeout);
  }, [schedule, setOperatingHours]);

  const handleConfirm = async () => {
    try {
      const result = await submitStepMutation.mutateAsync({
        data: { operating_hours: schedule },
        mark_complete: true,
      });

      console.log('[OperatingHoursScreen] Step completed successfully');
      console.log('[OperatingHoursScreen] Backend response:', JSON.stringify(result, null, 2));
      setDraftRestored(false);
      await clearStepDraftAndSync('operating_hours');

      // In wizard mode, call onSuccess callback instead of navigating
      if (isWizardMode && onSuccess) {
        onSuccess();
        return;
      }

      // Standalone mode - navigate to next step
      const nextStep = result.next_step;
      
      if (nextStep) {
        console.log('[OperatingHoursScreen] Navigating to next step:', nextStep);
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        console.log('[OperatingHoursScreen] No next_step in response, checking onboarding status...');
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save operating hours');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      contentContainerStyle={{ padding: theme.spacing.lg }}
    >
      {draftRestored && <RestoredDraftIndicator />}

      <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
        <Ionicons name="time" size={48} color={theme.colors.primary.default} />
        <Text style={[theme.typography.h4, { color: theme.colors.text.primary, marginTop: theme.spacing.md }]}>
          Operating Hours
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' }]}>
          Review your clinic operating schedule
        </Text>
      </View>

      {/* Schedule Display */}
      <View style={[styles.scheduleCard, { backgroundColor: theme.colors.surface.default, borderRadius: 12, padding: theme.spacing.md, marginBottom: theme.spacing.lg }]}>
        {schedule.map((day, index) => (
          <View
            key={day.day}
            style={[
              styles.dayRow,
              {
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: index < schedule.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border.default,
              },
            ]}
          >
            <Text style={[theme.typography.body1, { color: theme.colors.text.primary, flex: 1, fontWeight: '500' }]}>
              {day.day}
            </Text>
            {day.is_open ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time-outline" size={16} color={theme.colors.feedback.success} style={{ marginRight: 6 }} />
                <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
                  {day.open_time} - {day.close_time}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="close-circle-outline" size={16} color={theme.colors.text.disabled} style={{ marginRight: 6 }} />
                <Text style={[theme.typography.body2, { color: theme.colors.text.disabled }]}>
                  Closed
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.colors.feedback.infoLight, padding: theme.spacing.md, marginBottom: theme.spacing.xl, borderRadius: 8, flexDirection: 'row', alignItems: 'flex-start' }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.feedback.info} style={{ marginRight: theme.spacing.sm }} />
        <Text style={[theme.typography.body2, { color: theme.colors.text.primary, flex: 1 }]}>
          You can update your operating hours anytime from Settings → Operating Hours
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.colors.primary.default, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: 8, alignItems: 'center' }]}
        onPress={handleConfirm}
        disabled={submitStepMutation.isPending}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
          {submitStepMutation.isPending ? 'Saving...' : 'Confirm & Continue'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton, { padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.default, borderRadius: 8, alignItems: 'center' }]}
        onPress={() => router.back()}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.primary }]}>
          Back
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
  },
  scheduleCard: {
    // Styles set inline with theme
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCard: {
    // Styles set inline with theme
  },
  submitButton: {
    // Styles set inline with theme
  },
  cancelButton: {
    // Styles set inline with theme
  },
});
