/**
 * Reports home: the clinic's own reports this person may open, in three groups.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { CLINIC_REPORTS, reportsForPermissions, type ClinicReportGroup } from '../../domain/clinicReports';

const GROUPS: ClinicReportGroup[] = ['money', 'operations', 'clinical'];

export const ReportsHomeScreen: React.FC = () => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { currentUser } = useAuth();
  const offered = useMemo(() => reportsForPermissions(currentUser?.permissions ?? []), [currentUser?.permissions]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.goBack')} style={styles.back} testID="reports-back">
          <Ionicons name="arrow-back" size={theme.sizes.iconMedium} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">{t('reports.clinic.title')}</Text>
          <Text style={styles.subtitle}>{t('reports.clinic.subtitle')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {offered.length === 0 && <Text style={styles.empty} testID="reports-no-access">{t('reports.clinic.emptyAccess')}</Text>}
        {GROUPS.map((group) => {
          const reports = CLINIC_REPORTS.filter((report) => report.group === group && offered.some((o) => o.key === report.key));
          if (!reports.length) return null;
          return (
            <View key={group} style={styles.group}>
              <Text style={styles.groupTitle}>{t(`reports.clinic.groups.${group}`)}</Text>
              {reports.map((report) => (
                <TouchableOpacity
                  key={report.key}
                  style={styles.card}
                  onPress={() => router.push(`/clinic-admin/reports/${report.key}` as never)}
                  accessibilityRole="button"
                  testID={`report-card-${report.key}`}
                >
                  <Ionicons name={report.icon as keyof typeof Ionicons.glyphMap} size={theme.sizes.iconLarge} color={theme.colors.primary.default} />
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{t(`reports.clinic.reports.${report.key}.title`)}</Text>
                    <Text style={styles.cardDescription}>{t(`reports.clinic.reports.${report.key}.description`)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={theme.sizes.iconSmall} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.default },
    header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.sm },
    back: { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, justifyContent: 'center' },
    headerText: { flex: 1 },
    title: { ...theme.typography.h5, color: theme.colors.text.primary },
    subtitle: { ...theme.typography.body2, color: theme.colors.text.secondary },
    body: { padding: theme.spacing.md, gap: theme.spacing.md },
    empty: { ...theme.typography.body1, color: theme.colors.text.secondary },
    group: { gap: theme.spacing.sm },
    groupTitle: { ...theme.typography.subtitle1, color: theme.colors.text.secondary },
    card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTarget, padding: theme.spacing.md, borderRadius: theme.radii.large, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.elevated },
    cardText: { flex: 1 },
    cardTitle: { ...theme.typography.subtitle1, color: theme.colors.text.primary },
    cardDescription: { ...theme.typography.body2, color: theme.colors.text.secondary },
  });
