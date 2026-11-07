/**
 * CompleteConsultationScreen (T-0.8)
 *
 * Renders the backend-owned consultation completion contract
 * (T-BE-F.3 / T-BE-F.3a) — it derives no clinical statement of its own.
 *
 * Removed by this task (ED-ARCH-004): the client-side summary-composition
 * function this screen used to call, its treatment-order-lifecycle-state
 * inference, the hard-coded Ayurveda-specific assessment-template-ID
 * check, absence-rendered-as-a-negative-finding strings, and the local
 * Case Sheet finalize-status API call this screen used to invoke, gated on
 * nothing but the Case Sheet's own existence.
 *
 * No governed consultation-completion mutation endpoint exists yet
 * (verified — only the backend's read-only GET
 * /clinic/{tenant_id}/consultation-completion contract exists; see this
 * task's completion report). The completion action therefore fails
 * closed: it renders the backend's readiness contract in full, but the
 * action itself stays disabled with an existing localized unavailable
 * state, never substituting the old direct Case Sheet status write.
 */
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useConsultationCompletionQuery } from '../../data/repositories/consultationCompletion.repository.impl';
import { ConsultationCompletionResponse } from '../../data/models/consultationCompletion.dtos';

interface CompleteConsultationScreenProps {
  episodeId: string;
  appointmentId: string;
  clientId: string;
}

type ThemeColors = ReturnType<typeof useClinicTheme>['colors'];

const stateColor = (state: string, colors: ThemeColors): string => {
  switch (state) {
    case 'ready':
    case 'ready_with_warnings':
      return colors.feedback.success;
    case 'blocked':
      return colors.feedback.error;
    case 'not_ready':
    case 'waiting_on_permission':
    case 'unresolved':
      return colors.feedback.warning;
    default:
      return colors.text.secondary;
  }
};

export const CompleteConsultationScreen: React.FC<CompleteConsultationScreenProps> = ({
  episodeId,
  appointmentId,
  clientId,
}) => {
  const router = useRouter();
  const { currentUser, selectedClinicId } = useAuth();
  const tenantId = selectedClinicId || currentUser?.tenantId || '';
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();

  const {
    data: contract,
    isLoading,
    isError,
    refetch,
  } = useConsultationCompletionQuery(tenantId, clientId, episodeId, appointmentId);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background.default }]}>
      <View style={[styles.header, { padding: spacing.md, borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h5, { color: colors.text.primary }]}>{t('completeConsultation.title')}</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary.default} />
        </View>
      ) : isError || !contract ? (
        <View style={[styles.center, { padding: spacing.md, gap: spacing.md }]}>
          <Text style={[typography.body2, { color: colors.feedback.error }]}>
            {t('errors.completeConsultation.loadFailed')}
          </Text>
          <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
            <Text style={[typography.button, { color: colors.primary.default }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }}>
            <StateBanner contract={contract} />
            <SemanticList
              titleKey="completeConsultation.sections.mandatory"
              emptyKey="completeConsultation.empty.mandatory"
              items={contract.outstanding_mandatory}
              nameNamespace="completeConsultation.stageNames"
            />
            <SemanticList
              titleKey="completeConsultation.sections.optional"
              emptyKey="completeConsultation.empty.optional"
              items={contract.optional_suggested}
              nameNamespace="completeConsultation.stageNames"
            />
            <SemanticList
              titleKey="completeConsultation.sections.warnings"
              emptyKey="completeConsultation.empty.warnings"
              items={contract.warnings}
              nameNamespace="completeConsultation.reasonCodes"
            />
            <SemanticList
              titleKey="completeConsultation.sections.unresolved"
              emptyKey="completeConsultation.empty.unresolved"
              items={contract.unresolved_facts}
              nameNamespace="completeConsultation.reasonCodes"
            />

            <DocumentSummaryCard
              titleKey="completeConsultation.sections.caseSheet"
              status={contract.case_sheet.document_status}
              recordingState={contract.case_sheet.recording_state}
            />
            <DocumentSummaryCard
              titleKey="completeConsultation.sections.prescription"
              status={contract.prescription.document_status}
              recordingState={contract.prescription.recording_state}
            />
            <DocumentSummaryCard
              titleKey="completeConsultation.sections.treatment"
              status={contract.treatment.lifecycle_status}
              recordingState={contract.treatment.recording_state}
            />
            <DocumentSummaryCard
              titleKey="completeConsultation.sections.billing"
              status={null}
              recordingState={contract.billing.recording_state}
            />
            <DocumentSummaryCard
              titleKey="completeConsultation.sections.visit"
              status={contract.visit.appointment_status}
              recordingState={contract.visit.recording_state}
            />
          </ScrollView>
          <View style={[styles.footer, { padding: spacing.md, borderTopColor: colors.border.subtle, gap: spacing.xs }]}>
            <TouchableOpacity
              disabled
              testID="complete-consultation-button"
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              style={[
                styles.completeButton,
                {
                  backgroundColor: colors.primary.disabled,
                  borderRadius: spacing.sm,
                  padding: spacing.md,
                  gap: spacing.xs,
                },
              ]}
            >
              <Text style={[typography.button, { color: colors.text.disabled }]}>
                {t('completeConsultation.action.complete')}
              </Text>
            </TouchableOpacity>
            <Text style={[typography.caption, { color: colors.text.secondary }]}>
              {t('common.featureUnavailable')}
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const StateBanner: React.FC<{ contract: ConsultationCompletionResponse }> = ({ contract }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  const accent = stateColor(contract.state, colors);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.default, borderColor: accent, borderRadius: spacing.sm, padding: spacing.md, gap: spacing.xs },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[typography.h6, { color: colors.text.primary }]} testID="completion-state-label">
          {t(`completeConsultation.state.${contract.state}`)}
        </Text>
        <View
          style={[
            styles.stateDot,
            { backgroundColor: accent, width: spacing.sm, height: spacing.sm, borderRadius: spacing.xs },
          ]}
          accessibilityElementsHidden
        />
      </View>
    </View>
  );
};

const SemanticList: React.FC<{
  titleKey: string;
  emptyKey: string;
  items: string[];
  nameNamespace: string;
}> = ({ titleKey, emptyKey, items, nameNamespace }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default, borderRadius: spacing.sm, padding: spacing.md, gap: spacing.xs },
      ]}
    >
      <Text style={[typography.h6, { color: colors.text.primary }]}>{t(titleKey)}</Text>
      {items.length === 0 ? (
        <Text style={[typography.body2, { color: colors.text.secondary }]}>{t(emptyKey)}</Text>
      ) : (
        items.map((code) => (
          <Text key={code} style={[typography.body2, { color: colors.text.secondary }]}>
            {t(`${nameNamespace}.${code}`)}
          </Text>
        ))
      )}
    </View>
  );
};

const DocumentSummaryCard: React.FC<{
  titleKey: string;
  status: string | null;
  recordingState: string;
}> = ({ titleKey, status, recordingState }) => {
  const { colors, spacing, typography } = useClinicTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default, borderRadius: spacing.sm, padding: spacing.md, gap: spacing.xs },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[typography.h6, styles.cardTitle, { color: colors.text.primary }]}>{t(titleKey)}</Text>
        <Text style={[typography.caption, { color: colors.text.secondary }]}>
          {status ?? t(`completeConsultation.recordingState.${recordingState}`)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flex: 1 },
  stateDot: {},
  footer: { borderTopWidth: 1 },
  completeButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
