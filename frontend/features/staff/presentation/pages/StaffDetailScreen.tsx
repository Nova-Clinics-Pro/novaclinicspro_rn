/**
 * Staff Detail Screen
 * Displays detailed info for a single staff member with edit/delete actions
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  useStaffDetailQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useStaffLeaveListQuery,
  useCreateLeaveMutation,
} from '../../data/repositories/staff.repository.impl';
import {
  StaffUpdate,
  StaffLeaveCreate,
  getStaffTypeLabel,
  getStaffTypeColor,
  formatDate,
} from '../../data/models/staff.dtos';
import { StaffForm } from '../components/StaffForm';
import { StaffLeaveForm } from '../components/StaffLeaveForm';
import { LeaveListItem } from '../components/LeaveListItem';

export const StaffDetailScreen: React.FC = () => {
  const router = useRouter();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  // State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Check if current user is viewing their own profile (can request leave)
  // Only the staff member themselves can request leave, not Clinic Admin
  const isOwnProfile = useMemo(() => {
    if (!currentUser || !staffId) return false;
    // Check if the current user's staff ID matches this staff member
    // Note: currentUser.staffId would need to be available from auth context
    return currentUser.id === staffId || (currentUser as any).staffId === staffId;
  }, [currentUser, staffId]);



  // Queries
  const {
    data: staff,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStaffDetailQuery(tenantId, staffId || '');

  const { data: leavesData } = useStaffLeaveListQuery(
    tenantId,
    staffId || '',
    { limit: 10 },
    { enabled: !!staffId }
  );

  // Mutations
  const updateMutation = useUpdateStaffMutation(tenantId, staffId || '');
  const deleteMutation = useDeleteStaffMutation(tenantId);
  const createLeaveMutation = useCreateLeaveMutation(tenantId, staffId || '');

  const handleUpdate = useCallback(
    async (data: StaffUpdate) => {
      try {
        await updateMutation.mutateAsync(data);
        setShowEditModal(false);
        Alert.alert('Success', 'Staff member updated successfully');
      } catch {
        Alert.alert('Error', 'Failed to update staff');
      }
    },
    [updateMutation]
  );

  const handleToggleActive = useCallback(() => {
    const action = staff?.is_active ? 'deactivate' : 'activate';
    const actionLabel = staff?.is_active ? 'Deactivate' : 'Activate';
    Alert.alert(
      `${actionLabel} Staff`,
      `Are you sure you want to ${action} ${staff?.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: staff?.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({ is_active: !staff?.is_active });
              Alert.alert('Success', `Staff member ${action}d successfully`);
            } catch {
              Alert.alert('Error', `Failed to ${action} staff`);
            }
          },
        },
      ]
    );
  }, [updateMutation, staff]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${staff?.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(staffId || '');
              Alert.alert('Success', 'Staff member deleted');
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete staff');
            }
          },
        },
      ]
    );
  }, [deleteMutation, staff, staffId, router]);

  const handleCreateLeave = useCallback(
    async (data: StaffLeaveCreate) => {
      try {
        await createLeaveMutation.mutateAsync(data);
        setShowLeaveModal(false);
        Alert.alert('Success', 'Leave request submitted');
      } catch {
        Alert.alert('Error', 'Failed to submit leave request');
      }
    },
    [createLeaveMutation]
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading staff details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !staff) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error.main} />
          <Text style={styles.errorTitle}>Could not load staff</Text>
          <Text style={styles.errorText}>
            Staff member not found
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeColor = getStaffTypeColor(staff.staff_type);

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
            onPress={handleToggleActive}
          >
            <Ionicons
              name={staff.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={staff.is_active ? colors.warning.main : colors.success.main}
            />
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
          <View style={[styles.avatar, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name="person" size={48} color={typeColor} />
          </View>
          <Text style={styles.name}>{staff.full_name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {getStaffTypeLabel(staff.staff_type)}
            </Text>
          </View>
          {staff.designation && (
            <Text style={styles.designation}>{staff.designation}</Text>
          )}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: staff.is_active
                    ? colors.success.main + '20'
                    : colors.error.main + '20',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: staff.is_active
                      ? colors.success.main
                      : colors.error.main,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: staff.is_active
                      ? colors.success.main
                      : colors.error.main,
                  },
                ]}
              >
                {staff.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {staff.has_login && (
              <View style={styles.loginBadge}>
                <Ionicons name="key" size={14} color={colors.primary.main} />
                <Text style={styles.loginText}>Has Login</Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            {staff.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{staff.phone}</Text>
                </View>
              </View>
            )}
            {staff.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{staff.email}</Text>
                </View>
              </View>
            )}
            {staff.emergency_contact && (
              <View style={styles.infoRow}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Emergency Contact</Text>
                  <Text style={styles.infoValue}>{staff.emergency_contact}</Text>
                </View>
              </View>
            )}
            {staff.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{staff.address}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Professional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          <View style={styles.infoCard}>
            {staff.staff_code && (
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Staff Code</Text>
                  <Text style={styles.infoValue}>{staff.staff_code}</Text>
                </View>
              </View>
            )}
            {staff.specialization && (
              <View style={styles.infoRow}>
                <Ionicons name="ribbon-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Specialization</Text>
                  <Text style={styles.infoValue}>{staff.specialization}</Text>
                </View>
              </View>
            )}
            {staff.qualifications && (
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={20} color={colors.text.secondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Qualifications</Text>
                  <Text style={styles.infoValue}>{staff.qualifications}</Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Joined</Text>
                <Text style={styles.infoValue}>
                  {formatDate(staff.joining_date || staff.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leave Requests */}
        {/* Leave Requests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Leave Requests</Text>
            {/* Only show Request Leave button if viewing own profile */}
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.addLeaveButton}
                onPress={() => setShowLeaveModal(true)}
              >
                <Ionicons name="add" size={16} color={colors.primary.main} />
                <Text style={styles.addLeaveText}>Request Leave</Text>
              </TouchableOpacity>
            )}
          </View>
          {leavesData?.items && leavesData.items.length > 0 ? (
            leavesData.items.map((leave) => (
              <LeaveListItem key={leave.id} leave={leave} />
            ))
          ) : (
            <View style={styles.emptyLeaves}>
              <Ionicons name="calendar-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyLeavesText}>No leave requests</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Edit Staff</Text>
            <View style={{ width: 24 }} />
          </View>
          <StaffForm
            initialData={staff}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditModal(false)}
            isLoading={updateMutation.isPending}
          />
        </SafeAreaView>
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        visible={showLeaveModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Leave</Text>
            <View style={{ width: 24 }} />
          </View>
          <StaffLeaveForm
            onSubmit={handleCreateLeave}
            onCancel={() => setShowLeaveModal(false)}
            isLoading={createLeaveMutation.isPending}
          />
        </SafeAreaView>
      </Modal>
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
    paddingBottom: spacing.xl,
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
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  typeText: {
    ...typography.body2,
    fontWeight: '600',
  },
  designation: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  loginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primary.main + '15',
    gap: 4,
  },
  loginText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
  addLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.primary.main + '10',
  },
  addLeaveText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  emptyLeaves: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background.default,
    borderRadius: 12,
  },
  emptyLeavesText: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
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
});

export default StaffDetailScreen;
