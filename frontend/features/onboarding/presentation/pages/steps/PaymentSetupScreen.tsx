/**
 * PaymentSetupScreen
 * Configure payment methods
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useSubmitStepMutation } from '../../../data/repositories/onboarding.repository.impl';
import { axiosClient } from '../../../../../core/api/axiosClient';
import { clearStepDraftAndSync, useWizardStore } from '../../stores/wizard.store';
import { RestoredDraftIndicator } from '../../components/RestoredDraftIndicator';
import { DraftRevisionEvidence, StepConflictError } from '../../../domain/entities/step-revision.entity';
import { RevisionAwareSaveContext, RevisionAwareSaveHandler } from '../../hooks/useDraftConflictRecovery';

interface PaymentSetupScreenProps {
  tenantId: string;
  isWizardMode?: boolean;
  onSuccess?: () => void;
  onRegisterSaveHandler?: (handler: RevisionAwareSaveHandler | null) => void;
  draftBaseEvidence?: DraftRevisionEvidence;
}

export function PaymentSetupScreen({ tenantId, isWizardMode = false, onSuccess, onRegisterSaveHandler, draftBaseEvidence }: PaymentSetupScreenProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['cash']);
  const { setPaymentMethods, getStepData } = useWizardStore();
  const [draftRestored, setDraftRestored] = useState(false);
  const initialSnapshotRef = useRef<string | null>(null);
  const restoredSnapshotRef = useRef<string | null>(null);

  const submitStepMutation = useSubmitStepMutation(tenantId, 'payment_setup');

  useEffect(() => {
    fetchPaymentMethods();
  }, [tenantId]);

  // Save to Zustand whenever form data changes
  useEffect(() => {
    if (!loading) {
      const currentSnapshot = JSON.stringify({ selectedMethods });
      if (draftRestored && restoredSnapshotRef.current !== currentSnapshot) {
        setDraftRestored(false);
        restoredSnapshotRef.current = null;
      }

      const timeout = setTimeout(() => {
        setPaymentMethods({
          payment_methods: selectedMethods,
        }, draftBaseEvidence);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [selectedMethods, loading, setPaymentMethods, draftRestored, draftBaseEvidence]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      console.log('[PaymentSetupScreen] Fetching payment methods for tenant:', tenantId);
      
      // Track loaded values to set snapshot correctly
      let loadedMethods = ['cash'];
      let hasServerPaymentMethods = false;
      
      // Try to fetch existing payment methods from tenant settings
      try {
        const response = await axiosClient.get(`/api/v1/tenants/${tenantId}`);
        console.log('[PaymentSetupScreen] Tenant response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.payment_methods && Array.isArray(response.data.payment_methods)) {
          loadedMethods = response.data.payment_methods;
          hasServerPaymentMethods = true;
          setSelectedMethods(loadedMethods);
          console.log('[PaymentSetupScreen] Loaded existing payment methods:', loadedMethods);
        } else {
          console.log('[PaymentSetupScreen] No existing payment methods, using default: cash');
          setSelectedMethods(loadedMethods);
        }
      } catch (error: any) {
        console.error('[PaymentSetupScreen] Error fetching tenant data:', error);
        // Try alternative endpoint for payment settings
        try {
          const settingsResponse = await axiosClient.get(`/api/v1/clinic/${tenantId}/settings`);
          if (settingsResponse.data.payment_methods) {
            loadedMethods = settingsResponse.data.payment_methods;
            hasServerPaymentMethods = true;
            setSelectedMethods(loadedMethods);
            console.log('[PaymentSetupScreen] Loaded payment methods from settings');
          }
        } catch (settingsError) {
          console.log('[PaymentSetupScreen] Using default payment methods');
          setSelectedMethods(loadedMethods);
        }
      }
      
      // Set initial snapshot with actual loaded values
      initialSnapshotRef.current = JSON.stringify({ selectedMethods: loadedMethods });

      if (!hasServerPaymentMethods) {
        const zustandData = getStepData('payment_setup');
        if (zustandData?.payment_methods && Array.isArray(zustandData.payment_methods)) {
          console.log('[PaymentSetupScreen] Restoring payment methods draft');
          setSelectedMethods(zustandData.payment_methods);
          const restoredSnapshot = JSON.stringify({ selectedMethods: zustandData.payment_methods });
          restoredSnapshotRef.current = restoredSnapshot;
          setDraftRestored(true);
        }
      }
    } catch (error: any) {
      console.error('[PaymentSetupScreen] Error in fetchPaymentMethods:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'cash' },
    { id: 'card', label: 'Card', icon: 'card' },
    { id: 'upi', label: 'UPI', icon: 'phone-portrait' },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: 'business' },
  ];

  const toggleMethod = (methodId: string) => {
    if (selectedMethods.includes(methodId)) {
      if (selectedMethods.length === 1) {
        Alert.alert('Error', 'At least one payment method is required');
        return;
      }
      setSelectedMethods(selectedMethods.filter((id) => id !== methodId));
    } else {
      setSelectedMethods([...selectedMethods, methodId]);
    }
  };

  const handleSubmit = useCallback(async (saveContext?: RevisionAwareSaveContext) => {
    if (loading) {
      console.log('[PaymentSetupScreen] Skipping submit - still loading');
      return;
    }
    
    // Create snapshot of current form state
    const currentSnapshot = JSON.stringify({ selectedMethods });
    
    // Check if data has changed
    const hasChanges = currentSnapshot !== initialSnapshotRef.current;
    
    console.log('[PaymentSetupScreen] Change detection:', { hasChanges });
    
    // If no changes, just advance without API call
    if (!hasChanges && initialSnapshotRef.current !== null) {
      console.log('[PaymentSetupScreen] No changes detected, skipping API call');
      if (isWizardMode && onSuccess) {
        onSuccess();
      }
      return;
    }
    
    try {
      const result = await submitStepMutation.mutateAsync({
        idempotencyKey: saveContext?.idempotencyKey,
        data: {
          payment_methods: selectedMethods,
        },
        mark_complete: true,
        expected_revision: saveContext?.expectedRevision,
      });

      console.log('[PaymentSetupScreen] Step completed successfully');
      console.log('[PaymentSetupScreen] Backend response:', JSON.stringify(result, null, 2));
      
      // Update snapshot after successful save
      initialSnapshotRef.current = currentSnapshot;
      restoredSnapshotRef.current = null;
      setDraftRestored(false);
      await clearStepDraftAndSync('payment_setup');

      // In wizard mode, call onSuccess callback
      if (isWizardMode && onSuccess) {
        onSuccess();
        return;
      }

      // Standalone mode - navigate to next step
      const nextStep = result.next_step;
      
      if (nextStep) {
        console.log('[PaymentSetupScreen] Navigating to next step:', nextStep);
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        console.log('[PaymentSetupScreen] No next_step in response, checking onboarding status...');
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      if (!(error instanceof StepConflictError)) {
        Alert.alert('Error', 'Failed to save payment methods');
      }
      throw error;
    }
  }, [loading, selectedMethods, submitStepMutation, isWizardMode, onSuccess, tenantId, router]);

  // Register/update the save handler with wizard whenever it changes
  useEffect(() => {
    if (onRegisterSaveHandler && isWizardMode) {
      onRegisterSaveHandler(handleSubmit);
    }
    return () => {
      if (onRegisterSaveHandler && isWizardMode) {
        onRegisterSaveHandler(null);
      }
    };
  }, [onRegisterSaveHandler, isWizardMode, handleSubmit]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.default, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
          Loading payment methods...
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
        <Ionicons name="card" size={48} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text.primary, marginTop: theme.spacing.md },
          ]}
        >
          Payment Methods
        </Text>
        <Text
          style={[
            theme.typography.body2,
            { color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
          ]}
        >
          Select payment methods you accept
        </Text>
      </View>

      <View style={{ marginBottom: theme.spacing.xl }}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              {
                backgroundColor: selectedMethods.includes(method.id)
                  ? theme.colors.primary.soft
                  : theme.colors.surface.default,
                borderColor: selectedMethods.includes(method.id)
                  ? theme.colors.primary.default
                  : theme.colors.border.default,
                borderWidth: 2,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.sm,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
            onPress={() => toggleMethod(method.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={method.icon as any}
                size={24}
                color={
                  selectedMethods.includes(method.id)
                    ? theme.colors.primary.default
                    : theme.colors.text.secondary
                }
              />
              <Text
                style={[
                  theme.typography.h6,
                  {
                    color: selectedMethods.includes(method.id)
                      ? theme.colors.primary.default
                      : theme.colors.text.primary,
                    marginLeft: theme.spacing.md,
                  },
                ]}
              >
                {method.label}
              </Text>
            </View>
            {selectedMethods.includes(method.id) && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.default} />
            )}
          </TouchableOpacity>
        ))}
      </View>

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
        onPress={() => void handleSubmit()}
        disabled={submitStepMutation.isPending}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
          {submitStepMutation.isPending ? 'Saving...' : 'Save & Continue'}
        </Text>
      </TouchableOpacity>

      {!isWizardMode && (
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
      )}
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
  methodCard: {
    // Styles set inline with theme
  },
  submitButton: {
    // Styles set inline with theme
  },
  cancelButton: {
    // Styles set inline with theme
  },
});
