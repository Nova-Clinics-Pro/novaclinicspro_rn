/**
 * Room Detail Route
 * /clinic-admin/settings/rooms/[roomId]
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useRoomDetailQuery,
  useUpdateRoomMutation,
} from '../../../../features/rooms/data/repositories/rooms.repository.impl';
import { ROOM_TYPES, RoomType, getRoomTypeLabel } from '../../../../features/rooms/data/models/rooms.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../../features/auth/presentation/providers/auth.store';

export default function RoomDetailScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    capacity: '1',
    roomType: null as RoomType | null,
  });

  const roomQuery = useRoomDetailQuery(tenantId, roomId || '', {
    enabled: !!tenantId && !!roomId,
  });

  const updateMutation = useUpdateRoomMutation(tenantId, roomId || '');

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Room name is required');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        name: formData.name.trim(),
        capacity: parseInt(formData.capacity, 10) || 1,
        room_type: formData.roomType,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Room updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update room');
    }
  };

  const handleToggleActive = async () => {
    const newStatus = !roomQuery.data?.is_active;
    try {
      await updateMutation.mutateAsync({ is_active: newStatus });
      Alert.alert('Success', `Room ${newStatus ? 'activated' : 'deactivated'}`);
    } catch {
      Alert.alert('Error', 'Failed to update room status');
    }
  };

  if (roomQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Room Details"
          subtitle="Loading..."
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading room details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Room Details"
          subtitle="Error"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load room</Text>
        </View>
      </SafeAreaView>
    );
  }

  const room = roomQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title={isEditing ? 'Edit Room' : room.name}
        subtitle={getRoomTypeLabel(room.room_type)}
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <View style={[
              styles.statusDot,
              { backgroundColor: room.is_active ? '#10B981' : '#EF4444' }
            ]} />
            <Text style={styles.statusText}>
              {room.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.statusButton, !room.is_active && styles.activateButton]}
            onPress={handleToggleActive}
          >
            <Text style={[styles.statusButtonText, !room.is_active && styles.activateButtonText]}>
              {room.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Room Details</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => {
                setFormData({
                  name: room.name,
                  capacity: room.capacity.toString(),
                  roomType: room.room_type,
                });
                setIsEditing(true);
              }}>
                <Ionicons name="pencil" size={20} color="#2F6F4E" />
              </TouchableOpacity>
            )}
          </View>

          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Room Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Room name"
              />
            ) : (
              <Text style={styles.value}>{room.name}</Text>
            )}
          </View>

          {/* Capacity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Capacity</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.capacity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, capacity: text }))}
                keyboardType="number-pad"
                placeholder="1"
              />
            ) : (
              <Text style={styles.value}>{room.capacity} person(s)</Text>
            )}
          </View>

          {/* Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Room Type</Text>
            {isEditing ? (
              <View style={styles.typeGrid}>
                {ROOM_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.roomType === type.value && styles.typeOptionSelected,
                    ]}
                    onPress={() => setFormData(prev => ({
                      ...prev,
                      roomType: prev.roomType === type.value ? null : type.value,
                    }))}
                  >
                    <Text style={[
                      styles.typeLabel,
                      formData.roomType === type.value && styles.typeLabelSelected,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.value}>{getRoomTypeLabel(room.room_type)}</Text>
            )}
          </View>

          {isEditing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  setFormData({
                    name: room.name,
                    capacity: room.capacity.toString(),
                    roomType: room.room_type,
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, updateMutation.isPending && styles.disabledButton]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* End of scroll content */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body1,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  activateButton: {
    backgroundColor: '#F0FDF4',
  },
  statusButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: '#EF4444',
  },
  activateButtonText: {
    color: '#10B981',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: '#6B7280',
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body1,
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: '#1F2937',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeOptionSelected: {
    backgroundColor: '#2F6F4E15',
    borderColor: '#2F6F4E',
  },
  typeLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  typeLabelSelected: {
    color: '#2F6F4E',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.body2,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#2F6F4E',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dangerSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerTitle: {
    ...typography.body2,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButtonText: {
    ...typography.body2,
    color: '#EF4444',
  },
});
