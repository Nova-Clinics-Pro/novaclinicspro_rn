/**
 * Create Casesheet Screen
 * Screen for creating a new casesheet for a client
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useCreateCasesheetMutation } from '../../index';
import { CasesheetForm, CasesheetFormData } from '../components/CasesheetForm';
import { useAppointmentDetailQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { useEpisodeQuery, useEpisodeDetailsQuery } from '../../../episodes/data/repositories/episodes.repository.impl';

export const CreateCasesheetScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string; appointmentId?: string; episodeId?: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const clientId = params.clientId || '';
  const appointmentId = params.appointmentId;
  const episodeIdFromParams = params.episodeId; // Episode ID passed from episode context

  const createMutation = useCreateCasesheetMutation(tenantId, clientId);

  // Fetch appointment details if appointmentId is provided
  const { data: appointment } = useAppointmentDetailQuery(
    tenantId,
    appointmentId || '',
    { enabled: !!appointmentId }
  );

  // Fetch episode details if appointment has episode_id OR if episodeId is passed directly
  const episodeId = episodeIdFromParams || appointment?.episode_id;
  const { data: episode } = useEpisodeQuery(
    tenantId,
    episodeId || '',
    { enabled: !!episodeId }
  );

  // Guard against creating a duplicate casesheet: an episode may only have
  // one. If one already exists for this episode, redirect straight to
  // viewing it instead of rendering the create form (which would otherwise
  // let the doctor submit and hit the backend's "already has a casesheet"
  // rejection). This is a hard guarantee independent of how stale the
  // calling screen's own cache might be.
  const { data: episodeDetailsForGuard, isLoading: isCheckingExistingCasesheet } = useEpisodeDetailsQuery(
    tenantId,
    episodeId || '',
    { enabled: !!episodeId && !!tenantId }
  );
  const existingCasesheetId = episodeDetailsForGuard?.documents?.casesheet?.exists
    ? episodeDetailsForGuard.documents.casesheet.id
    : null;

  React.useEffect(() => {
    if (existingCasesheetId && clientId) {
      router.replace(`/clinic-admin/clients/${clientId}/casesheets/${existingCasesheetId}` as any);
    }
  }, [existingCasesheetId, clientId, router]);

  const handleSubmit = useCallback(async (data: CasesheetFormData) => {
    try {
      const result = await createMutation.mutateAsync({
        clinic_type: 'ayurveda', // Default clinic type, can be made configurable
        data_json: data,
        appointment_id: appointmentId ?? undefined,
        episode_id: episodeId ?? undefined, // Include episode_id when creating from episode context
      });
      
      // Navigate to the newly created casesheet detail page
      if (result?.id) {
        router.replace(`/clinic-admin/clients/${clientId}/casesheets/${result.id}` as any);
      } else {
        // Fallback: go back to episode or client casesheets list
        if (episodeId) {
          router.replace(`/clinic-admin/episodes/${episodeId}` as any);
        } else {
          router.replace({
            pathname: '/clinic-admin/clients/[clientId]/casesheets',
            params: { clientId },
          });
        }
      }
    } catch (err: any) {
      // Handle EPISODE_MISMATCH error
      if (err.error_code === 'EPISODE_MISMATCH' || err.message?.includes('episode_id must match')) {
        Alert.alert(
          'Episode Mismatch',
          'Document episode must match appointment episode. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (err.error_code === 'EPISODE_ALREADY_HAS_CASESHEET' || err.message?.includes('already has a casesheet')) {
        Alert.alert(
          'Duplicate Casesheet',
          'This episode already has a casesheet. Only one casesheet per episode is allowed.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to create casesheet.');
      }
    }
  }, [createMutation, clientId, appointmentId, episodeId, router]);

  const handleCancel = useCallback(() => {
    // Navigate back immediately without confirmation for better UX
    router.back();
  }, [router]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="create-casesheet-back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>New Casesheet</Text>
        {episode ? (
          <View style={styles.episodeContext}>
            <Ionicons name="folder-outline" size={14} color={colors.primary.main} />
            <Text style={styles.episodeContextText}>
              Episode: {episode.title}
            </Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>
            Create a new clinical record
          </Text>
        )}
      </View>
    </View>
  );

  // While checking for an existing casesheet (or once found, redirecting),
  // don't flash the empty create form — it would let the doctor start typing
  // into a form that's about to be replaced anyway.
  const isBlockedByExistingCasesheet = !!episodeId && (isCheckingExistingCasesheet || !!existingCasesheetId);

  if (isBlockedByExistingCasesheet) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        <View style={[styles.content, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        <CasesheetForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMutation.isPending}
          isEditable={true}
          submitLabel="Create Casesheet"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  episodeContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  episodeContextText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CreateCasesheetScreen;
