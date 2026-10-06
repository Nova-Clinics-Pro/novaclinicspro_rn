/**
 * Treatment Plans Section Component
 * Displays treatment sheets organized by status
 * 
 * Features:
 * - Two sections: Active, Completed
 * - Treatment sheet cards with progress bars
 * - Loading skeleton and empty states
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTreatmentSheetsByEpisodeQuery } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { TreatmentSheetStatusBadge } from '../../../treatmentSheets/presentation/components/TreatmentSheetStatusBadge';
import { ProgressBar } from '../../../treatmentSheets/presentation/components/ProgressBar';

// ============================================
// TYPES
// ============================================

type TabType = 'active' | 'completed';

interface TreatmentPlansSectionProps {
  /** Episode ID to fetch treatments for */
  episodeId: string;
}

// ============================================
// COMPONENT
// ============================================

export const TreatmentPlansSection: React.FC<TreatmentPlansSectionProps> = ({
  episodeId,
}) => {
  const theme = useClinicTheme();
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const [activeTab, setActiveTab] = useState<TabType>('active');

  // Fetch treatment sheets
  const {
    data: sheetsData,
    isLoading: isLoadingSheets,
    isError: isErrorSheets,
    refetch: refetchSheets,
  } = useTreatmentSheetsByEpisodeQuery(tenantId, episodeId);

  // Filter treatment sheets by status
  const activeSheets = sheetsData?.treatment_sheets?.filter(
    (sheet) => {
      const status = sheet.status as string;
      return status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'DRAFT';
    }
  ) || [];

  const completedSheets = sheetsData?.treatment_sheets?.filter(
    (sheet) => {
      const status = sheet.status as string;
      return status === 'COMPLETED' || status === 'SIGNED' || status === 'FINAL';
    }
  ) || [];

  // Check if there's any data to show
  const hasSheets = (sheetsData?.treatment_sheets?.length || 0) > 0;

  // Don't render section if no data and not loading
  if (!isLoadingSheets && !hasSheets) {
    return null;
  }

  // Render tab button
  const renderTabButton = (tab: TabType, label: string, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tab,
          isActive && { borderBottomColor: theme.colors.primary.default },
        ]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            { color: isActive ? theme.colors.primary.default : theme.colors.text.secondary },
          ]}
        >
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: theme.colors.primary.light }]}>
            <Text style={[styles.countText, { color: theme.colors.primary.default }]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    if (isLoadingSheets) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
            Loading treatment plans...
          </Text>
        </View>
      );
    }

    if (isErrorSheets) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.feedback.error} />
          <Text style={[styles.centerText, { color: theme.colors.text.secondary }]}>
            Failed to load treatment plans
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => refetchSheets()}
            activeOpacity={0.7}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'active':
        return (
          <View style={styles.tabContent}>
            {activeSheets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  No active treatment series
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                  Create a treatment sheet from a casesheet to get started
                </Text>
              </View>
            ) : (
              activeSheets.map((sheet) => (
                <TreatmentSheetCard
                  key={sheet.id}
                  sheet={sheet}
                  theme={theme}
                  router={router}
                />
              ))
            )}
          </View>
        );

      case 'completed':
        return (
          <View style={styles.tabContent}>
            {completedSheets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  No completed treatments
                </Text>
              </View>
            ) : (
              completedSheets.map((sheet) => (
                <TreatmentSheetCard
                  key={sheet.id}
                  sheet={sheet}
                  theme={theme}
                  router={router}
                />
              ))
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Treatment Plans
      </Text>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border.default }]}>
        {renderTabButton('active', 'Active', activeSheets.length)}
        {renderTabButton('completed', 'Completed', completedSheets.length)}
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

// ============================================
// TREATMENT SHEET CARD
// ============================================

interface TreatmentSheetCardProps {
  sheet: any;
  theme: any;
  router: any;
}

const TreatmentSheetCard: React.FC<TreatmentSheetCardProps> = ({
  sheet,
  theme,
  router,
}) => {
  // Calculate progress
  const completedDays = sheet.rows?.filter((row: any) => row.status === 'COMPLETED').length || 0;
  const totalDays = sheet.duration_days || sheet.rows?.length || 0;
  const progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  // Find next session
  const today = new Date();
  const nextSession = sheet.rows
    ?.filter((row: any) => row.session_date && new Date(row.session_date) >= today)
    .sort((a: any, b: any) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];

  // Format date
  const formatSessionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleViewSheet = () => {
    router.push({
      pathname: '/clinic-admin/treatment-sheets/[treatmentSheetId]',
      params: { treatmentSheetId: sheet.id },
    });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.default,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={20} color={theme.colors.feedback.info} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
            Multi-Day Treatment
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.text.secondary }]}>
            {totalDays} days
          </Text>
        </View>
        <TreatmentSheetStatusBadge status={sheet.status} size="small" />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.colors.text.secondary }]}>
            Progress
          </Text>
          <Text style={[styles.progressValue, { color: theme.colors.text.primary }]}>
            {completedDays}/{totalDays} days ({Math.round(progressPercentage)}%)
          </Text>
        </View>
        <ProgressBar progress={progressPercentage} height={8} />
      </View>

      {/* Date range */}
      {sheet.start_date && (
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            Started: {formatDate(sheet.start_date)}
            {sheet.end_date && ` • Ends: ${formatDate(sheet.end_date)}`}
          </Text>
        </View>
      )}

      {/* Next Session */}
      {nextSession && sheet.status !== 'COMPLETED' && (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            Next Session:{' '}
            <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
              {formatSessionDate(nextSession.session_date)}, {nextSession.scheduled_time || 'Time TBD'}
            </Text>
          </Text>
        </View>
      )}

      {/* Package cost */}
      {sheet.agreed_package_cost && (
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={theme.colors.text.secondary} />
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            Package: {sheet.currency || 'INR'} {sheet.agreed_package_cost.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary.default, flex: 1 }]}
          onPress={handleViewSheet}
          activeOpacity={0.7}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.surface.elevated }]}>
            View Treatment Sheet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContent: {
    gap: 12,
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
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
