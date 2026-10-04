import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useClinicalWorkflowQuery } from '../../data/repositories/clinicalWorkflow.repository.impl';

/** R7 E.6: renders backend semantics only; it never changes actionability. */
export const CapabilityLossPanel: React.FC<{ tenantId: string; clientId: string; episodeId: string; appointmentId: string }> = (props) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  const { t } = useTranslation();
  const { data } = useClinicalWorkflowQuery(props.tenantId, props.clientId, props.episodeId, props.appointmentId);
  const losses = data?.capability_loss ?? [];
  const waiting = data?.waiting_role ?? null;
  if (!losses.length && !waiting) return null;
  return <View testID="capability-loss-panel" style={{ backgroundColor: colors.surface.default, borderColor: colors.border.default, borderWidth: borderWidths.default, borderRadius: radii.medium, padding: spacing.md, gap: spacing.xs }}>
    <Text style={[typography.subtitle2, { color: colors.text.primary }]}>{t('visitCommandCenter.capabilityLoss.title')}</Text>
    {losses.map((loss) => <Text key={`${loss.code}:${loss.capability_code}:${loss.stage ?? ''}`} testID={`capability-loss-${loss.code}`} style={[typography.body2, { color: colors.text.secondary }]}>{t(`visitCommandCenter.capabilityLoss.${loss.code}`)}</Text>)}
    {waiting && <Text testID="capability-loss-waiting-owner" style={[typography.body2, { color: colors.text.secondary }]}>{t('visitCommandCenter.capabilityLoss.waitingOwner', { permission: waiting })}</Text>}
  </View>;
};
