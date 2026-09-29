/**
 * StaffSetupScreen
 * Add staff members to the clinic
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
import { axiosClient } from '../../../../../core/api/axiosClient';
import { clearStepDraftAndSync, useWizardStore } from '../../stores/wizard.store';
import { RestoredDraftIndicator } from '../../components/RestoredDraftIndicator';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  phone: string;
  email: string;
}

interface StaffSetupScreenProps {
  tenantId: string;
  stepCode?: string; // Allow passing step code from parent
}

export function StaffSetupScreen({ tenantId, stepCode = 'staff_setup' }: StaffSetupScreenProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: '1',
      name: '',
      role: 'doctor',
      specialization: '',
      phone: '',
      email: '',
    },
  ]);
  const [draftRestored, setDraftRestored] = useState(false);
  const { setStaff, getStepData } = useWizardStore();

  const submitStepMutation = useSubmitStepMutation(tenantId, stepCode);

  useEffect(() => {
    fetchStaffData();
  }, [tenantId]);

  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => {
        setStaff({
          staff_members: staffMembers.map((member) => ({
            name: member.name,
            role: member.role,
            specialization: member.specialization || undefined,
            phone: member.phone,
            email: member.email,
          })),
        });
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [loading, staffMembers, setStaff]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      console.log('[StaffSetupScreen] Fetching staff for tenant:', tenantId);
      
      const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/staff`);
      console.log('[StaffSetupScreen] Staff response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Map existing staff to form format
        const existingStaff = response.data.map((staff: any) => ({
          id: staff.id || Date.now().toString(),
          name: staff.name || '',
          role: staff.role || 'doctor',
          specialization: staff.specialization || '',
          phone: staff.phone || '',
          email: staff.email || '',
        }));
        setStaffMembers(existingStaff);
        console.log('[StaffSetupScreen] Loaded existing staff:', existingStaff.length);
      } else {
        const draft = getStepData(stepCode) || getStepData('staff_and_roles');
        if (draft?.staff_members && Array.isArray(draft.staff_members)) {
          const draftStaff = draft.staff_members.map((member: any, index: number) => ({
            id: String(index + 1),
            name: member.name || '',
            role: member.role || 'doctor',
            specialization: member.specialization || '',
            phone: member.phone || '',
            email: member.email || '',
          }));
          setStaffMembers(draftStaff);
          setDraftRestored(true);
          return;
        }

        console.log('[StaffSetupScreen] No existing staff, showing empty form');
      }
    } catch (error: any) {
      console.error('[StaffSetupScreen] Error fetching staff:', error);
      const draft = getStepData(stepCode) || getStepData('staff_and_roles');
      if (draft?.staff_members && Array.isArray(draft.staff_members)) {
        const draftStaff = draft.staff_members.map((member: any, index: number) => ({
          id: String(index + 1),
          name: member.name || '',
          role: member.role || 'doctor',
          specialization: member.specialization || '',
          phone: member.phone || '',
          email: member.email || '',
        }));
        setStaffMembers(draftStaff);
        setDraftRestored(true);
        return;
      }

      // If API fails, keep the default empty form
      console.log('[StaffSetupScreen] Using default empty form');
    } finally {
      setLoading(false);
    }
  };

  const addStaffMember = () => {
    setDraftRestored(false);
    setStaffMembers([
      ...staffMembers,
      {
        id: Date.now().toString(),
        name: '',
        role: 'doctor',
        specialization: '',
        phone: '',
        email: '',
      },
    ]);
  };

  const removeStaffMember = (id: string) => {
    if (staffMembers.length === 1) {
      Alert.alert('Error', 'At least one staff member is required');
      return;
    }
    setDraftRestored(false);
    setStaffMembers(staffMembers.filter((member) => member.id !== id));
  };

  const updateStaffMember = (id: string, field: keyof StaffMember, value: string) => {
    setDraftRestored(false);
    setStaffMembers(
      staffMembers.map((member) =>
        member.id === id ? { ...member, [field]: value } : member
      )
    );
  };

  const validateForm = (): boolean => {
    for (const member of staffMembers) {
      if (!member.name.trim()) {
        Alert.alert('Validation Error', 'Staff name is required');
        return false;
      }
      if (!member.phone.trim()) {
        Alert.alert('Validation Error', 'Staff phone is required');
        return false;
      }
      if (!member.email.trim()) {
        Alert.alert('Validation Error', 'Staff email is required');
        return false;
      }
      if (!member.email.includes('@')) {
        Alert.alert('Validation Error', 'Invalid email format');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const result = await submitStepMutation.mutateAsync({
        data: {
          staff_members: staffMembers.map((member) => ({
            name: member.name,
            role: member.role,
            specialization: member.specialization || undefined,
            phone: member.phone,
            email: member.email,
          })),
        },
        mark_complete: true,
      });

      console.log('[StaffSetupScreen] Step completed successfully');
      console.log('[StaffSetupScreen] Backend response:', JSON.stringify(result, null, 2));
      setDraftRestored(false);
      await clearStepDraftAndSync(stepCode);
      if (stepCode !== 'staff_and_roles') {
        await clearStepDraftAndSync('staff_and_roles');
      }

      // Get next step from backend response
      const nextStep = result.next_step;
      
      if (nextStep) {
        console.log('[StaffSetupScreen] Navigating to next step:', nextStep);
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        console.log('[StaffSetupScreen] No next_step in response, checking onboarding status...');
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save staff members');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
          Loading staff data...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      contentContainerStyle={{ padding: theme.spacing.lg }}
    >
      {draftRestored && <RestoredDraftIndicator />}

      <View style={[styles.header, { marginBottom: theme.spacing.xl }]}>
        <Ionicons name="people" size={48} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text.primary, marginTop: theme.spacing.md },
          ]}
        >
          Add Staff Members
        </Text>
        <Text
          style={[
            theme.typography.body2,
            { color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
          ]}
        >
          Add doctors, nurses, and other staff members
        </Text>
      </View>

      {staffMembers.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.staffCard,
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
              Staff Member {index + 1}
            </Text>
            {staffMembers.length > 1 && (
              <TouchableOpacity onPress={() => removeStaffMember(member.id)}>
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
            Name *
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
            value={member.name}
            onChangeText={(value) => updateStaffMember(member.id, 'name', value)}
            placeholder="Enter staff name"
            placeholderTextColor={theme.colors.text.disabled}
          />

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Role *
          </Text>
          <View
            style={[
              styles.roleSelector,
              { marginBottom: theme.spacing.md, flexDirection: 'row', gap: theme.spacing.sm },
            ]}
          >
            {['doctor', 'nurse', 'therapist', 'receptionist'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleButton,
                  {
                    backgroundColor:
                      member.role === role
                        ? theme.colors.primary.default
                        : theme.colors.surface.elevated,
                    padding: theme.spacing.sm,
                    borderRadius: 4,
                    flex: 1,
                  },
                ]}
                onPress={() => updateStaffMember(member.id, 'role', role)}
              >
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color:
                        member.role === role
                          ? theme.colors.text.onPrimary
                          : theme.colors.text.primary,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {member.role === 'doctor' && (
            <>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
                ]}
              >
                Specialization
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
                value={member.specialization}
                onChangeText={(value) => updateStaffMember(member.id, 'specialization', value)}
                placeholder="e.g., Ayurveda Physician"
                placeholderTextColor={theme.colors.text.disabled}
              />
            </>
          )}

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Phone *
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
            value={member.phone}
            onChangeText={(value) => updateStaffMember(member.id, 'phone', value)}
            placeholder="+91 9876543210"
            placeholderTextColor={theme.colors.text.disabled}
            keyboardType="phone-pad"
          />

          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
            ]}
          >
            Email *
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
            value={member.email}
            onChangeText={(value) => updateStaffMember(member.id, 'email', value)}
            placeholder="email@example.com"
            placeholderTextColor={theme.colors.text.disabled}
            keyboardType="email-address"
            autoCapitalize="none"
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
        onPress={addStaffMember}
      >
        <Ionicons name="add-circle" size={24} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.button,
            { color: theme.colors.primary.default, marginTop: theme.spacing.xs },
          ]}
        >
          Add Another Staff Member
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
  staffCard: {
    // Styles set inline with theme
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    // Styles set inline with theme
  },
  roleSelector: {
    // Styles set inline with theme
  },
  roleButton: {
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
