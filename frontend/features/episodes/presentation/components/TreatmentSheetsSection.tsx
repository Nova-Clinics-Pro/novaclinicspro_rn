/**
 * Treatment Sheets Section Component
 * Displays list of treatment sheets for an episode
 * Part of F3.4: Episode Integration
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTreatmentSheetsByEpisodeQuery } from '../../../treatmentSheets/data/repositories/treatmentSheets.repository.impl';
import { TreatmentSheetStatusBadge } from '../../../treatmentSheets/presentation/components/TreatmentSheetStatusBadge';
import { calculateProgress } from '../../../treatmentSheets/data/models/treatmentSheets.dtos';

interface TreatmentSheetsSectionProps {
  tenantId: string;
  episodeId: string;
  onNavigateToSheet: (sheetId: string) => void;
}

export const TreatmentSheetsSection: React.FC<TreatmentSheetsSectionProps> = ({
  tenantId,
  episodeId,
  onNavigateToSheet,
}) => {
  const theme = useClinicTheme();

  // Fetch treatment sheets for this episode
  const { data: sheetsData, isLoading } = useTreatmentSheetsByEpisodeQuery(
    tenantId,
    episodeId
  );
  const sheets = sheetsData?.treatment_sheets;

  if (isLoading) {
    return (
      <View style={[styles.section, { padding: theme.spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Treatment Sheets
        </Text>
        <ActivityIndicator size="small" color={theme.colors.primary.default} />
      </View>
    );
  }

  if (!sheets || sheets.length === 0) {
    return null;
  }

  return (
    <View style={[styles.section, { padding: theme.spacing.md }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Treatment Sheets ({sheets.length})
      </Text>
      
      {sheets.map((sheet: any) => {
        const progress = calculateProgress(sheet.rows || []);
        
        return (
          <TouchableOpacity
            key={sheet.id}
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.colors.surface.default,
                borderColor: theme.colors.border.default,
              },
            ]}
            onPress={() => onNavigateToSheet(sheet.id)}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetInfo}>
                <Text style={[styles.sheetName, { color: theme.colors.text.primary }]}>
                  {sheet.duration_days} Day Treatment
                </Text>
                {sheet.agreed_package_cost && (
                  <Text style={[styles.sheetCost, { color: theme.colors.text.secondary }]}>
                    ₹{sheet.agreed_package_cost.toLocaleString()}
                  </Text>
                )}
              </View>
              <TreatmentSheetStatusBadge status={sheet.status} size="small" />
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border.default }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: theme.colors.primary.default,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>
                {progress}% Complete
              </Text>
            </View>
            
            <View style={styles.sheetFooter}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.text.secondary} />
              <Text style={[styles.sheetDate, { color: theme.colors.text.secondary }]}>
                Created {new Date(sheet.created_at).toLocaleDateString()}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} style={styles.chevron} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetInfo: {
    flex: 1,
  },
  sheetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sheetCost: {
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sheetDate: {
    fontSize: 12,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
