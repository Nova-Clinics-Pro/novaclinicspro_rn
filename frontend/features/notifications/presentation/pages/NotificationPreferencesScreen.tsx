/**
 * Notification Preferences Screen
 * Allows therapists to customize their push notification settings
 * Integrated with backend API for preferences management
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { TherapistNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../../data/models/push.dtos';

interface PreferenceItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  recommended?: boolean;
}

const PreferenceItem: React.FC<PreferenceItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  recommended = false,
}) => (
  <View style={[styles.preferenceItem, disabled && styles.preferenceItemDisabled]}>
    <View style={styles.preferenceContent}>
      <View style={styles.preferenceTitleRow}>
        <Text style={[styles.preferenceTitle, disabled && styles.textDisabled]}>
          {title}
        </Text>
        {recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        )}
      </View>
      <Text style={[styles.preferenceDescription, disabled && styles.textDisabled]}>
        {description}
      </Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.grey[300], true: colors.success.light }}
      thumbColor={value ? colors.success.main : colors.grey[100]}
    />
  </View>
);

interface TimePickerButtonProps {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}

const TimePickerButton: React.FC<TimePickerButtonProps> = ({
  label,
  value,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    style={[styles.timePickerButton, disabled && styles.timePickerButtonDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={`${label}: ${value}`}
  >
    <Text style={[styles.timePickerLabel, disabled && styles.textDisabled]}>
      {label}
    </Text>
    <View style={styles.timePickerValue}>
      <Text style={[styles.timePickerText, disabled && styles.textDisabled]}>
        {value}
      </Text>
      <Ionicons
        name="time-outline"
        size={18}
        color={disabled ? colors.grey[400] : colors.text.secondary}
      />
    </View>
  </TouchableOpacity>
);

export const NotificationPreferencesScreen: React.FC = () => {
  const router = useRouter();
  const {
    permissionStatus,
    preferences,
    isInitialized,
    isLoading,
    error,
    requestPermissions,
    updatePreferences,
    refreshPreferences,
  } = usePushNotifications();

  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Partial<TherapistNotificationPreferences>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  // Initialize local state from preferences when available (adjusted during render when they change)
  const [syncedPreferences, setSyncedPreferences] = useState<{ value: typeof preferences } | null>(null);
  if (!syncedPreferences || syncedPreferences.value !== preferences) {
    setSyncedPreferences({ value: preferences });
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshPreferences();
    } catch (e) {
      console.error('Failed to refresh preferences:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPreferences]);

  // Handle permission request
  const handleRequestPermissions = async () => {
    const status = await requestPermissions();
    if (status === 'denied') {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive appointment alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              // Open device settings
              if (Platform.OS === 'ios') {
                // Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  // Update a preference
  const handlePreferenceChange = useCallback(
    async (key: keyof TherapistNotificationPreferences, value: boolean | string) => {
      setLocalPrefs(prev => ({ ...prev, [key]: value }));
      
      try {
        setIsSaving(true);
        await updatePreferences({ [key]: value });
      } catch (error) {
        Alert.alert('Error', 'Failed to save preference. Please try again.');
        // Revert local state
        setLocalPrefs(prev => ({ ...prev, [key]: preferences?.[key] }));
      } finally {
        setIsSaving(false);
      }
    },
    [updatePreferences, preferences]
  );

  // Show time picker
  const showTimePicker = (
    currentTime: string,
    onSelect: (time: string) => void,
    title: string
  ) => {
    // For simplicity, show a list of common times
    const times = [
      '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00',
      '12:00', '12:30', '13:00', '14:00', '18:00', '19:00', '20:00',
    ];

    Alert.alert(
      title,
      'Select a time',
      times.map(time => ({
        text: time,
        onPress: () => onSelect(time),
        style: time === currentTime ? 'destructive' : 'default',
      }))
    );
  };

  // Show settings even in web environment where push notifications might not work
  // Use default preferences if not yet loaded
  const displayPrefs = localPrefs.newAppointment !== undefined ? localPrefs : {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        {isSaving && (
          <ActivityIndicator size="small" color={colors.primary.main} style={styles.savingIndicator} />
        )}
        {isLoading && !isSaving && (
          <ActivityIndicator size="small" color={colors.primary.main} style={styles.savingIndicator} />
        )}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Error Banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error.main} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Permission Status */}
        {permissionStatus !== 'granted' && (
          <View style={styles.permissionBanner}>
            <Ionicons name="notifications-off" size={24} color={colors.warning.main} />
            <View style={styles.permissionContent}>
              <Text style={styles.permissionTitle}>Notifications Disabled</Text>
              <Text style={styles.permissionDescription}>
                Enable notifications to receive appointment alerts and updates.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Appointment Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Notifications</Text>
          <Text style={styles.sectionDescription}>
            Get notified about your scheduled appointments
          </Text>

          <View style={styles.preferencesList}>
            <PreferenceItem
              title="New Appointments"
              description="When a patient books an appointment with you"
              value={localPrefs.newAppointment ?? true}
              onValueChange={(v) => handlePreferenceChange('newAppointment', v)}
            />

            <PreferenceItem
              title="Updates & Reschedules"
              description="When appointment time or details change"
              value={localPrefs.appointmentUpdates ?? true}
              onValueChange={(v) => handlePreferenceChange('appointmentUpdates', v)}
            />

            <PreferenceItem
              title="Cancellations & No-Shows"
              description="When appointments are cancelled or patient doesn't show"
              value={localPrefs.cancellationsNoShows ?? true}
              onValueChange={(v) => handlePreferenceChange('cancellationsNoShows', v)}
            />
          </View>
        </View>

        {/* Daily Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Schedule Summary</Text>
          <Text style={styles.sectionDescription}>
            Receive a summary of your appointments each day
          </Text>

          <View style={styles.preferencesList}>
            <PreferenceItem
              title="Morning Summary"
              description="Get your daily schedule each morning"
              value={localPrefs.dailyScheduleSummary ?? false}
              onValueChange={(v) => handlePreferenceChange('dailyScheduleSummary', v)}
            />

            {localPrefs.dailyScheduleSummary && (
              <>
                <TimePickerButton
                  label="Morning Summary Time"
                  value={localPrefs.scheduleSummaryTime || '07:00'}
                  onPress={() => showTimePicker(
                    localPrefs.scheduleSummaryTime || '07:00',
                    (time) => handlePreferenceChange('scheduleSummaryTime', time),
                    'Morning Summary Time'
                  )}
                />

                <PreferenceItem
                  title="Midday Summary"
                  description="Get an additional summary in the afternoon"
                  value={localPrefs.enableMiddaySummary ?? false}
                  onValueChange={(v) => handlePreferenceChange('enableMiddaySummary', v)}
                />

                {localPrefs.enableMiddaySummary && (
                  <TimePickerButton
                    label="Midday Summary Time"
                    value={localPrefs.middaySummaryTime || '12:00'}
                    onPress={() => showTimePicker(
                      localPrefs.middaySummaryTime || '12:00',
                      (time) => handlePreferenceChange('middaySummaryTime', time),
                      'Midday Summary Time'
                    )}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* System Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Notifications</Text>
          <Text style={styles.sectionDescription}>
            Important updates and alerts
          </Text>

          <View style={styles.preferencesList}>
            <PreferenceItem
              title="Critical Updates"
              description="System alerts, clinic closures, and emergencies"
              value={localPrefs.criticalUpdates ?? true}
              onValueChange={(v) => handlePreferenceChange('criticalUpdates', v)}
              recommended
            />

            <PreferenceItem
              title="Leave Updates"
              description="When your leave requests are approved or rejected"
              value={localPrefs.leaveUpdates ?? true}
              onValueChange={(v) => handlePreferenceChange('leaveUpdates', v)}
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Silence non-critical notifications during specific times
          </Text>

          <View style={styles.preferencesList}>
            <PreferenceItem
              title="Enable Quiet Hours"
              description="Non-critical notifications will be silenced"
              value={localPrefs.quietHoursEnabled ?? false}
              onValueChange={(v) => handlePreferenceChange('quietHoursEnabled', v)}
            />

            {localPrefs.quietHoursEnabled && (
              <View style={styles.quietHoursRow}>
                <TimePickerButton
                  label="From"
                  value={localPrefs.quietHoursStart || '22:00'}
                  onPress={() => showTimePicker(
                    localPrefs.quietHoursStart || '22:00',
                    (time) => handlePreferenceChange('quietHoursStart', time),
                    'Quiet Hours Start'
                  )}
                />
                <TimePickerButton
                  label="To"
                  value={localPrefs.quietHoursEnd || '07:00'}
                  onPress={() => showTimePicker(
                    localPrefs.quietHoursEnd || '07:00',
                    (time) => handlePreferenceChange('quietHoursEnd', time),
                    'Quiet Hours End'
                  )}
                />
              </View>
            )}

            <Text style={styles.quietHoursNote}>
              Note: Critical updates will always be delivered regardless of quiet hours.
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
    flex: 1,
  },
  savingIndicator: {
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.main + '15',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    ...typography.subtitle2,
    color: colors.warning.dark,
    fontWeight: '600',
  },
  permissionDescription: {
    ...typography.caption,
    color: colors.warning.dark,
    marginTop: 2,
  },
  enableButton: {
    backgroundColor: colors.warning.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  enableButtonText: {
    ...typography.button,
    color: colors.common.white,
    fontWeight: '600',
  },
  section: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  preferencesList: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  preferenceItemDisabled: {
    opacity: 0.5,
  },
  preferenceContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  preferenceTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  preferenceDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  textDisabled: {
    color: colors.grey[400],
  },
  recommendedBadge: {
    backgroundColor: colors.success.main + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    ...typography.caption,
    color: colors.success.main,
    fontWeight: '600',
    fontSize: 10,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  timePickerButtonDisabled: {
    opacity: 0.5,
  },
  timePickerLabel: {
    ...typography.body2,
    color: colors.text.primary,
  },
  timePickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timePickerText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  quietHoursRow: {
    flexDirection: 'row',
  },
  quietHoursNote: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.main + '15',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error.main,
    flex: 1,
  },
  retryText: {
    ...typography.button,
    color: colors.error.main,
    fontWeight: '600',
  },
});

export default NotificationPreferencesScreen;
