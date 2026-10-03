/** T-FE-E.4 — Visit-scoped billing presentation and governed navigation. */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../../core/localization/useTranslation';
import { governedInvoiceCreateRoute } from '../../../../billing/application/invoiceRoutes';
import { useClinicalWorkspaceQuery } from '../../../data/repositories/clinicalWorkspace.repository.impl';

export interface BillingStageProps { tenantId: string; clientId: string; episodeId: string; appointmentId: string; }
export const BillingStage: React.FC<BillingStageProps> = ({ tenantId, clientId, episodeId, appointmentId }) => {
  const { colors, spacing, typography, radii, borderWidths } = useClinicTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, isError } = useClinicalWorkspaceQuery(tenantId, clientId, episodeId, appointmentId);
  if (!data) return null;
  const billingCapability = data?.capability.states.billing;
  if (!billingCapability?.effective_available || !billingCapability.effective_enabled) return null;
  const invoicingCapability = data.capability.states['billing.invoicing'];
  const canCreate = Boolean(invoicingCapability?.effective_available && invoicingCapability.effective_enabled && data.permission.granted_codes.includes('invoice.create'));
  const facts = data.billing;
  return <View testID="billing-stage" style={{ backgroundColor: colors.surface.default, borderColor: colors.border.default, borderWidth: borderWidths.default, borderRadius: radii.medium, padding: spacing.lg, gap: spacing.sm }}>
    <Text style={[typography.h6, { color: colors.text.primary }]}>{t('visitCommandCenter.billing.title')}</Text>
    {isLoading && <Text style={[typography.body2, { color: colors.text.secondary }]}>{t('common.loading')}</Text>}
    {isError ? <Text style={[typography.body2, { color: colors.feedback.error }]}>{t('errors.billing.loadFailed')}</Text> : <>
      <Text style={[typography.body2, { color: colors.text.primary }]}>{t('visitCommandCenter.billing.invoiceCount', { count: facts.invoice_count ?? 0 })}</Text>
      {facts.outstanding_amount !== null && <Text style={[typography.body2, { color: colors.text.primary }]}>{t('visitCommandCenter.billing.outstanding', { amount: `${facts.currency ?? ''} ${facts.outstanding_amount}`.trim() })}</Text>}
      {facts.clinical_services_exist && !facts.invoice_exists && <Text testID="billing-unbilled-warning" style={[typography.body2, { color: colors.feedback.warning }]}>{t('visitCommandCenter.billing.unbilledWarning')}</Text>}
      {canCreate && <TouchableOpacity testID="billing-create-invoice" accessibilityRole="button" onPress={() => router.push(governedInvoiceCreateRoute(appointmentId) as never)}><Text style={[typography.button, { color: colors.primary.default }]}>{t('visitCommandCenter.billing.createInvoice')}</Text></TouchableOpacity>}
    </>}
  </View>;
};
