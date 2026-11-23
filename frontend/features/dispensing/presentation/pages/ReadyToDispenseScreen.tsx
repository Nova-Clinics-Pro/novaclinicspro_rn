/**
 * The dispensing queue: signed prescriptions waiting to be handed over, oldest first.
 */

import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { getDateLocale } from '../../../../core/localization/dateLocale';
import { t } from '../../../../core/localization';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useReadyToDispenseQuery } from '../../data/repositories/dispensing.repository.impl';
import { canDispense } from '../../domain/dispensing';

export const ReadyToDispenseScreen: React.FC = () => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { currentUser } = useAuth();
  const allowed = canDispense(currentUser?.permissions ?? []);
  const queue = useReadyToDispenseQuery(currentUser?.tenantId || '', allowed);
  const locale = getDateLocale();

  if (!allowed) {
    return <SafeAreaView style={styles.container}><Text style={styles.message} testID="queue-no-access">{t('dispensing.noAccess')}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.goBack')} style={styles.back} testID="queue-back">
          <Ionicons name="arrow-back" size={theme.sizes.iconMedium} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">{t('dispensing.title')}</Text>
          <Text style={styles.subtitle}>{t('dispensing.subtitle')}</Text>
        </View>
      </View>
      {queue.isLoading && <ActivityIndicator color={theme.colors.primary.default} />}
      {queue.data && queue.data.length === 0 && <Text style={styles.message} testID="queue-empty">{t('dispensing.emptyQueue')}</Text>}
      <FlatList
        data={queue.data ?? []}
        keyExtractor={(item) => item.prescription_id}
        contentContainerStyle={styles.list}
        refreshing={queue.isFetching}
        onRefresh={() => queue.refetch()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/clinic-admin/dispensing/${item.prescription_id}` as never)} accessibilityRole="button" testID={`queue-item-${item.prescription_id}`}>
            <View style={styles.cardText}>
              <Text style={styles.name}>{item.client_name}</Text>
              <Text style={styles.medicines}>{item.medicines.join(', ')}</Text>
              <Text style={styles.meta}>
                {t('dispensing.signedOn', { date: new Date(item.signed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                {item.doctor_name ? `  ·  ${t('dispensing.by', { doctor: item.doctor_name })}` : ''}
              </Text>
            </View>
            <Text style={styles.action}>{t('dispensing.actions.dispense')}</Text>
          </TouchableOpacity>
        )}
      />
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
    message: { ...theme.typography.body1, color: theme.colors.text.secondary, padding: theme.spacing.lg, textAlign: 'center' },
    list: { padding: theme.spacing.md, gap: theme.spacing.sm },
    card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTarget, padding: theme.spacing.md, borderRadius: theme.radii.large, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.elevated },
    cardText: { flex: 1 },
    name: { ...theme.typography.subtitle1, color: theme.colors.text.primary },
    medicines: { ...theme.typography.body2, color: theme.colors.text.primary },
    meta: { ...theme.typography.caption, color: theme.colors.text.secondary },
    action: { ...theme.typography.button, color: theme.colors.primary.default },
  });

export default ReadyToDispenseScreen;
