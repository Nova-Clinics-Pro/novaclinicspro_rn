/**
 * Rooms Screen
 * List and manage clinic rooms/resources
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useRoomsListQuery,
  useCreateRoomMutation,
} from '../../data/repositories/rooms.repository.impl';
import {
  RoomResponse,
  ROOM_TYPES,
  RoomType,
  getRoomTypeLabel,
  getRoomTypeIcon,
} from '../../data/models/rooms.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import type { SemanticColors } from '../../../../core/theme/semanticColors';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';

// Room card component
const RoomCard: React.FC<{
  room: RoomResponse;
  onPress: () => void;
}> = ({ room, onPress }) => {
  const { t } = useTranslation();
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const typeLabel = getRoomTypeLabel(room.room_type);
  const typeIcon = getRoomTypeIcon(room.room_type) as keyof typeof Ionicons.glyphMap;
  const typeColor = room.room_type ? getTypeColor(room.room_type) : '#6B7280';

  return (
    <TouchableOpacity
      style={[styles.roomCard, !room.is_active && styles.roomCardInactive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${typeLabel}, capacity ${room.capacity}`}
    >
      <View style={[styles.roomIcon, { backgroundColor: typeColor + '15' }]}>
        <Ionicons name={typeIcon} size={24} color={typeColor} />
      </View>

      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName}>{room.name}</Text>
          {!room.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>{t('common.inactive')}</Text>
            </View>
          )}
        </View>
        <View style={styles.roomMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{typeLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>Capacity: {room.capacity}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Get type-specific color
const getTypeColor = (type: RoomType): string => {
  const colors: Record<RoomType, string> = {
    therapy: '#10B981',
    consultation: '#3B82F6',
    examination: '#8B5CF6',
    treatment: '#F59E0B',
    procedure: '#EF4444',
  };
  return colors[type] || '#6B7280';
};

export const RoomsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '1',
    roomType: null as RoomType | null,
  });

  // Fetch all rooms once — backend may not support is_active filtering
  // Client-side filter is the reliable fallback
  const allRoomsQuery = useRoomsListQuery(tenantId, { limit: 500 }, {
    enabled: !!tenantId,
  });

  const activeRooms = (allRoomsQuery.data?.items || []).filter(r => r.is_active === true);
  const inactiveRooms = (allRoomsQuery.data?.items || []).filter(r => r.is_active === false);

  const activeCount = activeRooms.length;
  const inactiveCount = inactiveRooms.length;
  const displayedRooms = showInactive ? inactiveRooms : activeRooms;

  const isRefetching = allRoomsQuery.isRefetching;

  const createMutation = useCreateRoomMutation(tenantId);

  const handleRefresh = useCallback(() => {
    allRoomsQuery.refetch();
  }, [allRoomsQuery]);

  const handleCreateRoom = useCallback(async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Room name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        capacity: parseInt(formData.capacity, 10) || 1,
        room_type: formData.roomType,
      });
      setShowCreateModal(false);
      setFormData({ name: '', capacity: '1', roomType: null });
      Alert.alert(t('common.success'), 'Room created successfully');
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to create room');
    }
  }, [createMutation, formData, t]);

  const renderRoom = useCallback(({ item }: { item: RoomResponse }) => (
    <RoomCard
      room={item}
      onPress={() => router.push(`/clinic-admin/settings/rooms/${item.id}` as any)}
    />
  ), [router]);

  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Rooms & Resources"
          subtitle="No clinic selected"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No clinic context available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Rooms & Resources"
        subtitle={`${activeCount} active rooms`}
        onBackPress={() => router.back()}
      />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBadge, !showInactive && { backgroundColor: '#10B98120', borderColor: '#10B981' }]}
            onPress={() => setShowInactive(false)}
          >
            <Text style={[styles.statValue, { color: '#10B981' }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>{t('common.active')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statBadge, showInactive && { backgroundColor: '#F3F4F620', borderColor: '#9CA3AF' }]}
            onPress={() => setShowInactive(true)}
          >
            <Text style={[styles.statValue, { color: '#6B7280' }]}>{inactiveCount}</Text>
            <Text style={styles.statLabel}>{t('common.inactive')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          accessibilityLabel="Add new room"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Room List */}
      <FlatList
        data={displayedRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={['#2F6F4E']}
            tintColor="#2F6F4E"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No rooms configured</Text>
            <Text style={styles.emptySubtext}>Add rooms to manage your clinic spaces</Text>
          </View>
        }
      />

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Room</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Room Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Room Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Therapy Room 1"
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                />
              </View>

              {/* Capacity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Capacity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={formData.capacity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, capacity: text }))}
                />
              </View>

              {/* Room Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Room Type</Text>
                <View style={styles.typeGrid}>
                  {ROOM_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.roomType === type.value && styles.typeOptionSelected,
                        formData.roomType === type.value && { borderColor: getTypeColor(type.value) },
                      ]}
                      onPress={() => setFormData(prev => ({
                        ...prev,
                        roomType: prev.roomType === type.value ? null : type.value,
                      }))}
                    >
                      <Ionicons
                        name={type.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={formData.roomType === type.value ? getTypeColor(type.value) : '#6B7280'}
                      />
                      <Text style={[
                        styles.typeLabel,
                        formData.roomType === type.value && { color: getTypeColor(type.value) },
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleCreateRoom}
              disabled={createMutation.isPending}
            >
              <Text style={styles.submitButtonText}>
                {createMutation.isPending ? 'Creating...' : 'Create Room'}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    ...typography.body1,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F6F4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roomCardInactive: {
    opacity: 0.6,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roomInfo: {
    flex: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roomName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    ...typography.caption,
    color: '#6B7280',
    fontSize: 10,
  },
  roomMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: '#6B7280',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalTitle: {
    ...typography.h5,
    color: '#1F2937',
  },
  modalScroll: {
    flex: 1,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: '#1F2937',
    minHeight: 48,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  typeLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#2F6F4E',
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.onPrimary,
  },
});

export default RoomsScreen;
