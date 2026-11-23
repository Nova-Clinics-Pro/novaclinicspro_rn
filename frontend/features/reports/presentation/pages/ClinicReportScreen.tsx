/**
 * One clinic report: a date range, the report's own options, the table with its totals, a CSV download and a print.
 * Works for every report: the server says what the columns and rows are.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { hasTranslation, t } from '../../../../core/localization';
import { getCurrentLocale } from '../../../../core/localization/i18n';
import { getDateLocale } from '../../../../core/localization/dateLocale';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { ClinicalPrintPreviewModal } from '../../../../core/clinicalPrint/ClinicalPrintPreviewModal';
import { buildReportPrintHtml } from '../../../../core/clinicalPrint/reportHtml';
import { usePrintOptions } from '../../../../core/clinicalPrint/usePrintOptions';
import { saveTextFile } from '../../../../core/utils/saveTextFile';
import { useClinicReportCsvMutation, useClinicReportQuery } from '../../data/repositories/clinicReports.repository.impl';
import { CLINIC_REPORTS, resolveReportRange, type ReportRangePreset } from '../../domain/clinicReports';
import { formatReportCell, reportColumnLabel, reportTotalsRow } from '../../domain/reportFormat';
import { ClinicReportError } from '../../domain/clinicReportError';

const PRESETS: ReportRangePreset[] = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth'];
const GROUPS = ['day', 'week', 'month'] as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const errorMessage = (error: unknown): string => {
  const code = error instanceof ClinicReportError ? error.code : 'REPORT_FAILED';
  const key = `reports.clinic.screen.errors.${code}`;
  return hasTranslation(key) ? t(key) : t('reports.clinic.screen.errors.REPORT_FAILED');
};

export const ClinicReportScreen: React.FC = () => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { reportKey } = useLocalSearchParams<{ reportKey: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const definition = CLINIC_REPORTS.find((report) => report.key === reportKey);

  const [range, setRange] = useState(() => resolveReportRange('last30'));
  const [startText, setStartText] = useState(range.start);
  const [endText, setEndText] = useState(range.end);
  const [dateError, setDateError] = useState(false);
  const [dimension, setDimension] = useState<string | undefined>(definition?.dimensions?.[0]);
  const [groupBy, setGroupBy] = useState<string>(definition?.defaultGroupBy ?? 'day');
  const groupingApplies = !!definition?.groupBy && (!definition.dimensions || dimension === definition.groupByDimension);
  const [printHtml, setPrintHtml] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const { askForPrintOptions, printOptionsDialog } = usePrintOptions();

  const params = useMemo(
    () => ({
      start_date: range.start,
      end_date: range.end,
      dimension,
      group_by: groupingApplies ? groupBy : undefined,
    }),
    [range, dimension, groupBy, groupingApplies],
  );
  const report = useClinicReportQuery(tenantId, definition?.key ?? '', params);
  const csv = useClinicReportCsvMutation(tenantId, definition?.key ?? '');
  const locale = getDateLocale();
  const title = definition ? t(`reports.clinic.reports.${definition.key}.title`) : '';

  const choosePreset = useCallback((preset: ReportRangePreset) => {
    const next = resolveReportRange(preset);
    setRange(next);
    setStartText(next.start);
    setEndText(next.end);
    setDateError(false);
  }, []);

  const applyDates = useCallback(() => {
    if (!ISO_DAY.test(startText) || !ISO_DAY.test(endText)) {
      setDateError(true);
      return;
    }
    setDateError(false);
    setRange({ start: startText, end: endText });
  }, [startText, endText]);

  const columns = report.data?.columns ?? [];
  const rows = report.data?.rows ?? [];
  const totalsRow = report.data ? reportTotalsRow(columns, report.data.totals, t('reports.clinic.screen.total'), locale) : undefined;

  const exportCsv = useCallback(async () => {
    if (!definition) return;
    try {
      const text = await csv.mutateAsync(params);
      await saveTextFile(`${definition.key}_${range.start}_${range.end}.csv`, text);
    } catch {
      Alert.alert(t('reports.clinic.screen.exportCsv'), t('reports.clinic.screen.exportFailed'));
    }
  }, [csv, definition, params, range]);

  const print = useCallback(async () => {
    if (!report.data || !definition) return;
    const options = await askForPrintOptions();
    if (!options) return;
    const formatDay = (day: string) => formatReportCell('date', day, locale);
    setPrintHtml(
      buildReportPrintHtml(
        {
          clinicName: currentUser?.clinicName ?? '',
          title,
          subtitle: t('reports.clinic.screen.printTitleRange', { from: formatDay(range.start), to: formatDay(range.end) }),
          generatedLabel: t('reports.clinic.screen.generatedOn', { date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) }),
          totalLabel: t('reports.clinic.screen.total'),
          language: getCurrentLocale().split('-')[0],
          columns: columns.map((column) => reportColumnLabel(column, t, hasTranslation)),
          rows: rows.map((row) => columns.map((column) => formatReportCell(column.key, row[column.key], locale, t, hasTranslation))),
          totals: totalsRow,
        },
        { paper: options.paper },
      ),
    );
    setShowPrint(true);
  }, [report.data, definition, askForPrintOptions, currentUser?.clinicName, title, range, locale, columns, rows, totalsRow]);

  if (!definition) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>{t('reports.clinic.screen.errors.REPORT_NOT_AVAILABLE')}</Text>
      </SafeAreaView>
    );
  }

  const chip = (label: string, active: boolean, onPress: () => void, testID: string) => (
    <TouchableOpacity key={testID} onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }} testID={testID}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('reports.clinic.screen.back')} style={styles.back} testID="report-back">
          <Ionicons name="arrow-back" size={theme.sizes.iconMedium} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>{t('reports.clinic.screen.dateRange')}</Text>
        <View style={styles.chipRow}>
          {PRESETS.map((preset) => chip(t(`reports.clinic.screen.presets.${preset}`), false, () => choosePreset(preset), `report-preset-${preset}`))}
        </View>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('reports.clinic.screen.from')}</Text>
            <TextInput style={styles.input} value={startText} onChangeText={setStartText} placeholder={t('reports.clinic.screen.dateFormat')} placeholderTextColor={theme.colors.text.tertiary} autoCapitalize="none" accessibilityLabel={t('reports.clinic.screen.from')} testID="report-start" />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>{t('reports.clinic.screen.to')}</Text>
            <TextInput style={styles.input} value={endText} onChangeText={setEndText} placeholder={t('reports.clinic.screen.dateFormat')} placeholderTextColor={theme.colors.text.tertiary} autoCapitalize="none" accessibilityLabel={t('reports.clinic.screen.to')} testID="report-end" />
          </View>
          <TouchableOpacity onPress={applyDates} style={styles.apply} accessibilityRole="button" testID="report-apply">
            <Text style={styles.applyText}>{t('reports.clinic.screen.apply')}</Text>
          </TouchableOpacity>
        </View>
        {dateError && <Text style={styles.error} accessibilityRole="alert" testID="report-date-error">{t('reports.clinic.screen.errors.dateInvalid')}</Text>}

        {!!definition.dimensions && (
          <>
            <Text style={styles.label}>{t('reports.clinic.screen.dimensionLabel')}</Text>
            <View style={styles.chipRow}>
              {definition.dimensions.map((name) => chip(t(`reports.clinic.dimensions.${name}`), dimension === name, () => setDimension(name), `report-dimension-${name}`))}
            </View>
          </>
        )}
        {groupingApplies && (
          <>
            <Text style={styles.label}>{t('reports.clinic.screen.groupByLabel')}</Text>
            <View style={styles.chipRow}>{GROUPS.map((name) => chip(t(`reports.clinic.groupBy.${name}`), groupBy === name, () => setGroupBy(name), `report-group-${name}`))}</View>
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={exportCsv} disabled={!report.data || csv.isPending} style={styles.action} accessibilityRole="button" testID="report-export">
            <Ionicons name="download-outline" size={theme.sizes.iconSmall} color={theme.colors.primary.default} />
            <Text style={styles.actionText}>{t('reports.clinic.screen.exportCsv')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={print} disabled={!report.data} style={styles.action} accessibilityRole="button" testID="report-print">
            <Ionicons name="print-outline" size={theme.sizes.iconSmall} color={theme.colors.primary.default} />
            <Text style={styles.actionText}>{t('reports.clinic.screen.print')}</Text>
          </TouchableOpacity>
        </View>

        {report.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary.default} />
            <Text style={styles.message}>{t('reports.clinic.screen.loading')}</Text>
          </View>
        )}
        {report.isError && (
          <View style={styles.center}>
            <Text style={styles.error} accessibilityRole="alert" testID="report-error">{errorMessage(report.error)}</Text>
            <TouchableOpacity onPress={() => report.refetch()} style={styles.apply} accessibilityRole="button" testID="report-retry">
              <Text style={styles.applyText}>{t('reports.clinic.screen.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {report.data && rows.length === 0 && <Text style={styles.message} testID="report-empty">{t('reports.clinic.screen.empty')}</Text>}
        {report.data && rows.length > 0 && (
          <ScrollView horizontal testID="report-table">
            <View>
              <View style={styles.tableRow}>
                {columns.map((column) => (
                  <Text key={column.key} style={[styles.cell, styles.headCell]}>{reportColumnLabel(column, t, hasTranslation)}</Text>
                ))}
              </View>
              {rows.map((row, index) => (
                <View key={index} style={styles.tableRow} testID={`report-row-${index}`}>
                  {columns.map((column) => (
                    <Text key={column.key} style={styles.cell}>{formatReportCell(column.key, row[column.key], locale, t, hasTranslation)}</Text>
                  ))}
                </View>
              ))}
              {totalsRow && (
                <View style={[styles.tableRow, styles.totalsRow]} testID="report-totals">
                  {totalsRow.map((cell, index) => (
                    <Text key={index} style={[styles.cell, styles.totalCell]}>{cell}</Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </ScrollView>
      {printOptionsDialog}
      <ClinicalPrintPreviewModal visible={showPrint} html={printHtml} title={title} onClose={() => setShowPrint(false)} />
    </SafeAreaView>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.default },
    header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.sm },
    back: { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, justifyContent: 'center' },
    title: { ...theme.typography.h5, color: theme.colors.text.primary, flex: 1 },
    body: { padding: theme.spacing.md, gap: theme.spacing.sm },
    label: { ...theme.typography.caption, color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
    chip: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.pill, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.elevated },
    chipActive: { borderColor: theme.colors.primary.default, backgroundColor: theme.colors.primary.soft },
    chipText: { ...theme.typography.body2, color: theme.colors.text.primary },
    chipTextActive: { color: theme.colors.primary.default, fontWeight: '600' },
    dateRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: theme.spacing.sm },
    dateField: { flexGrow: 1, minWidth: theme.sizes.adminCardMinWidth / 2 },
    input: { ...theme.typography.body1, minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, color: theme.colors.text.primary, backgroundColor: theme.colors.background.elevated },
    apply: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.medium, backgroundColor: theme.colors.primary.default },
    applyText: { ...theme.typography.button, color: theme.colors.primary.onPrimary },
    actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    action: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.primary.default },
    actionText: { ...theme.typography.button, color: theme.colors.primary.default },
    center: { alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg },
    message: { ...theme.typography.body2, color: theme.colors.text.secondary, padding: theme.spacing.md },
    error: { ...theme.typography.body2, color: theme.colors.feedback.error },
    tableRow: { flexDirection: 'row', borderBottomWidth: theme.borderWidths.hairline, borderBottomColor: theme.colors.border.subtle },
    cell: { ...theme.typography.body2, color: theme.colors.text.primary, minWidth: theme.sizes.adminCardMinWidth / 2, padding: theme.spacing.sm },
    headCell: { fontWeight: '700', backgroundColor: theme.colors.background.muted },
    totalsRow: { backgroundColor: theme.colors.background.muted },
    totalCell: { fontWeight: '700' },
  });

export default ClinicReportScreen;
