/**
 * Casesheet Detail Screen
 * Displays detailed view of a single casesheet with:
 * - Header/Footer branding
 * - Create Treatment Sheet flow
 * - Extensions display
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { ClinicalPrintPreviewModal } from '../../../../core/clinicalPrint/ClinicalPrintPreviewModal';
import { buildCasesheetPrintHtml } from '../../../../core/clinicalPrint/adapters';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useCasesheetDetailQuery,
  useTransitionCasesheetStatusMutation,
  usePrintCasesheetMutation,
  useArchiveCasesheetMutation,
} from '../../data/repositories/casesheets.repository.impl';
import {
  formatDateTime,
  isEditable,
  getAllowedTransitions,
} from '../../data/models/casesheets.dtos';
import type { CasesheetStatus } from '../../data/models/casesheets.dtos';
import { useCreateTreatmentSheetMutation } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { CasesheetStatusBadge } from '../components/CasesheetStatusBadge';
import { EmptyCasesheetsState } from '../components/EmptyCasesheetsState';
import { useQueryClient } from '@tanstack/react-query';

const DURATION_OPTIONS = [
  { days: 7, label: '7 Days' },
  { days: 14, label: '14 Days' },
  { days: 21, label: '21 Days' },
  { days: 30, label: '30 Days' },
  { days: 45, label: '45 Days' },
  { days: 60, label: '60 Days' },
];

export const CasesheetDetailScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string; casesheetId: string }>();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = currentUser?.tenantId || '';
  const clientId = params.clientId || '';
  const casesheetId = params.casesheetId || '';

  // Treatment Sheet Creation Modal State
  const [showCreateTSModal, setShowCreateTSModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(14);
  const [customDuration, setCustomDuration] = useState('');

  const {
    data: casesheet,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCasesheetDetailQuery(tenantId, casesheetId);

  // Fetch client details to show name, age, gender, phone
  const { data: client, isLoading: isClientLoading } = useQuery({
    queryKey: ['client', tenantId, clientId],
    queryFn: async () => {
      const { axiosClient } = await import('../../../../core/api/axiosClient');
      const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/clients/${clientId}`);
      console.log('📋 Client data loaded:', {
        full_name: response.data.full_name,
        age: response.data.age,
        age_type: typeof response.data.age,
        age_is_null: response.data.age === null,
        age_is_undefined: response.data.age === undefined,
        gender: response.data.gender,
        gender_type: typeof response.data.gender,
        phone: response.data.phone,
        raw: response.data
      });
      return response.data;
    },
    enabled: !!tenantId && !!clientId,
  });

  // Fetch episode details to show disease name in treatment sheet section
  const { data: episode } = useQuery({
    queryKey: ['episode', tenantId, casesheet?.episode_id],
    queryFn: async () => {
      const { axiosClient } = await import('../../../../core/api/axiosClient');
      const response = await axiosClient.get(`/api/v1/clinic/${tenantId}/episodes/${casesheet?.episode_id}`);
      return response.data;
    },
    enabled: !!tenantId && !!casesheet?.episode_id,
  });

  // Fetch treatment sheets for this episode
  // Primary: Use casesheet.treatment_sheet_id if available
  // Fallback: Fetch by episode_id (always enabled as backend may not update treatment_sheet_id yet)
  const { data: treatmentSheetsData } = useQuery({
    queryKey: ['treatment-sheets-by-episode', tenantId, casesheet?.episode_id],
    queryFn: async () => {
      const { axiosClient } = await import('../../../../core/api/axiosClient');
      const response = await axiosClient.get(
        `/api/v1/clinic/${tenantId}/treatment-sheets`,
        { params: { episode_id: casesheet?.episode_id } }
      );
      console.log('[CasesheetDetail] Treatment sheets by episode response:', response.data);
      return response.data;
    },
    enabled: !!tenantId && !!casesheet?.episode_id,
  });

  // Determine which treatment sheet to show:
  // 1. First priority: casesheet.treatment_sheet_id (direct link from backend)
  // 2. Fallback: Most recent treatment sheet from episode query
  const treatmentSheetId = casesheet?.treatment_sheet_id || treatmentSheetsData?.treatment_sheets?.[0]?.id;
  
  // Debug logging
  console.log('[CasesheetDetail] Treatment sheet detection:', {
    casesheetId: casesheet?.id,
    treatment_sheet_id: casesheet?.treatment_sheet_id,
    episodeId: casesheet?.episode_id,
    fallbackTreatmentSheets: treatmentSheetsData?.treatment_sheets?.length || 0,
    fallbackTreatmentSheetIds: treatmentSheetsData?.treatment_sheets?.map((ts: any) => ts.id) || [],
    finalTreatmentSheetId: treatmentSheetId,
  });

  const transitionMutation = useTransitionCasesheetStatusMutation(tenantId, casesheetId);
  const printMutation = usePrintCasesheetMutation(tenantId, casesheetId);
  const archiveMutation = useArchiveCasesheetMutation(tenantId, casesheetId, clientId);
  const createTSMutation = useCreateTreatmentSheetMutation(casesheetId);

  const handleTransition = useCallback(async (newStatus: CasesheetStatus) => {
    try {
      await transitionMutation.mutateAsync({ status: newStatus });
      Alert.alert('Success', `Casesheet ${newStatus.toLowerCase()} successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update casesheet status.');
    }
  }, [transitionMutation]);

  // BUG FIX #5: Show print preview modal with HTML content
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printHtmlContent, setPrintHtmlContent] = useState<string>('');

  const handlePrint = useCallback(async () => {
    try {
      const result: any = await printMutation.mutateAsync();
      setPrintHtmlContent(buildCasesheetPrintHtml(result));
      setShowPrintPreview(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to print casesheet.');
    }
  }, [printMutation]);

  const handleArchive = useCallback(async () => {
    try {
      await archiveMutation.mutateAsync();
      Alert.alert('Success', 'Casesheet archived successfully.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to archive casesheet.');
    }
  }, [archiveMutation, router]);

  const handleEdit = useCallback(() => {
    router.push({
      pathname: '/clinic-admin/clients/[clientId]/casesheets/[casesheetId]/edit' as any,
      params: { clientId, casesheetId },
    });
  }, [router, clientId, casesheetId]);

  const handleCreateTreatmentSheet = useCallback(async () => {
    const duration = customDuration ? parseInt(customDuration, 10) : selectedDuration;
    if (!duration || duration < 1) {
      Alert.alert('Error', 'Please select a valid duration.');
      return;
    }

    try {
      const result = await createTSMutation.mutateAsync({ duration_days: duration });
      setShowCreateTSModal(false);
      
      // Invalidate casesheet query - backend now updates treatment_sheet_id
      queryClient.invalidateQueries({ queryKey: ['casesheets', 'detail', tenantId, casesheetId] });
      await refetch();
      
      Alert.alert(
        'Success',
        'Treatment sheet created successfully.',
        [
          {
            text: 'View Treatment Sheet',
            onPress: () => {
              router.push({
                pathname: '/clinic-admin/treatment-sheets/[treatmentSheetId]' as any,
                params: { treatmentSheetId: result.id, casesheetId },
              });
            },
          },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create treatment sheet.');
    }
  }, [createTSMutation, selectedDuration, customDuration, router, refetch, queryClient, tenantId, casesheetId]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Casesheet</Text>
        {casesheet && (
          <CasesheetStatusBadge status={casesheet.status} size="small" />
        )}
      </View>
      {casesheet && (
        <View style={styles.headerActions}>
          {/* Edit Button (only for drafts) */}
          {isEditable(casesheet.status) && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit casesheet"
            >
              <Ionicons name="create-outline" size={20} color={colors.primary.main} />
            </TouchableOpacity>
          )}
          {/* Finalize/Sign Button */}
          {getAllowedTransitions(casesheet.status).length > 0 && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                const nextStatus = getAllowedTransitions(casesheet.status)[0];
                handleTransition(nextStatus);
              }}
              accessibilityRole="button"
              accessibilityLabel={getAllowedTransitions(casesheet.status)[0] === 'SIGNED' ? 'Sign casesheet' : 'Finalize casesheet'}
            >
              <Ionicons 
                name={getAllowedTransitions(casesheet.status)[0] === 'SIGNED' ? 'shield-checkmark' : 'checkmark-circle'} 
                size={20} 
                color={colors.success.main} 
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const renderBrandingHeader = () => {
    const headerData = casesheet?.header_snapshot;
    // Don't render anything if no header data exists
    if (!headerData || (!headerData.logo_url && !headerData.clinic_name && !headerData.tagline && !headerData.address && !headerData.phone)) {
      return null;
    }

    return (
      <View style={styles.brandingSection} testID="branding-header">
        {headerData.logo_url && (
          <Image
            source={{ uri: headerData.logo_url }}
            style={styles.brandingLogo}
            resizeMode="contain"
            accessibilityLabel="Clinic logo"
          />
        )}
        <View style={styles.brandingInfo}>
          {headerData.clinic_name && (
            <Text style={styles.brandingClinicName}>{headerData.clinic_name}</Text>
          )}
          {headerData.tagline && (
            <Text style={styles.brandingTagline}>{headerData.tagline}</Text>
          )}
          {headerData.address && (
            <Text style={styles.brandingAddress}>{headerData.address}</Text>
          )}
          {headerData.phone && (
            <Text style={styles.brandingContact}>
              <Ionicons name="call-outline" size={12} color={colors.text.secondary} /> {headerData.phone}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderBrandingFooter = () => {
    const footerData = casesheet?.footer_snapshot;
    if (!footerData) return null;

    return (
      <View style={styles.brandingFooterSection} testID="branding-footer">
        {footerData.legal_text && (
          <Text style={styles.footerLegalText}>{footerData.legal_text}</Text>
        )}
        {footerData.registration_no && (
          <Text style={styles.footerRegistration}>Reg. No: {footerData.registration_no}</Text>
        )}
        {footerData.website && (
          <Text style={styles.footerWebsite}>{footerData.website}</Text>
        )}
      </View>
    );
  };

  const renderSection = (title: string, content: string | null | undefined, icon: keyof typeof Ionicons.glyphMap) => {
    if (!content) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={18} color={colors.primary.main} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.sectionContent}>{content}</Text>
      </View>
    );
  };

  const renderExtensions = () => {
    const extensions = casesheet?.data_json?.extensions;
    if (!extensions || extensions.length === 0) return null;

    return (
      <View style={styles.extensionsSection} testID="extensions-section">
        <View style={styles.extensionsHeader}>
          <Ionicons name="extension-puzzle" size={20} color={colors.info.main} />
          <Text style={styles.extensionsTitle}>Extensions</Text>
        </View>
        {extensions.map((ext: any, index: number) => (
          <View key={ext.template_id || index} style={styles.extensionItem}>
            <Text style={styles.extensionTemplate}>
              {ext.template_name || `Extension ${index + 1}`}
            </Text>
            {ext.data && Object.entries(ext.data).map(([key, value]) => (
              <View key={key} style={styles.extensionField}>
                <Text style={styles.extensionFieldLabel}>{key.replace(/_/g, ' ')}:</Text>
                <Text style={styles.extensionFieldValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderCreateTreatmentSheetModal = () => (
    <Modal
      visible={showCreateTSModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateTSModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Treatment Sheet</Text>
            <TouchableOpacity
              onPress={() => setShowCreateTSModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Select treatment duration</Text>

          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.days}
                style={[
                  styles.durationOption,
                  selectedDuration === option.days && !customDuration && styles.durationOptionSelected,
                ]}
                onPress={() => {
                  setSelectedDuration(option.days);
                  setCustomDuration('');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${option.label}`}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    selectedDuration === option.days && !customDuration && styles.durationOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customDurationContainer}>
            <Text style={styles.customDurationLabel}>Or enter custom days:</Text>
            <TextInput
              style={styles.customDurationInput}
              value={customDuration}
              onChangeText={(text) => {
                setCustomDuration(text.replace(/[^0-9]/g, ''));
              }}
              placeholder="e.g., 90"
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Custom duration in days"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCreateTSModal(false)}
              accessibilityRole="button"
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalCreateButton,
                createTSMutation.isPending && styles.modalButtonDisabled,
              ]}
              onPress={handleCreateTreatmentSheet}
              disabled={createTSMutation.isPending}
              accessibilityRole="button"
              testID="create-treatment-sheet-confirm"
            >
              {createTSMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.common.white} />
              ) : (
                <Text style={styles.modalCreateText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading casesheet...</Text>
        </View>
      );
    }

    if (isError || !casesheet) {
      return (
        <EmptyCasesheetsState
          variant="error"
          title="Unable to Load Casesheet"
          message={
            error?.message?.includes('401')
              ? 'Authentication failed. Please try logging in again.'
              : 'Could not load this casesheet. Please try again.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      );
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header Branding */}
        {renderBrandingHeader()}

        {/* Client Info - Show name with age/gender badge, and phone */}
        {client && (
          <View style={styles.clientInfoCard}>
            <View style={styles.clientNameRow}>
              <Text style={styles.clientName}>
                {client.full_name || 'Unknown Patient'}
              </Text>
              {(() => {
                const hasAge = client.age !== null && client.age !== undefined;
                const hasGender = !!client.gender;
                const shouldShowBadge = hasAge || hasGender;
                console.log('🏷️ Age/Gender Badge Check:', { hasAge, hasGender, shouldShowBadge, age: client.age, gender: client.gender });
                
                return shouldShowBadge ? (
                  <View style={styles.ageGenderBadge}>
                    <Text style={styles.ageGenderText}>
                      {hasAge ? client.age : '?'}/{hasGender ? String(client.gender).charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                ) : null;
              })()}
            </View>
            {client.phone && (
              <View style={styles.clientDetail}>
                <Ionicons name="call-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.clientDetailText}>{client.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Document Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Recorded:</Text>
            <Text style={styles.infoValue}>{formatDateTime(casesheet.recorded_at)}</Text>
          </View>
          {casesheet.signed_at && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success.main} />
              <Text style={styles.infoLabel}>Signed:</Text>
              <Text style={[styles.infoValue, { color: colors.success.main }]}>
                {formatDateTime(casesheet.signed_at)}
              </Text>
            </View>
          )}
          {(casesheet as any).recorded_by_name && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Recorded by:</Text>
              <Text style={styles.infoValue}>{(casesheet as any).recorded_by_name}</Text>
            </View>
          )}
        </View>

        {/* Clinical Sections */}
        {renderSection('Chief Complaint', casesheet.chief_complaint, 'alert-circle-outline')}
        {renderSection('Provisional Diagnosis', casesheet.provisional_diagnosis, 'medical-outline')}
        {renderSection('Final Diagnosis', casesheet.final_diagnosis, 'checkmark-circle-outline')}

        {/* SOAP Data (if available in data_json) */}
        {casesheet.data_json && (
          <View style={styles.soapContainer}>
            <Text style={styles.soapTitle}>Clinical Notes</Text>
            {casesheet.data_json.subjective && renderSection('Subjective', casesheet.data_json.subjective, 'person-outline')}
            {casesheet.data_json.objective && renderSection('Objective', casesheet.data_json.objective, 'eye-outline')}
            {casesheet.data_json.assessment && renderSection('Assessment', casesheet.data_json.assessment, 'analytics-outline')}
            {casesheet.data_json.plan && renderSection('Plan', casesheet.data_json.plan, 'list-outline')}
          </View>
        )}

        {/* Extensions */}
        {renderExtensions()}

        {/* Footer Branding */}
        {renderBrandingFooter()}

        {/* Other Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Other Actions</Text>
          <View style={styles.otherActionsRow}>
            {/* Print Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handlePrint}
              disabled={printMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Print casesheet"
            >
              <Ionicons name="print-outline" size={18} color={colors.text.primary} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Print</Text>
            </TouchableOpacity>

            {/* Archive Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => {
                Alert.alert(
                  'Archive Casesheet',
                  'This will archive the casesheet. It will no longer appear in the active list. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Archive',
                      style: 'destructive',
                      onPress: handleArchive,
                    },
                  ]
                );
              }}
              disabled={archiveMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Archive casesheet"
            >
              <Ionicons name="archive-outline" size={18} color={colors.error.main} />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <View style={styles.content}>
        {renderContent()}
      </View>
      {renderCreateTreatmentSheetModal()}
      <ClinicalPrintPreviewModal
        visible={showPrintPreview}
        html={printHtmlContent}
        title="Case Sheet Preview"
        onClose={() => setShowPrintPreview(false)}
      />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.paper,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Branding Header
  brandingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.main + '30',
  },
  brandingLogo: {
    width: 60,
    height: 60,
    marginRight: spacing.md,
  },
  brandingInfo: {
    flex: 1,
  },
  brandingClinicName: {
    ...typography.h6,
    color: colors.primary.main,
    fontWeight: '700',
  },
  brandingTagline: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  brandingAddress: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  brandingContact: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Branding Footer
  brandingFooterSection: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  footerLegalText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footerRegistration: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  footerWebsite: {
    ...typography.caption,
    color: colors.primary.main,
    marginTop: spacing.xs,
  },

  // Client Info Card
  clientInfoCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  clientName: {
    ...typography.h6,
    color: colors.text.primary,
    fontWeight: '600',
  },
  ageGenderBadge: {
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ageGenderText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
    fontSize: 12,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  clientDetailText: {
    ...typography.body2,
    color: colors.text.secondary,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  infoValue: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },

  // Sections
  section: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.primary.main,
    fontWeight: '600',
  },
  sectionContent: {
    ...typography.body1,
    color: colors.text.primary,
    lineHeight: 22,
  },
  soapContainer: {
    marginTop: spacing.sm,
  },
  soapTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Extensions
  extensionsSection: {
    backgroundColor: colors.info.main + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.info.main + '30',
  },
  extensionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  extensionsTitle: {
    ...typography.body1,
    color: colors.info.main,
    fontWeight: '600',
  },
  extensionItem: {
    backgroundColor: colors.common.white,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  extensionTemplate: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  extensionField: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  extensionFieldLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    marginRight: spacing.xs,
  },
  extensionFieldValue: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
  },

  // Actions
  actionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionsTitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  otherActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  actionButtonText: {
    ...typography.button,
  },
  secondaryButton: {
    backgroundColor: colors.grey[200],
  },
  secondaryButtonText: {
    color: colors.text.primary,
  },
  dangerButton: {
    backgroundColor: colors.error.main + '15',
    borderWidth: 1,
    borderColor: colors.error.main,
  },
  dangerButtonText: {
    color: colors.error.main,
  },

  // Treatment Sheets
  treatmentSheetsSection: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success.main + '30',
  },
  treatmentSheetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  treatmentSheetsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.success.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  treatmentSheetsInfo: {
    flex: 1,
  },
  treatmentSheetsTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  treatmentSheetsSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  createTreatmentSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.success.main + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success.main + '30',
    gap: spacing.xs,
  },
  createTreatmentSheetText: {
    ...typography.button,
    color: colors.success.main,
    flex: 1,
  },
  viewTreatmentSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.success.main + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success.main + '30',
    gap: spacing.xs,
  },
  viewTreatmentSheetText: {
    ...typography.button,
    color: colors.success.main,
  },
  treatmentSheetDisease: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  modalSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  durationOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.background.default,
    minWidth: 80,
    alignItems: 'center',
  },
  durationOptionSelected: {
    borderColor: colors.success.main,
    backgroundColor: colors.success.main + '15',
  },
  durationOptionText: {
    ...typography.body2,
    color: colors.text.primary,
  },
  durationOptionTextSelected: {
    color: colors.success.main,
    fontWeight: '600',
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  customDurationLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  customDurationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.success.main,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalCreateText: {
    ...typography.button,
    color: colors.common.white,
  },

  // BUG FIX #5: Print Preview Modal Styles
  printPreviewContainer: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  printPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.default,
  },
  printPreviewTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  printPreviewCloseButton: {
    padding: spacing.xs,
  },
  printPreviewWebView: {
    flex: 1,
  },
});

export default CasesheetDetailScreen;
