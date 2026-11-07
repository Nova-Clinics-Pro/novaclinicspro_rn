import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClinicalPrintPreviewModal } from '../../../../core/clinicalPrint/ClinicalPrintPreviewModal';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { LivingDocumentVersionSummary } from '../../data/models/livingDocuments.dtos';

interface Props {
  versions: LivingDocumentVersionSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  selectedSnapshot: Record<string, unknown> | undefined;
  isSnapshotLoading: boolean;
  isSnapshotError: boolean;
  onPrintVersion: (versionId: string) => Promise<string>;
  canAmend: boolean;
  onAmend: () => Promise<void>;
  isAmending: boolean;
  testIDPrefix: string;
}

/** Presentation-only: renders backend ordering/metadata verbatim and exposes no snapshot mutation. */
export const LivingDocumentVersionHistory: React.FC<Props> = ({
  versions, isLoading, isError, selectedVersionId, onSelectVersion, selectedSnapshot,
  isSnapshotLoading, isSnapshotError, onPrintVersion, canAmend, onAmend, isAmending, testIDPrefix,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const [printHtml, setPrintHtml] = useState<string | null>(null);
  const [printError, setPrintError] = useState(false);
  const selectedVersion = versions?.find((version) => version.version_id === selectedVersionId);

  const print = async (versionId: string) => {
    setPrintError(false);
    try { setPrintHtml(await onPrintVersion(versionId)); } catch { setPrintError(true); }
  };

  return (
    <View testID={`${testIDPrefix}-version-history`} style={[styles.card, { borderColor: colors.border.default, borderRadius: spacing.sm, padding: spacing.md, gap: spacing.sm }]}>
      <Text style={[typography.h6, { color: colors.text.primary }]}>{t('livingDocuments.versionHistory')}</Text>
      {isLoading && <ActivityIndicator color={colors.primary.default} />}
      {isError && <Text style={[typography.body2, { color: colors.feedback.error }]}>{t('livingDocuments.historyError')}</Text>}
      {!isLoading && !isError && (versions?.length ?? 0) === 0 && <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('livingDocuments.noSignedVersions')}</Text>}
      {versions?.map((version) => (
        <View key={version.version_id} style={[styles.row, { borderTopColor: colors.border.subtle, paddingTop: spacing.sm }]}>
          <TouchableOpacity testID={`${testIDPrefix}-version-${version.version_id}`} accessibilityRole="button" onPress={() => onSelectVersion(version.version_id)}>
            <Text style={[typography.button, { color: colors.text.link }]}>{t('livingDocuments.version', { number: version.version_number })}</Text>
            <Text style={[typography.caption, { color: version.is_current ? colors.feedback.success : colors.text.secondary }]}>
              {version.is_current ? t('livingDocuments.current') : version.is_superseded ? t('livingDocuments.superseded') : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity testID={`${testIDPrefix}-print-${version.version_id}`} accessibilityRole="button" onPress={() => print(version.version_id)}>
            <Text style={[typography.button, { color: colors.primary.default }]}>{t('livingDocuments.printVersion')}</Text>
          </TouchableOpacity>
        </View>
      ))}
      {canAmend && <TouchableOpacity testID={`${testIDPrefix}-amend`} accessibilityRole="button" disabled={isAmending} onPress={onAmend} style={[styles.amend, { backgroundColor: colors.primary.default, borderRadius: spacing.sm, padding: spacing.sm }]}><Text style={[typography.button, { color: colors.primary.onPrimary }]}>{t('livingDocuments.amend')}</Text></TouchableOpacity>}
      {printError && <Text style={[typography.caption, { color: colors.feedback.error }]}>{t('livingDocuments.printError')}</Text>}
      <Modal visible={!!selectedVersionId} animationType="slide" onRequestClose={() => onSelectVersion('')}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          <Text style={[typography.h5, { color: colors.text.primary }]}>{t('livingDocuments.historicalVersion')}</Text>
          {selectedVersion && <Text style={[typography.body1, { color: colors.text.primary }]}>{t('livingDocuments.version', { number: selectedVersion.version_number })} — {selectedVersion.is_current ? t('livingDocuments.current') : t('livingDocuments.superseded')}</Text>}
          {isSnapshotLoading && <ActivityIndicator color={colors.primary.default} />}
          {isSnapshotError && <Text style={[typography.body2, { color: colors.feedback.error }]}>{t('livingDocuments.historyError')}</Text>}
          {selectedSnapshot && <Text testID={`${testIDPrefix}-historical-read-only`} selectable style={[typography.body2, { color: colors.text.primary }]}>{JSON.stringify(selectedSnapshot, null, 2)}</Text>}
          <TouchableOpacity accessibilityRole="button" onPress={() => onSelectVersion('')}><Text style={[typography.button, { color: colors.primary.default }]}>{t('common.close')}</Text></TouchableOpacity>
        </ScrollView>
      </Modal>
      <ClinicalPrintPreviewModal visible={!!printHtml} html={printHtml ?? ''} title={t('livingDocuments.printVersion')} onClose={() => setPrintHtml(null)} />
    </View>
  );
};

const styles = StyleSheet.create({ card: { borderWidth: 1 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, amend: { minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
