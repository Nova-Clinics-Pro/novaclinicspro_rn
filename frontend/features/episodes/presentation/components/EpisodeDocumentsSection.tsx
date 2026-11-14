/**
 * Episode Documents Section Component
 * Tabbed view for casesheets, prescriptions, and treatment sheets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';

// ============================================
// TYPES
// ============================================

type DocumentTab = 'casesheets' | 'prescriptions' | 'treatment_sheets';

interface EpisodeDocumentsSectionProps {
  tenantId: string;
  episodeId: string;
  onDocumentPress?: (documentId: string, type: DocumentTab) => void;
}

interface Document {
  id: string;
  date: string;
  type: string;
  clinician?: string;
  title?: string;
}

// ============================================
// TAB BUTTON COMPONENT
// ============================================

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onPress, count }) => {
  const theme = useClinicTheme();

  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isActive && { borderBottomColor: theme.colors.primary.default, borderBottomWidth: 2 },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? theme.colors.primary.default : theme.colors.text.secondary },
        ]}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: theme.colors.primary.light }]}>
          <Text style={[styles.tabBadgeText, { color: theme.colors.primary.default }]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// DOCUMENT ITEM COMPONENT
// ============================================

interface DocumentItemProps {
  document: Document;
  onPress?: () => void;
}

const DocumentItem: React.FC<DocumentItemProps> = ({ document, onPress }) => {
  const theme = useClinicTheme();

  return (
    <TouchableOpacity
      style={[styles.documentItem, { backgroundColor: theme.colors.background.default }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.documentIcon}>
        <Ionicons name="document-text-outline" size={24} color={theme.colors.primary.default} />
      </View>
      <View style={styles.documentContent}>
        <Text style={[styles.documentTitle, { color: theme.colors.text.primary }]}>
          {document.title || document.type}
        </Text>
        <View style={styles.documentMeta}>
          <Ionicons name="calendar-outline" size={12} color={theme.colors.text.tertiary} />
          <Text style={[styles.documentMetaText, { color: theme.colors.text.secondary }]}>
            {document.date}
          </Text>
          {!!document.clinician && (
            <>
              <Ionicons name="person-outline" size={12} color={theme.colors.text.tertiary} style={styles.metaIcon} />
              <Text style={[styles.documentMetaText, { color: theme.colors.text.secondary }]}>
                {document.clinician}
              </Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );
};

// ============================================
// DOCUMENT LIST COMPONENT
// ============================================

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onDocumentPress?: (documentId: string) => void;
  emptyMessage: string;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  error,
  onRetry,
  onDocumentPress,
  emptyMessage,
}) => {
  const theme = useClinicTheme();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.default} />
        <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
          Loading documents...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.colors.feedback.error} />
        <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
          Failed to load documents
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (documents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="folder-open-outline" size={48} color={theme.colors.text.tertiary} />
        <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <DocumentItem
          document={item}
          onPress={() => onDocumentPress?.(item.id)}
        />
      )}
      contentContainerStyle={styles.listContent}
      scrollEnabled={false}
    />
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EpisodeDocumentsSection: React.FC<EpisodeDocumentsSectionProps> = ({
  tenantId,
  episodeId,
  onDocumentPress,
}) => {
  const theme = useClinicTheme();
  const [activeTab, setActiveTab] = useState<DocumentTab>('casesheets');

  // TODO: Replace with actual API calls when available
  // For now, using mock data structure
  const casesheetsData = { items: [], loading: false, error: false };
  const prescriptionsData = { items: [], loading: false, error: false };
  const treatmentSheetsData = { items: [], loading: false, error: false };

  const handleRetry = () => {
    // TODO: Implement retry logic based on active tab
    console.log('Retry loading documents for tab:', activeTab);
  };

  const handleDocumentPress = (documentId: string) => {
    onDocumentPress?.(documentId, activeTab);
  };

  const getActiveTabData = () => {
    switch (activeTab) {
      case 'casesheets':
        return {
          documents: casesheetsData.items,
          loading: casesheetsData.loading,
          error: casesheetsData.error,
          emptyMessage: 'No casesheets in this episode',
        };
      case 'prescriptions':
        return {
          documents: prescriptionsData.items,
          loading: prescriptionsData.loading,
          error: prescriptionsData.error,
          emptyMessage: 'No prescriptions in this episode',
        };
      case 'treatment_sheets':
        return {
          documents: treatmentSheetsData.items,
          loading: treatmentSheetsData.loading,
          error: treatmentSheetsData.error,
          emptyMessage: 'No treatment sheets in this episode',
        };
    }
  };

  const activeTabData = getActiveTabData();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Documents
      </Text>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border.default }]}>
        <TabButton
          label="Casesheets"
          isActive={activeTab === 'casesheets'}
          onPress={() => setActiveTab('casesheets')}
          count={casesheetsData.items.length}
        />
        <TabButton
          label="Prescriptions"
          isActive={activeTab === 'prescriptions'}
          onPress={() => setActiveTab('prescriptions')}
          count={prescriptionsData.items.length}
        />
        <TabButton
          label="Treatment Sheets"
          isActive={activeTab === 'treatment_sheets'}
          onPress={() => setActiveTab('treatment_sheets')}
          count={treatmentSheetsData.items.length}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        <DocumentList
          documents={activeTabData.documents}
          loading={activeTabData.loading}
          error={activeTabData.error}
          onRetry={handleRetry}
          onDocumentPress={handleDocumentPress}
          emptyMessage={activeTabData.emptyMessage}
        />
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 200,
  },
  listContent: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentMetaText: {
    fontSize: 12,
  },
  metaIcon: {
    marginLeft: 8,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
