import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useCreateEpisodeMutation } from '../../data/repositories/episodes.repository.impl';
import { EpisodeForm } from '../components/EpisodeForm';
import { EpisodeCreateRequest } from '../../data/models/episodes.dtos';

export const CreateEpisodeSheet: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { appointmentId, clientId } = useLocalSearchParams<{
    appointmentId: string;
    clientId: string;
  }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId;

  // Ensure clientId is a string
  const clientIdString = Array.isArray(clientId) ? clientId[0] : clientId;

  // Create episode mutation
  const createMutation = useCreateEpisodeMutation();

  const handleSubmit = async (values: Omit<EpisodeCreateRequest, 'client_id' | 'appointment_id'>) => {
    if (!tenantId) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      return;
    }
    
    try {
      const createdEpisode = await createMutation.mutateAsync({
        tenantId,
        data: {
          ...values,
          client_id: clientIdString,
          appointment_id: appointmentId,
        },
      });
      
      // Show success toast
      Alert.alert(
        t('common.success') || 'Success',
        t('episodes.episodeCreatedAndLinked') || 'Episode created and linked to this appointment.'
      );
      
      // Navigate to Episode Detail instead of going back
      router.replace(`/clinic-admin/episodes/${createdEpisode.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create episode');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to appointment details"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create episode</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info text */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {t('episodes.createEpisodeHelpText')}
          </Text>
        </View>

        {/* Episode Form */}
        <EpisodeForm
          onSubmit={(values) => handleSubmit(values as Omit<EpisodeCreateRequest, 'client_id' | 'appointment_id'>)}
          onCancel={() => router.back()}
          isLoading={createMutation.isPending}
        />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.info.main + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info.main,
  },
  infoText: {
    ...typography.body2,
    color: colors.text.primary,
    lineHeight: 20,
  },
});

export default CreateEpisodeSheet;
