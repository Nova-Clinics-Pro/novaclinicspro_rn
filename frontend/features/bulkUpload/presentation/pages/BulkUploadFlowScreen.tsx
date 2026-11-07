/**
 * Bulk Upload Flow Screen
 * Multi-step bulk upload process: upload -> mapping -> validate -> commit
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  BulkEntityType,
  getEntityTypeLabel,
  canCommitJob,
  StagingRow,
} from '../../data/models/bulkUpload.dtos';
import {
  useBulkUploadMutation,
  useBulkTemplateMutation,
  useJobQuery,
  useApplyMappingMutation,
  useValidateJobMutation,
  useCommitJobMutation,
} from '../../data/repositories/bulkUpload.repository.impl';
import { BulkUploadStepLayout } from '../components/BulkUploadStepLayout';
import { JobStatusPanel } from '../components/JobStatusPanel';
import { ColumnMappingForm } from '../components/ColumnMappingForm';
import { StagingRowItem } from '../components/StagingRowItem';

const STEPS = [
  { title: 'Upload', icon: 'cloud-upload' as const },
  { title: 'Map', icon: 'git-merge' as const },
  { title: 'Validate', icon: 'checkmark-circle' as const },
  { title: 'Commit', icon: 'save' as const },
];

export const BulkUploadFlowScreen: React.FC = () => {
  const router = useRouter();
  const { entityType } = useLocalSearchParams<{ entityType: string }>();
  const entity = (entityType as BulkEntityType) || 'clients';

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Mutations
  const uploadMutation = useBulkUploadMutation();
  const templateMutation = useBulkTemplateMutation();
  const mappingMutation = useApplyMappingMutation(jobId || '');
  const validateMutation = useValidateJobMutation(jobId || '');
  const commitMutation = useCommitJobMutation(jobId || '');

  // Job query (only when we have a jobId)
  const {
    data: jobData,
    isLoading: jobLoading,
    refetch: refetchJob,
  } = useJobQuery(jobId || '', undefined, {
    enabled: !!jobId,
  });

  const job = jobData?.job;
  const rows = jobData?.rows || [];

  const handleDownloadTemplate = async () => {
    try {
      const template = await templateMutation.mutateAsync(entity);

      if (Platform.OS === 'web') {
        const documentRef = (globalThis as any).document;
        if (!documentRef) {
          throw new Error('Template download is not available in this environment.');
        }

        const blob = new Blob([template.csv_content], { type: template.content_type });
        const url = URL.createObjectURL(blob);
        const link = documentRef.createElement('a');
        link.href = url;
        link.download = template.filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const targetDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!targetDirectory) {
        throw new Error('Unable to access device storage for template download.');
      }

      const fileUri = `${targetDirectory}${template.filename}`;
      await FileSystem.writeAsStringAsync(fileUri, template.csv_content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Share.share({
        title: template.filename,
        message: `CSV template saved: ${template.filename}`,
        url: fileUri,
      });
    } catch (error: any) {
      Alert.alert(
        'Template Download Failed',
        error?.message || 'Failed to download template. Please try again.'
      );
    }
  };

  // Handle file selection and upload
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];

      // Upload the file
      const response = await uploadMutation.mutateAsync({
        entityType: entity,
        file: {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'text/csv',
        } as any,
        filename: file.name,
      });

      setJobId(response.job_id);
      setUploadComplete(true);
      setCurrentStep(1); // Move to mapping step
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error?.message || 'Failed to upload file. Please try again.'
      );
    }
  };

  // Handle mapping submission
  const handleApplyMapping = async (mapping: Record<string, string>) => {
    try {
      await mappingMutation.mutateAsync({ mapping });
      setCurrentStep(2); // Move to validate step
    } catch (error: any) {
      Alert.alert(
        'Mapping Failed',
        error?.message || 'Failed to apply column mapping.'
      );
    }
  };

  // Handle validation
  const handleValidate = async () => {
    try {
      await validateMutation.mutateAsync();
      await refetchJob();
      setCurrentStep(3); // Move to commit step
    } catch (error: any) {
      Alert.alert(
        'Validation Failed',
        error?.message || 'Failed to validate data.'
      );
    }
  };

  // Handle commit
  const handleCommit = async () => {
    Alert.alert(
      'Confirm Import',
      `This will import ${job?.valid_rows || 0} valid records. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              const result = await commitMutation.mutateAsync();
              Alert.alert(
                'Import Complete',
                `Successfully imported ${result.created} records.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Import Failed',
                error?.message || 'Failed to import data.'
              );
            }
          },
        },
      ]
    );
  };

  // Render upload step
  const renderUploadStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.uploadArea}>
        <Ionicons name="cloud-upload" size={64} color={colors.primary.main} />
        <Text style={styles.uploadTitle}>Upload CSV File</Text>
        <Text style={styles.uploadSubtitle}>
          Select a CSV file to import {getEntityTypeLabel(entity).toLowerCase()}
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleSelectFile}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <ActivityIndicator color={colors.text.light} />
          ) : (
            <>
              <Ionicons name="folder-open" size={20} color={colors.text.light} />
              <Text style={styles.uploadButtonText}>Select File</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.templateButton}
          onPress={handleDownloadTemplate}
          disabled={templateMutation.isPending}
        >
          {templateMutation.isPending ? (
            <ActivityIndicator color={colors.primary.main} />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color={colors.primary.main} />
              <Text style={styles.templateButtonText}>Download CSV Template</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* File format hints */}
      <View style={styles.hintsCard}>
        <Text style={styles.hintsTitle}>File Requirements</Text>
        <View style={styles.hintItem}>
          <Ionicons name="checkmark" size={16} color={colors.success.main} />
          <Text style={styles.hintText}>CSV format (.csv)</Text>
        </View>
        <View style={styles.hintItem}>
          <Ionicons name="checkmark" size={16} color={colors.success.main} />
          <Text style={styles.hintText}>First row should contain column headers</Text>
        </View>
        <View style={styles.hintItem}>
          <Ionicons name="checkmark" size={16} color={colors.success.main} />
          <Text style={styles.hintText}>UTF-8 encoding recommended</Text>
        </View>
      </View>
    </View>
  );

  // Render mapping step
  const renderMappingStep = () => {
    if (!job) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <JobStatusPanel job={job} />
        <View style={styles.mappingContainer}>
          <ColumnMappingForm
            entityType={entity}
            detectedColumns={job.mapping ? Object.keys(job.mapping) : []}
            suggestedMapping={job.mapping}
            onSubmit={handleApplyMapping}
            isLoading={mappingMutation.isPending}
          />
        </View>
      </View>
    );
  };

  // Render validate step
  const renderValidateStep = () => {
    if (!job) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      );
    }

    const isValidating = job.status === 'validating';

    return (
      <View style={styles.stepContent}>
        <JobStatusPanel job={job} />

        {isValidating ? (
          <View style={styles.validatingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.validatingText}>Validating data...</Text>
          </View>
        ) : job.status === 'mapping' ? (
          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValidate}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <ActivityIndicator color={colors.text.light} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.text.light} />
                <Text style={styles.validateButtonText}>Start Validation</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {/* Rows preview */}
            <Text style={styles.rowsTitle}>
              Preview ({rows.length} rows shown)
            </Text>
            <FlatList
              data={rows}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <StagingRowItem row={item} />}
              style={styles.rowsList}
              contentContainerStyle={styles.rowsListContent}
            />

            {job.status === 'validated' && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setCurrentStep(3)}
              >
                <Text style={styles.nextButtonText}>Continue to Commit</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.text.light} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  // Render commit step
  const renderCommitStep = () => {
    if (!job) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      );
    }

    const canCommit = canCommitJob(job.status, job.valid_rows);
    const isCommitted = job.status === 'committed';

    return (
      <View style={styles.stepContent}>
        <JobStatusPanel job={job} />

        {isCommitted ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success.main} />
            <Text style={styles.successTitle}>Import Complete!</Text>
            <Text style={styles.successSubtitle}>
              {job.committed_rows} records have been imported successfully.
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.back()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : canCommit ? (
          <View style={styles.commitContainer}>
            <Text style={styles.commitTitle}>Ready to Import</Text>
            <Text style={styles.commitSubtitle}>
              {job.valid_rows} valid records will be imported.{"\n"}
              {job.invalid_rows > 0 &&
                `${job.invalid_rows} invalid records will be skipped.`}
            </Text>
            <TouchableOpacity
              style={styles.commitButton}
              onPress={handleCommit}
              disabled={commitMutation.isPending}
            >
              {commitMutation.isPending ? (
                <ActivityIndicator color={colors.text.light} />
              ) : (
                <>
                  <Ionicons name="save" size={20} color={colors.text.light} />
                  <Text style={styles.commitButtonText}>Import Records</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error.main} />
            <Text style={styles.errorTitle}>Cannot Import</Text>
            <Text style={styles.errorSubtitle}>
              No valid records to import. Please go back and fix the validation errors.
            </Text>
            <TouchableOpacity
              style={styles.backStepButton}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.backStepButtonText}>Back to Validation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderUploadStep();
      case 1:
        return renderMappingStep();
      case 2:
        return renderValidateStep();
      case 3:
        return renderCommitStep();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Import {getEntityTypeLabel(entity)}</Text>
          <Text style={styles.headerSubtitle}>Bulk upload from CSV</Text>
        </View>
      </View>

      {/* Step Layout */}
      <BulkUploadStepLayout steps={STEPS} currentStep={currentStep}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {renderStepContent()}
        </ScrollView>
      </BulkUploadStepLayout>
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
    paddingVertical: spacing.md,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  stepContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  // Upload step
  uploadArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    backgroundColor: colors.primary.main + '05',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary.main + '30',
    marginBottom: spacing.lg,
  },
  uploadTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  uploadSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  uploadButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.background.default,
  },
  templateButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.primary.main,
  },
  hintsCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 12,
    padding: spacing.md,
  },
  hintsTitle: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  hintText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  // Mapping step
  mappingContainer: {
    marginTop: spacing.md,
  },
  // Validate step
  validatingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  validatingText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  validateButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
  rowsTitle: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowsList: {
    maxHeight: 300,
  },
  rowsListContent: {
    paddingBottom: spacing.md,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  nextButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
  // Commit step
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  successTitle: {
    ...typography.h5,
    color: colors.success.main,
    marginTop: spacing.md,
  },
  successSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  doneButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  doneButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
  commitContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  commitTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  commitSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  commitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  commitButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.error.main,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  backStepButton: {
    backgroundColor: colors.grey[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  backStepButtonText: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
