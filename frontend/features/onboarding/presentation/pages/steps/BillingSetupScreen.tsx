/**
 * BillingSetupScreen
 * Configure billing settings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { DraftRevisionEvidence, StepConflictError } from '../../../domain/entities/step-revision.entity';
import { RevisionAwareSaveContext, RevisionAwareSaveHandler } from '../../hooks/useDraftConflictRecovery';

interface BillingSetupScreenProps {
  tenantId: string;
  isWizardMode?: boolean;
  onSuccess?: () => void;
  onRegisterSaveHandler?: (handler: RevisionAwareSaveHandler | null) => void;
  draftBaseEvidence?: DraftRevisionEvidence;
}

export function BillingSetupScreen({ tenantId, isWizardMode = false, onSuccess, onRegisterSaveHandler, draftBaseEvidence }: BillingSetupScreenProps) {
  const theme = useClinicTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState('18');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const { setBilling, getStepData } = useWizardStore();
  const [draftRestored, setDraftRestored] = useState(false);
  const initialSnapshotRef = useRef<string | null>(null);
  const restoredSnapshotRef = useRef<string | null>(null);

  const submitStepMutation = useSubmitStepMutation(tenantId, 'financials_and_tax');

  useEffect(() => {
    fetchBillingSettings();
  }, [tenantId]);

  // Save to Zustand whenever form data changes
  useEffect(() => {
    if (!loading) {
      const currentSnapshot = JSON.stringify({ taxEnabled, taxRate, invoicePrefix });
      if (draftRestored && restoredSnapshotRef.current !== currentSnapshot) {
        setDraftRestored(false);
        restoredSnapshotRef.current = null;
      }

      const timeout = setTimeout(() => {
        setBilling({
          tax_enabled: taxEnabled,
          tax_rate: taxEnabled ? parseFloat(taxRate) : 0,
          invoice_prefix: invoicePrefix,
        }, draftBaseEvidence);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [taxEnabled, taxRate, invoicePrefix, loading, setBilling, draftRestored, draftBaseEvidence]);

  const fetchBillingSettings = async () => {
    try {
      setLoading(true);
      console.log('[BillingSetupScreen] Fetching billing settings for tenant:', tenantId);
      
      // Track loaded values to set snapshot correctly
      let loadedTaxEnabled = false;
      let loadedTaxRate = '0';
      let loadedInvoicePrefix = 'INV';
      let hasServerBillingSettings = false;
      
      // Try to fetch existing billing settings from tenant
      try {
        const response = await axiosClient.get(`/api/v1/tenants/${tenantId}`);
        console.log('[BillingSetupScreen] Tenant response:', JSON.stringify(response.data, null, 2));
        
        // Check for billing settings in tenant data
        if (response.data.tax_enabled !== undefined) {
          loadedTaxEnabled = response.data.tax_enabled;
          hasServerBillingSettings = true;
          setTaxEnabled(loadedTaxEnabled);
        }
        if (response.data.tax_rate !== undefined) {
          loadedTaxRate = String(response.data.tax_rate);
          hasServerBillingSettings = true;
          setTaxRate(loadedTaxRate);
        }
        if (response.data.invoice_prefix) {
          loadedInvoicePrefix = response.data.invoice_prefix;
          hasServerBillingSettings = true;
          setInvoicePrefix(loadedInvoicePrefix);
        }
        
        console.log('[BillingSetupScreen] Loaded billing settings from tenant');
      } catch (error: any) {
        console.error('[BillingSetupScreen] Error fetching tenant data:', error);
        
        // Try alternative endpoint for billing settings
        try {
          const settingsResponse = await axiosClient.get(`/api/v1/clinic/${tenantId}/settings`);
          if (settingsResponse.data.billing) {
            const billing = settingsResponse.data.billing;
            if (billing.tax_enabled !== undefined) {
              loadedTaxEnabled = billing.tax_enabled;
              hasServerBillingSettings = true;
              setTaxEnabled(loadedTaxEnabled);
            }
            if (billing.tax_rate !== undefined) {
              loadedTaxRate = String(billing.tax_rate);
              hasServerBillingSettings = true;
              setTaxRate(loadedTaxRate);
            }
            if (billing.invoice_prefix) {
              loadedInvoicePrefix = billing.invoice_prefix;
              hasServerBillingSettings = true;
              setInvoicePrefix(loadedInvoicePrefix);
            }
            console.log('[BillingSetupScreen] Loaded billing settings from settings endpoint');
          }
        } catch (settingsError) {
          console.log('[BillingSetupScreen] Using default billing settings');
        }
      }
      
      // Set initial snapshot with actual loaded values
      initialSnapshotRef.current = JSON.stringify({
        taxEnabled: loadedTaxEnabled,
        taxRate: loadedTaxRate,
        invoicePrefix: loadedInvoicePrefix,
      });

      if (!hasServerBillingSettings) {
        const zustandData = getStepData('financials_and_tax');
        if (zustandData) {
          console.log('[BillingSetupScreen] Restoring billing settings draft');
          setTaxEnabled(zustandData.tax_enabled);
          setTaxRate(String(zustandData.tax_rate));
          setInvoicePrefix(zustandData.invoice_prefix);
          const restoredSnapshot = JSON.stringify({
            taxEnabled: zustandData.tax_enabled,
            taxRate: String(zustandData.tax_rate),
            invoicePrefix: zustandData.invoice_prefix,
          });
          restoredSnapshotRef.current = restoredSnapshot;
          setDraftRestored(true);
        }
      }
    } catch (error: any) {
      console.error('[BillingSetupScreen] Error in fetchBillingSettings:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const hasChanges = currentSnapshot !== initialSnapshotRef.current;
    
    console.log('[BillingSetupScreen] Change detection:', { hasChanges });
    
    // If no changes, just advance without API call
    if (!hasChanges && initialSnapshotRef.current !== null) {
      console.log('[BillingSetupScreen] No changes detected, skipping API call');
      if (isWizardMode && onSuccess) {
        onSuccess();
      }
      return;
    }

    try {
      // First, save billing settings to tenant record
      console.log('[BillingSetupScreen] Saving billing settings to tenant...');
      await axiosClient.patch(`/api/v1/tenants/${tenantId}`, {
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
      initialSnapshotRef.current = currentSnapshot;
      restoredSnapshotRef.current = null;
      setDraftRestored(false);
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
  }, [loading, taxEnabled, taxRate, invoicePrefix, tenantId, submitStepMutation, isWizardMode, onSuccess, router, validateForm]);

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
          onChangeText={setInvoicePrefix}
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
            onPress={() => setTaxEnabled(!taxEnabled)}
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
              onChangeText={setTaxRate}
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
