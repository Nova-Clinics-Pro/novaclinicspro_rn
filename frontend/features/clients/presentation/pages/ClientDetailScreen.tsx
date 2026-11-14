/**
 * Client Detail Screen
 * Displays detailed info for a single client with edit/delete actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useClientDetailQuery,
  useUpdateClientMutation,
  useDeleteClientMutation,
} from '../../data/repositories/clients.repository.impl';
import {
  ClientUpdate,
  formatDate,
  getGenderColor,
  formatPhone,
} from '../../data/models/clients.dtos';
import { ClientForm } from '../components/ClientForm';
import { useEpisodesQuery } from '../../../episodes/data/repositories/episodes.repository.impl';
import { MultiDayTreatmentsSection } from '../components/MultiDayTreatmentsSection';

export const ClientDetailScreen: React.FC = () => {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // State
  const [showEditModal, setShowEditModal] = useState(false);

  // Queries
  const {
    data: client,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useClientDetailQuery(tenantId, clientId || '');

  // Fetch active episodes for this client
  const {
    data: episodesData,
    isLoading: isLoadingEpisodes,
  } = useEpisodesQuery(
    tenantId,
    { client_id: clientId, status: 'ACTIVE' },
    { enabled: !!tenantId && !!clientId }
  );

  // Mutations
  const updateMutation = useUpdateClientMutation(tenantId, clientId || '');
  const deleteMutation = useDeleteClientMutation(tenantId);

  const handleUpdate = useCallback(
    async (data: ClientUpdate) => {
      try {
        await updateMutation.mutateAsync(data);
        setShowEditModal(false);
        Alert.alert('Success', 'Client updated successfully');
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to update client');
      }
    },
    [updateMutation]
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client?.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(clientId || '');
              Alert.alert('Success', 'Client deleted');
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete client');
            }
          },
        },
      ]
    );
  }, [deleteMutation, client, clientId, router]);

  const handleCreateAppointment = useCallback(() => {
    if (!clientId || !client) return;

    router.push({
      pathname: '/clinic-admin/appointments/create',
      params: {
        clientId,
        clientName: client.full_name,
        clientPhone: client.phone || '',
      },
    });
  }, [clientId, client, router]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading client details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          <Text style={styles.errorTitle}>Could not load client</Text>
          <Text style={styles.errorText}>
            {error?.message || 'Client not found'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const genderColor = getGenderColor(client.gender);
  const displayAge = client.age || (client.date_of_birth ? calculateAge(client.date_of_birth) : null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="pencil" size={20} color={colors.primary.main} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={20} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: genderColor + '20' }]}>
            <Ionicons name="person" size={48} color={genderColor} />
          </View>
          <Text style={styles.name}>{client.full_name}</Text>
          <View style={styles.metaRow}>
            {!!client.gender && (
              <View style={[styles.genderBadge, { backgroundColor: genderColor + '15' }]}>
                <Text style={[styles.genderText, { color: genderColor }]}>
                  {client.gender}
                </Text>
              </View>
            )}
            {!!displayAge && (
              <Text style={styles.ageText}>{displayAge} years old</Text>
            )}
          </View>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: client.is_active
                  ? colors.success.main + '20'
                  : colors.error.main + '20',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: client.is_active
                    ? colors.success.main
                    : colors.error.main,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: client.is_active
                    ? colors.success.main
                    : colors.error.main,
                },
              ]}
            >
              {client.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            {!!client.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>
                    {formatPhone(client.phone, client.mobile_code)}
                  </Text>
                </View>
              </View>
            )}
            {!!client.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{client.email}</Text>
                </View>
              </View>
            )}
            {!!((client.address_line || client.city)) && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>
                    {[client.address_line, client.city, client.state, client.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Medical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <View style={styles.infoCard}>
            {!!client.blood_group && (
              <View style={styles.infoRow}>
                <Ionicons name="water-outline" size={20} color={colors.error.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Blood Group</Text>
                  <Text style={styles.infoValue}>{client.blood_group}</Text>
                </View>
              </View>
            )}
            {!!client.date_of_birth && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{formatDate(client.date_of_birth)}</Text>
                </View>
              </View>
            )}
            {!!client.allergies && (
              <View style={styles.infoRow}>
                <Ionicons name="warning-outline" size={20} color={colors.warning.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Allergies</Text>
                  <Text style={styles.infoValue}>{client.allergies}</Text>
                </View>
              </View>
            )}
            {!!client.medical_history && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Medical History</Text>
                  <Text style={styles.infoValue}>{client.medical_history}</Text>
                </View>
              </View>
            )}
            {!client.blood_group && !client.allergies && !client.medical_history && (
              <View style={styles.emptyInfo}>
                <Text style={styles.emptyInfoText}>No medical information recorded</Text>
              </View>
            )}
          </View>
        </View>

        {/* Emergency Contact */}
        {!!((client.emergency_contact_name || client.emergency_contact_phone)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.infoCard}>
              {!!client.emergency_contact_name && (
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{client.emergency_contact_name}</Text>
                  </View>
                </View>
              )}
              {!!client.emergency_contact_phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{client.emergency_contact_phone}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {!!client.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          </View>
        )}

        {/* Episodes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          <TouchableOpacity
            style={styles.documentCard}
            onPress={() => router.push({
              pathname: '/clinic-admin/clients/[clientId]/episodes',
              params: { clientId: clientId, clientName: client.full_name },
            })}
          >
            <View style={[styles.documentIcon, { backgroundColor: colors.info.main + '15' }]}>
              <Ionicons name="albums" size={24} color={colors.info.main} />
            </View>
            <Text style={styles.documentTitle}>Episodes of Care</Text>
            <Text style={styles.documentSubtitle}>View treatment episodes</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Multi-Day Treatments */}
        {!isLoadingEpisodes && episodesData?.items && episodesData.items.length > 0 && (
          <>
            {episodesData.items.map((episode) => (
              <MultiDayTreatmentsSection key={episode.id} episodeId={episode.id} />
            ))}
          </>
        )}

        {/* Clinical Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinical Documents</Text>
          <View style={styles.documentsGrid}>
            <TouchableOpacity
              style={styles.documentCard}
              onPress={() => router.push({
                pathname: '/clinic-admin/clients/[clientId]/casesheets',
                params: { clientId: clientId, clientName: client.full_name },
              })}
            >
              <View style={[styles.documentIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Ionicons name="document-text" size={24} color={colors.primary.main} />
              </View>
              <Text style={styles.documentTitle}>Casesheets</Text>
              <Text style={styles.documentSubtitle}>Clinical notes & SOAP</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.documentCard}
              onPress={() => router.push({
                pathname: '/clinic-admin/clients/[clientId]/prescriptions',
                params: { clientId: clientId, clientName: client.full_name },
              })}
            >
              <View style={[styles.documentIcon, { backgroundColor: colors.success.main + '15' }]}>
                <Ionicons name="medkit" size={24} color={colors.success.main} />
              </View>
              <Text style={styles.documentTitle}>Prescriptions</Text>
              <Text style={styles.documentSubtitle}>Medications & advice</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Record Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{formatDate(client.created_at)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>{formatDate(client.updated_at)}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.createAppointmentFab}
        onPress={handleCreateAppointment}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Create appointment for ${client.full_name}`}
      >
        <Ionicons name="calendar" size={22} color={colors.common.white} />
        <Text style={styles.createAppointmentFabText}>Appointment</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Client</Text>
            <View style={{ width: 24 }} />
          </View>
          <ClientForm
            initialData={client}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditModal(false)}
            isLoading={updateMutation.isPending}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Helper function
const calculateAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.grey[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  genderBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  genderText: {
    ...typography.body2,
    fontWeight: '600',
  },
  ageText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body1,
    color: colors.text.primary,
  },
  emptyInfo: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyInfoText: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
  notesCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
  },
  notesText: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  documentsGrid: {
    gap: spacing.sm,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.xs,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  documentTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  documentSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  createAppointmentFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  createAppointmentFabText: {
    ...typography.button,
    color: colors.common.white,
  },
});

export default ClientDetailScreen;
