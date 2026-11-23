/**
 * On a signed prescription: "Dispense" for someone who may, or "Dispensed" with a link to the bill once it was.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useDispensingStatusQuery } from '../../data/repositories/dispensing.repository.impl';
import { canDispense } from '../../domain/dispensing';

interface DispenseActionProps {
  prescriptionId: string;
  status: string;
}

const READ_BILL_PERMISSION = 'invoice.read';

export const DispenseAction: React.FC<DispenseActionProps> = ({ prescriptionId, status }) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { currentUser } = useAuth();
  const permissions = currentUser?.permissions ?? [];
  const allowed = canDispense(permissions) && status === 'SIGNED';
  const dispensing = useDispensingStatusQuery(currentUser?.tenantId || '', prescriptionId, allowed);

  if (!allowed || !dispensing.data) return null;
  if (dispensing.data.dispensed) {
    return (
      <View style={styles.row} testID="dispense-action-done">
        <Ionicons name="checkmark-circle" size={theme.sizes.iconSmall} color={theme.colors.feedback.success} />
        <Text style={styles.done}>{t('dispensing.actions.dispensed')}</Text>
        {!!dispensing.data.invoice_id && permissions.includes(READ_BILL_PERMISSION) && (
          <TouchableOpacity onPress={() => router.push(`/clinic-admin/billing/invoices/${dispensing.data!.invoice_id}` as never)} accessibilityRole="button" style={styles.link} testID="dispense-view-bill">
            <Text style={styles.linkText}>{t('dispensing.actions.viewBill')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.button} onPress={() => router.push(`/clinic-admin/dispensing/${prescriptionId}` as never)} accessibilityRole="button" testID="dispense-action">
      <Ionicons name="medkit-outline" size={theme.sizes.iconSmall} color={theme.colors.primary.onPrimary} />
      <Text style={styles.buttonText}>{t('dispensing.actions.dispense')}</Text>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    button: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, backgroundColor: theme.colors.primary.default },
    buttonText: { ...theme.typography.button, color: theme.colors.primary.onPrimary },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.sizes.touchTarget },
    done: { ...theme.typography.button, color: theme.colors.feedback.success },
    link: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
    linkText: { ...theme.typography.button, color: theme.colors.primary.default },
  });

export default DispenseAction;
