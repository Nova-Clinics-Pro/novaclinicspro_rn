/**
 * Templates Screen
 * Manage document templates for the clinic
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import {
  useTemplatesListQuery,
  useDeleteTemplateMutation,
} from '../../data/repositories/templates.repository.impl';
import {
  TemplateResponse,
  TemplateType,
  TEMPLATE_METADATA,
} from '../../data/models/templates.dtos';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import type { SemanticColors } from '../../../../core/theme/semanticColors';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';

// ============================================
// TEMPLATE TYPE TABS
// ============================================

const TEMPLATE_TYPES: { key: TemplateType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'casesheet', label: 'Case Sheets' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'treatment_sheet', label: 'Treatment' },
  { key: 'invoice', label: 'Invoices' },
];

interface TypeTabProps {
  type: { key: TemplateType | 'all'; label: string };
  isActive: boolean;
  onPress: () => void;
}

const TypeTab: React.FC<TypeTabProps> = ({ type, isActive, onPress }) => {
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
  <TouchableOpacity
    style={[styles.typeTab, isActive && styles.typeTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>{type.label}</Text>
  </TouchableOpacity>
);
};

// ============================================
// TEMPLATE CARD COMPONENT
// ============================================

interface TemplateCardProps {
  template: TemplateResponse;
  onPress: () => void;
  onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onPress, onDelete }) => {
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const metadata = TEMPLATE_METADATA[template.template_type];
  if (!metadata) return null;

  return (
    <TouchableOpacity style={styles.templateCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.templateIcon, { backgroundColor: metadata.color + '15' }]}>
        <Ionicons name={metadata.icon as any} size={24} color={metadata.color} />
      </View>
      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateName} numberOfLines={1}>
            {template.name}
          </Text>
          {template.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.templateType}>{metadata.label}</Text>
        {template.description && (
          <Text style={styles.templateDescription} numberOfLines={1}>
            {template.description}
          </Text>
        )}
        <Text style={styles.templateMeta}>
          {template.variables?.length || 0} variables
        </Text>
      </View>
      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// PLACEHOLDER TEMPLATE CARD
// ============================================

interface PlaceholderCardProps {
  type: TemplateType;
  onPress: () => void;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ type, onPress }) => {
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const metadata = TEMPLATE_METADATA[type];
  if (!metadata) return null;

  return (
    <TouchableOpacity
      style={[styles.templateCard, styles.placeholderCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.templateIcon, { backgroundColor: metadata.color + '10' }]}>
        <Ionicons name={metadata.icon as any} size={24} color={metadata.color + '60'} />
      </View>
      <View style={styles.templateInfo}>
        <Text style={[styles.templateName, { color: '#9CA3AF' }]}>{metadata.label}</Text>
        <Text style={styles.templateDescription}>{metadata.description}</Text>
      </View>
      <View style={styles.addIconContainer}>
        <Ionicons name="add-circle" size={24} color="#2F6F4E" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const TemplatesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useClinicTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { currentUser } = useAuthStore();
  const tenantId = currentUser?.tenantId || '';

  const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');

  // Query templates
  const templatesQuery = useTemplatesListQuery(
    tenantId,
    selectedType !== 'all' ? { type: selectedType } : undefined,
    { enabled: !!tenantId }
  );

  const deleteMutation = useDeleteTemplateMutation(tenantId);

  const handleRefresh = useCallback(() => {
    templatesQuery.refetch();
  }, [templatesQuery]);

  const handleDeleteTemplate = useCallback(
    (template: TemplateResponse) => {
      if (template.is_default) {
        Alert.alert('Cannot Delete', 'Default templates cannot be deleted.');
        return;
      }

      Alert.alert(
        'Delete Template',
        `Are you sure you want to delete "${template.name}"?`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync(template.id);
                Alert.alert(t('common.success'), 'Template deleted');
              } catch (error: any) {
                Alert.alert(t('common.error'), error?.message || 'Failed to delete template');
              }
            },
          },
        ]
      );
    },
    [deleteMutation, t]
  );

  const handleCreateTemplate = useCallback(
    (type?: TemplateType) => {
      Alert.alert(
        'Create Template',
        'Template creation will be available soon. Contact support for custom templates.',
        [{ text: t('common.ok') }]
      );
    },
    [t]
  );

  const handleViewTemplate = useCallback(
    (template: TemplateResponse) => {
      Alert.alert(
        template.name,
        `Type: ${TEMPLATE_METADATA[template.template_type]?.label}\n\nVariables: ${
          template.variables?.join(', ') || 'None'
        }\n\nTemplate editing coming soon.`,
        [{ text: t('common.ok') }]
      );
    },
    [t]
  );

  // Filter templates by selected type
  const filteredTemplates =
    selectedType === 'all'
      ? templatesQuery.data?.items || []
      : templatesQuery.data?.items?.filter((t) => t.template_type === selectedType) || [];

  // Get missing template types for placeholders
  const existingTypes = new Set(templatesQuery.data?.items?.map((t) => t.template_type) || []);
  const missingTypes = Object.keys(TEMPLATE_METADATA).filter(
    (type) => !existingTypes.has(type as TemplateType)
  ) as TemplateType[];

  // No tenant context
  if (!tenantId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardHeader
          title="Document Templates"
          subtitle="Manage templates"
          onBackPress={() => router.back()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No clinic context available</Text>
          <Text style={styles.errorSubtext}>Please select a clinic first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DashboardHeader
        title="Document Templates"
        subtitle={`${templatesQuery.data?.total || 0} templates`}
        onBackPress={() => router.back()}
      />

      {/* Type Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {TEMPLATE_TYPES.map((type) => (
          <TypeTab
            key={type.key}
            type={type}
            isActive={selectedType === type.key}
            onPress={() => setSelectedType(type.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={templatesQuery.isRefetching}
            onRefresh={handleRefresh}
            colors={['#2F6F4E']}
            tintColor="#2F6F4E"
          />
        }
      >
        {templatesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F6F4E" />
            <Text style={styles.loadingText}>Loading templates...</Text>
          </View>
        ) : templatesQuery.isError ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={24} color="#EF4444" />
            <Text style={styles.errorBoxText}>Failed to load templates</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Existing Templates */}
            {filteredTemplates.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Templates</Text>
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPress={() => handleViewTemplate(template)}
                    onDelete={() => handleDeleteTemplate(template)}
                  />
                ))}
              </View>
            )}

            {/* Available Template Types */}
            {selectedType === 'all' && missingTypes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Template Types</Text>
                <Text style={styles.sectionSubtitle}>
                  Create templates for these document types
                </Text>
                {missingTypes.map((type) => (
                  <PlaceholderCard
                    key={type}
                    type={type}
                    onPress={() => handleCreateTemplate(type)}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {filteredTemplates.length === 0 && missingTypes.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No Templates</Text>
                <Text style={styles.emptyStateText}>
                  {selectedType === 'all'
                    ? 'No templates configured yet.'
                    : `No ${TEMPLATE_METADATA[selectedType]?.label || selectedType} templates found.`}
                </Text>
              </View>
            )}

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color="#2F6F4E" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>About Templates</Text>
                  <Text style={styles.infoText}>
                    Templates define the format and content of your clinic documents. Use
                    variables like {'{{patient_name}}'} to insert dynamic data.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB - Create Template */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleCreateTemplate()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  tabsContainer: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: colors.surface.default,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  typeTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  typeTabActive: {
    backgroundColor: '#2F6F4E',
  },
  typeTabText: {
    ...typography.body2,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  errorSubtext: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.body2,
    color: '#6B7280',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  templateCard: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  placeholderCard: {
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  templateName: {
    ...typography.body1,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#2F6F4E15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    ...typography.caption,
    color: '#2F6F4E',
    fontWeight: '600',
  },
  templateType: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
  },
  templateDescription: {
    ...typography.caption,
    color: '#9CA3AF',
    marginTop: 2,
  },
  templateMeta: {
    ...typography.caption,
    color: '#2F6F4E',
    fontWeight: '500',
    marginTop: 4,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  addIconContainer: {
    padding: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: '#6B7280',
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  errorBoxText: {
    ...typography.body2,
    color: '#991B1B',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h6,
    color: '#1F2937',
    marginTop: spacing.md,
  },
  emptyStateText: {
    ...typography.body2,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.body2,
    color: '#166534',
    fontWeight: '600',
  },
  infoText: {
    ...typography.caption,
    color: '#166534',
    marginTop: 4,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2F6F4E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default TemplatesScreen;
