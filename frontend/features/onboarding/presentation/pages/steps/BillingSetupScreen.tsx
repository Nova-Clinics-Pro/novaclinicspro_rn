/**
 * BillingSetupScreen
 * Configure billing settings
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  useBillingSettingsQuery,
  useSaveBillingSettingsMutation,
  useSubmitStepMutation,
} from '../../../data/repositories/onboarding.repository.impl';
import { clearStepDraftAndSync, useWizardStore } from '../../stores/wizard.store';
import { RestoredDraftIndicator } from '../../components/RestoredDraftIndicator';
import { DraftRevisionEvidence, StepConflictError } from '../../../domain/entities/step-revision.entity';
import { RevisionAwareSaveContext, RevisionAwareSaveHandler } from '../../hooks/useDraftConflictRecovery';

interface BillingSetupScreenProps {
  tenantId: string;
  isWizardMode?: boolean;
  onSuccess?: () => void;
  onRegisterSaveHandler?: (handler: RevisionAwareSaveHandler | null) => void;
  draftBaseEvidence?: DraftRevisionEvidence;
}

interface BillingForm {
  taxEnabled: boolean;
  taxRate: string;
  invoicePrefix: string;
}

const billingSnapshot = (form: BillingForm): string =>
  JSON.stringify({ taxEnabled: form.taxEnabled, taxRate: form.taxRate, invoicePrefix: form.invoicePrefix });

export function BillingSetupScreen({ tenantId, isWizardMode = false, onSuccess, onRegisterSaveHandler, draftBaseEvidence }: BillingSetupScreenProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const [form, setForm] = useState<BillingForm>({ taxEnabled: true, taxRate: '18', invoicePrefix: 'INV' });
  const { taxEnabled, taxRate, invoicePrefix } = form;
  const { setBilling, getStepData } = useWizardStore();
  // Content of the server result most recently applied (null until the first one arrives: the loading state).
  // Compared by content, so a new object with identical content is not treated as new data.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  // Snapshot of what the server holds (or was last saved): the "no change" baseline for submit.
  const [baselineSnapshot, setBaselineSnapshot] = useState<string | null>(null);
  // Snapshot of a restored wizard draft; non-null while the "restored" indicator is shown.
  const [restoredSnapshot, setRestoredSnapshot] = useState<string | null>(null);
  // True once the user has edited the form (reset after a successful save).
  const [edited, setEdited] = useState(false);
  const loading = syncedKey === null;
  const draftRestored = restoredSnapshot !== null;

  const submitStepMutation = useSubmitStepMutation(tenantId, 'financials_and_tax');
  const billingSettingsQuery = useBillingSettingsQuery(tenantId);
  const saveBillingSettingsMutation = useSaveBillingSettingsMutation(tenantId);

  // Server data -> form, applied during render when a new result arrives (not in an effect).
  //  - The baseline always follows the server, so "no change" means "equal to what the server holds".
  //  - The form itself is only replaced while the user has no unsaved edits: a refetch must never overwrite
  //    in-progress input (the whole form is protected, not just the field last touched).
  //  - With no server settings, a stored wizard draft is restored (read when the data arrives).
  const serverSettings = billingSettingsQuery.isLoading ? undefined : billingSettingsQuery.data;
  const serverKey = serverSettings ? JSON.stringify(serverSettings) : null;
  if (serverSettings && serverKey !== syncedKey) {
    setSyncedKey(serverKey);
    const serverForm: BillingForm = {
      taxEnabled: serverSettings.taxEnabled,
      taxRate: serverSettings.taxRate,
      invoicePrefix: serverSettings.invoicePrefix,
    };
    setBaselineSnapshot(billingSnapshot(serverForm));
    const hasUnsavedEdits = edited && billingSnapshot(form) !== baselineSnapshot;
    if (!hasUnsavedEdits) {
      let nextForm = serverForm;
      let restored: string | null = null;
      if (!serverSettings.hasServerBillingSettings) {
        const zustandData = getStepData('financials_and_tax');
        if (zustandData) {
          nextForm = {
            taxEnabled: zustandData.tax_enabled,
            taxRate: String(zustandData.tax_rate),
            invoicePrefix: zustandData.invoice_prefix,
          };
          restored = billingSnapshot(nextForm);
        }
      }
      setForm(nextForm);
      setRestoredSnapshot(restored);
      setEdited(false);
    }
  }

  // User edits: mark the form edited, and drop the "restored" indicator once it no longer matches the draft.
  const updateForm = (patch: Partial<BillingForm>) => {
    const next = { ...form, ...patch };
    setForm(next);
    setEdited(true);
    if (restoredSnapshot !== null && billingSnapshot(next) !== restoredSnapshot) {
      setRestoredSnapshot(null);
    }
  };

  // Save to Zustand whenever form data changes
  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => {
        setBilling({
          tax_enabled: taxEnabled,
          tax_rate: taxEnabled ? parseFloat(taxRate) : 0,
          invoice_prefix: invoicePrefix,
        }, draftBaseEvidence);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [taxEnabled, taxRate, invoicePrefix, loading, setBilling, draftBaseEvidence]);

  const validateForm = (): boolean => {
    if (taxEnabled && (!taxRate || parseFloat(taxRate) < 0 || parseFloat(taxRate) > 100)) {
      Alert.alert('Validation Error', 'Tax rate must be between 0 and 100');
      return false;
    }
    if (!invoicePrefix.trim()) {
      Alert.alert('Validation Error', 'Invoice prefix is required');
      return false;
    }
    return true;
  };

  const handleSubmit = useCallback(async (saveContext?: RevisionAwareSaveContext) => {
    if (loading) {
      console.log('[BillingSetupScreen] Skipping submit - still loading');
      return;
    }
    
    if (!validateForm()) {
      throw new Error('Validation failed');
    }

    // Create snapshot of current form state
    const currentSnapshot = JSON.stringify({
      taxEnabled,
      taxRate,
      invoicePrefix,
    });
    
    // Check if data has changed
    const hasChanges = currentSnapshot !== baselineSnapshot;
    
    console.log('[BillingSetupScreen] Change detection:', { hasChanges });
    
    // If no changes, just advance without API call
    if (!hasChanges && baselineSnapshot !== null) {
      console.log('[BillingSetupScreen] No changes detected, skipping API call');
      if (isWizardMode && onSuccess) {
        onSuccess();
      }
      return;
    }

    try {
      // First, save billing settings to tenant record
      console.log('[BillingSetupScreen] Saving billing settings to tenant...');
      await saveBillingSettingsMutation.mutateAsync({
        tax_enabled: taxEnabled,
        tax_rate: taxEnabled ? parseFloat(taxRate) : 0,
        invoice_prefix: invoicePrefix,
      });

      // Then, mark the step as complete
      const result = await submitStepMutation.mutateAsync({
        idempotencyKey: saveContext?.idempotencyKey,
        data: {
          tax_enabled: taxEnabled,
          tax_rate: taxEnabled ? parseFloat(taxRate) : 0,
          invoice_prefix: invoicePrefix,
        },
        mark_complete: true,
        expected_revision: saveContext?.expectedRevision,
      });

      console.log('[BillingSetupScreen] Step completed successfully');
      console.log('[BillingSetupScreen] Backend response:', JSON.stringify(result, null, 2));
      
      // Update snapshot after successful save
      setBaselineSnapshot(currentSnapshot);
      setRestoredSnapshot(null);
      setEdited(false);
      await clearStepDraftAndSync('financials_and_tax');

      // In wizard mode, call onSuccess callback
      if (isWizardMode && onSuccess) {
        onSuccess();
        return;
      }

      // Standalone mode - navigate to next step
      const nextStep = result.next_step;
      
      if (nextStep) {
        console.log('[BillingSetupScreen] Navigating to next step:', nextStep);
        router.replace(`/onboarding/step-detail?tenantId=${tenantId}&stepCode=${nextStep}`);
      } else {
        console.log('[BillingSetupScreen] No next_step in response, checking onboarding status...');
        router.replace(`/onboarding/setup-wizard?tenantId=${tenantId}`);
      }
    } catch (error: any) {
      if (!(error instanceof StepConflictError)) {
        Alert.alert('Error', 'Failed to save billing settings');
      }
      throw error;
    }
  }, [loading, taxEnabled, taxRate, invoicePrefix, baselineSnapshot, submitStepMutation, saveBillingSettingsMutation, isWizardMode, onSuccess, router, validateForm]);

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
          Loading billing settings...
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
        <Ionicons name="receipt" size={48} color={theme.colors.primary.default} />
        <Text
          style={[
            theme.typography.h4,
            { color: theme.colors.text.primary, marginTop: theme.spacing.md },
          ]}
        >
          Billing Settings
        </Text>
        <Text
          style={[
            theme.typography.body2,
            { color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
          ]}
        >
          Configure your billing preferences
        </Text>
      </View>

      <View
        style={[
          styles.settingCard,
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
        <Text
          style={[
            theme.typography.h6,
            { color: theme.colors.text.primary, marginBottom: theme.spacing.md },
          ]}
        >
          Invoice Prefix
        </Text>
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
          ]}
        >
          Prefix for invoice numbers (e.g., INV-001, INV-002)
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
          value={invoicePrefix}
          onChangeText={(invoicePrefix) => updateForm({ invoicePrefix })}
          placeholder="INV"
          placeholderTextColor={theme.colors.text.disabled}
          autoCapitalize="characters"
        />
      </View>

      <View
        style={[
          styles.settingCard,
          {
            backgroundColor: theme.colors.surface.default,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.xl,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
          }}
        >
          <Text style={[theme.typography.h6, { color: theme.colors.text.primary }]}>
            Enable Tax
          </Text>
          <TouchableOpacity
            style={[
              styles.toggle,
              {
                backgroundColor: taxEnabled
                  ? theme.colors.primary.default
                  : theme.colors.border.default,
                width: 50,
                height: 28,
                borderRadius: 14,
                padding: 2,
                justifyContent: 'center',
              },
            ]}
            onPress={() => updateForm({ taxEnabled: !taxEnabled })}
          >
            <View
              style={[
                styles.toggleThumb,
                {
                  backgroundColor: theme.colors.surface.default,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignSelf: taxEnabled ? 'flex-end' : 'flex-start',
                },
              ]}
            />
          </TouchableOpacity>
        </View>

        {taxEnabled && (
          <>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
              ]}
            >
              Tax Rate (%)
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
              value={taxRate}
              onChangeText={(taxRate) => updateForm({ taxRate })}
              placeholder="18"
              placeholderTextColor={theme.colors.text.disabled}
              keyboardType="decimal-pad"
            />
          </>
        )}
      </View>

      {!isWizardMode && (
        <>
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
        </>
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
  settingCard: {
    // Styles set inline with theme
  },
  input: {
    // Styles set inline with theme
  },
  toggle: {
    // Styles set inline with theme
  },
  toggleThumb: {
    // Styles set inline with theme
  },
  submitButton: {
    // Styles set inline with theme
  },
  cancelButton: {
    // Styles set inline with theme
  },
});
