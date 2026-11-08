/**
 * PaymentSetupScreen
 * Configure payment methods
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { usePaymentMethodsQuery, useSubmitStepMutation } from '../../../data/repositories/onboarding.repository.impl';
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

const paymentSnapshot = (methods: string[]): string => JSON.stringify({ selectedMethods: methods });

export function PaymentSetupScreen({ tenantId, isWizardMode = false, onSuccess, onRegisterSaveHandler, draftBaseEvidence }: PaymentSetupScreenProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['cash']);
  const { setPaymentMethods, getStepData } = useWizardStore();
  // Content of the server result most recently applied (null until the first one arrives: the loading state).
  // Compared by content, so a new object with identical content is not treated as new data.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  // Snapshot of what the server holds (or was last saved): the "no change" baseline for submit.
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  // Snapshot of a restored wizard draft; non-null while the "restored" indicator is shown.
  const [restoredSnapshot, setRestoredSnapshot] = useState<string | null>(null);
  // True once the user has edited the selection (reset after a successful save).
  const [edited, setEdited] = useState(false);
  const loading = syncedKey === null;
  const draftRestored = restoredSnapshot !== null;

  const submitStepMutation = useSubmitStepMutation(tenantId, 'payment_setup');
  const paymentMethodsQuery = usePaymentMethodsQuery(tenantId);

  // Server data -> selection, applied during render when a new result arrives (not in an effect).
  //  - The baseline always follows the server, so "no change" means "equal to what the server holds".
  //  - The selection itself is only replaced while the user has no unsaved edits: a refetch must never
  //    overwrite an in-progress selection.
  //  - With no server methods, a stored wizard draft is restored (read when the data arrives).
  const serverResult = paymentMethodsQuery.isLoading ? undefined : paymentMethodsQuery.data;
  const serverKey = serverResult ? JSON.stringify(serverResult) : null;
  if (serverResult && serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    const { paymentMethods: serverMethods, hasServerPaymentMethods } = serverResult;
    setBaselineSnapshot(paymentSnapshot(serverMethods));
    const hasUnsavedEdits = edited && paymentSnapshot(selectedMethods) !== baselineSnapshot;
    if (!hasUnsavedEdits) {
      let nextMethods = serverMethods;
      let restored: string | null = null;
      if (!hasServerPaymentMethods) {
        const zustandData = getStepData('payment_setup');
        if (Array.isArray(zustandData?.payment_methods)) {
          nextMethods = zustandData.payment_methods;
          restored = paymentSnapshot(nextMethods);
        }
      }
      setSelectedMethods(nextMethods);
      setRestoredSnapshot(restored);
      setEdited(false);
    }
  }

  // User edits: mark the selection edited, and drop the "restored" indicator once it no longer matches the draft.
  const updateSelection = (next: string[]) => {
    setSelectedMethods(next);
    setEdited(true);
    if (restoredSnapshot !== null && paymentSnapshot(next) !== restoredSnapshot) {
      setRestoredSnapshot(null);
    }
  };

  // Save to Zustand whenever form data changes
  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => {
        setPaymentMethods({
          payment_methods: selectedMethods,
        }, draftBaseEvidence);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [selectedMethods, loading, setPaymentMethods, draftBaseEvidence]);


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
      updateSelection(selectedMethods.filter((id) => id !== methodId));
    } else {
      updateSelection([...selectedMethods, methodId]);
    }
  };

  const handleSubmit = useCallback(async (saveContext?: RevisionAwareSaveContext) => {
    if (loading) {
      return;
    }
    
    // Create snapshot of current form state
    const currentSnapshot = JSON.stringify({ selectedMethods });
    
    // Check if data has changed
    const hasChanges = currentSnapshot !== baselineSnapshot;
    
    // If no changes, just advance without API call
    if (!hasChanges && baselineSnapshot !== null) {
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

      // Update snapshot after successful save
      setBaselineSnapshot(currentSnapshot);
      setRestoredSnapshot(null);
      setEdited(false);
      await clearStepDraftAndSync('payment_setup');

      // In wizard mode, call onSuccess callback
      if (isWizardMode && onSuccess) {
        onSuccess();
        return;
      }

      // Standalone mode - navigate to next step
      const nextStep = result.next_step;
      
      if (nextStep) {
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      if (!(error instanceof StepConflictError)) {
        Alert.alert('Error', 'Failed to save payment methods');
      }
      throw error;
    }
  }, [loading, selectedMethods, baselineSnapshot, submitStepMutation, isWizardMode, onSuccess, tenantId, router]);

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
