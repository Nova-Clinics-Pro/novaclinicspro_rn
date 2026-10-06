/**
 * TreatmentRoomsScreen
 * Add treatment rooms to the clinic
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useSubmitStepMutation } from '../../../data/repositories/onboarding.repository.impl';
import { useOnboardingRoomsQuery } from '../../../../rooms/data/repositories/rooms.repository.impl';
import type { OnboardingRoomSourceItem } from '../../../../rooms/data/models/rooms.dtos';
import { clearStepDraftAndSync, useWizardStore } from '../../stores/wizard.store';
import { RestoredDraftIndicator } from '../../components/RestoredDraftIndicator';

interface Room {
  id: string;
  name: string;
  room_type: string;
  capacity: string;
}

interface TreatmentRoomsScreenProps {
  tenantId: string;
  stepCode?: string; // Allow passing step code from parent
}

export function TreatmentRoomsScreen({ tenantId, stepCode = 'treatment_rooms' }: TreatmentRoomsScreenProps) {
  const theme = useClinicTheme();
  const roomsQuery = useOnboardingRoomsQuery(tenantId);

  if (roomsQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
          Loading rooms data...
        </Text>
      </View>
    );
  }

  return (
    <TreatmentRoomsForm
      key={`${tenantId}:${stepCode}`}
      tenantId={tenantId}
      stepCode={stepCode}
      sourceRooms={roomsQuery.data}
    />
  );
}

interface TreatmentRoomsFormProps {
  tenantId: string;
  stepCode: string;
  sourceRooms?: OnboardingRoomSourceItem[];
}

function TreatmentRoomsForm({ tenantId, stepCode, sourceRooms }: TreatmentRoomsFormProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const { setRooms: setRoomsDraft, getStepData } = useWizardStore();
  const draft = getStepData(stepCode) || getStepData('rooms_and_therapy_beds');
  const hasSourceRooms = Boolean(sourceRooms?.length);
  const [rooms, setRooms] = useState<Room[]>(() =>
    hasSourceRooms
      ? sourceRooms!.map((room) => ({
          id: room.id || Date.now().toString(),
          name: room.name || '',
          room_type: room.room_type || room.type || 'consultation',
          capacity: String(room.capacity || 1),
        }))
      : draft?.rooms && Array.isArray(draft.rooms)
        ? draft.rooms.map((room: any, index: number) => ({
            id: String(index + 1),
            name: room.name || '',
            room_type: room.room_type || 'consultation',
            capacity: String(room.capacity || 1),
          }))
        : [
            {
              id: '1',
              name: '',
              room_type: 'consultation',
              capacity: '1',
            },
          ]
  );
  const [draftRestored, setDraftRestored] = useState(
    !hasSourceRooms && Boolean(draft?.rooms && Array.isArray(draft.rooms))
  );
  const submitStepMutation = useSubmitStepMutation(tenantId, stepCode);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRoomsDraft({
        rooms: rooms.map((room) => ({
          name: room.name,
          room_type: room.room_type,
          capacity: parseInt(room.capacity) || 1,
        })),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [rooms, setRoomsDraft]);

  const addRoom = () => {
    setDraftRestored(false);
    setRooms([
      ...rooms,
      {
        id: Date.now().toString(),
        name: '',
        room_type: 'consultation',
        capacity: '1',
      },
    ]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length === 1) {
      Alert.alert('Error', 'At least one room is required');
      return;
    }
    setDraftRestored(false);
    setRooms(rooms.filter((room) => room.id !== id));
  };

  const updateRoom = (id: string, field: keyof Room, value: string) => {
    setDraftRestored(false);
    setRooms(rooms.map((room) => (room.id === id ? { ...room, [field]: value } : room)));
  };

  const validateForm = (): boolean => {
    for (const room of rooms) {
      if (!room.name.trim()) {
        Alert.alert('Validation Error', 'Room name is required');
        return false;
      }
      if (!room.capacity || parseInt(room.capacity) < 1) {
        Alert.alert('Validation Error', 'Room capacity must be at least 1');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const submitData = {
        data: {
          rooms: rooms.map((room) => ({
            name: room.name,
            room_type: room.room_type,
            capacity: parseInt(room.capacity),
          })),
        },
        mark_complete: true,
      };
      
      console.log('[TreatmentRoomsScreen] Submitting data:', JSON.stringify(submitData, null, 2));
      console.log('[TreatmentRoomsScreen] Step code:', stepCode);
      
      const result = await submitStepMutation.mutateAsync(submitData);

      console.log('[TreatmentRoomsScreen] Step completed successfully');
      console.log('[TreatmentRoomsScreen] Backend response:', JSON.stringify(result, null, 2));
      setDraftRestored(false);
      await clearStepDraftAndSync(stepCode);
      if (stepCode !== 'rooms_and_therapy_beds') {
        await clearStepDraftAndSync('rooms_and_therapy_beds');
      }

      // Get next step from backend response
      const nextStep = result.next_step;
      
      if (nextStep) {
        console.log('[TreatmentRoomsScreen] Navigating to next step:', nextStep);
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        // If no next_step, the backend might still be processing or there's an issue
        // Let's wait a moment and then check status
        console.log('[TreatmentRoomsScreen] No next_step in response, waiting before checking status...');
        
        // Wait 1 second for backend to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Navigate to setup wizard which will fetch fresh status
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      console.error('[TreatmentRoomsScreen] Submit error:', error);
      console.error('[TreatmentRoomsScreen] Error response:', error.response?.data);
      Alert.alert('Error', error.message || 'Failed to save rooms');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      contentContainerStyle={{ padding: theme.spacing.lg }}
    >
      {draftRestored && <RestoredDraftIndicator />}

      <View style={[styles.header, { marginBottom: theme.spacing.xl }]}>
        <Ionicons name="business" size={48} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text.primary, marginTop: theme.spacing.md },
          ]}
        >
          Add Treatment Rooms
        </Text>
        <Text
          style={[
            theme.typography.body2,
            { color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
          ]}
        >
          Configure your clinic treatment rooms
        </Text>
      </View>

      {rooms.map((room, index) => (
        <View
          key={room.id}
          style={[
            styles.roomCard,
            {
              backgroundColor: theme.colors.surface.default,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border.default,
            },
          ]}
        >
          <View
            style={[
              styles.cardHeader,
              { marginBottom: theme.spacing.md, justifyContent: 'space-between' },
            ]}
          >
            <Text style={[theme.typography.h6, { color: theme.colors.text.primary }]}>
              Room {index + 1}
            </Text>
            {rooms.length > 1 && (
              <TouchableOpacity onPress={() => removeRoom(room.id)}>
                <Ionicons name="trash" size={20} color={theme.colors.feedback.error} />
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Room Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background.default,
                borderColor: theme.colors.border.default,
                color: theme.colors.text.primary,
                padding: theme.spacing.sm,
                marginBottom: theme.spacing.md,
                borderRadius: 4,
                borderWidth: 1,
              },
            ]}
            value={room.name}
            onChangeText={(value) => updateRoom(room.id, 'name', value)}
            placeholder="e.g., Consultation Room 1"
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Room Type *
          </Text>
          <View
            style={[
              styles.typeSelector,
              { marginBottom: theme.spacing.md, flexDirection: 'row', gap: theme.spacing.sm },
            ]}
          >
            {['consultation', 'treatment'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      room.room_type === type
                        ? theme.colors.primary.default
                        : theme.colors.surface.elevated,
                    padding: theme.spacing.sm,
                    borderRadius: 4,
                    flex: 1,
                  },
                ]}
                onPress={() => updateRoom(room.id, 'room_type', type)}
              >
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color:
                        room.room_type === type
                          ? theme.colors.text.onPrimary
                          : theme.colors.text.primary,
                      textAlign: 'center',
                      fontSize: 10,
                    },
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Capacity *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background.default,
                borderColor: theme.colors.border.default,
                color: theme.colors.text.primary,
                padding: theme.spacing.sm,
                borderRadius: 4,
                borderWidth: 1,
              },
            ]}
            value={room.capacity}
            onChangeText={(value) => updateRoom(room.id, 'capacity', value)}
            placeholder="1"
            placeholderTextColor={theme.colors.text.disabled}
            keyboardType="number-pad"
          />
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: theme.colors.surface.default,
            borderColor: theme.colors.primary.default,
            borderWidth: 1,
            borderStyle: 'dashed',
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            borderRadius: 8,
            alignItems: 'center',
          },
        ]}
        onPress={addRoom}
      >
        <Ionicons name="add-circle" size={24} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.button,
            { color: theme.colors.primary.default, marginTop: theme.spacing.xs },
          ]}
        >
          Add Another Room
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: theme.colors.primary.default,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            borderRadius: 8,
            alignItems: 'center',
          },
        ]}
        onPress={handleSubmit}
        disabled={submitStepMutation.isPending}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
          {submitStepMutation.isPending ? 'Saving...' : 'Save & Continue'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.cancelButton,
          {
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
            borderRadius: 8,
            alignItems: 'center',
          },
        ]}
        onPress={() => router.back()}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.primary }]}>
          Cancel
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
  roomCard: {
    // Styles set inline with theme
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    // Styles set inline with theme
  },
  typeSelector: {
    // Styles set inline with theme
  },
  typeButton: {
    // Styles set inline with theme
  },
  addButton: {
    // Styles set inline with theme
  },
  submitButton: {
    // Styles set inline with theme
  },
  cancelButton: {
    // Styles set inline with theme
  },
});
