/**
 * Dispense a signed prescription: for each medicine pick the stock item and the quantity, see the stock and an estimate of the bill, and
 * create the patient's bill. Stock leaves when the bill is paid (the server's rule), not here.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { getDateLocale } from '../../../../core/localization/dateLocale';
import { t } from '../../../../core/localization';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { usePrescriptionDetailQuery } from '../../../prescriptions/data/repositories/prescriptions.repository.impl';
import { useInventoryItemsListQuery } from '../../../inventory/data/repositories/inventory.repository.impl';
import { useDispenseMutation, useDispensingStatusQuery } from '../../data/repositories/dispensing.repository.impl';
import {
  billEstimate, canDispense, dispenseLinesFrom, exceedsStock, suggestInventoryItem, type DispenseRow, type StockItem,
} from '../../domain/dispensing';
import { dispensingErrorMessage } from '../../domain/dispensingErrorMessage';

const PICK_LIMIT = 6;
const STOCK_LIST_LIMIT = 500;
const COLLECT_PERMISSION = 'invoice.collect_payment';

export const DispenseScreen: React.FC = () => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId: string }>();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';
  const permissions = currentUser?.permissions ?? [];
  const locale = getDateLocale();

  const prescription = usePrescriptionDetailQuery(tenantId, prescriptionId || '');
  const stock = useInventoryItemsListQuery(tenantId, { is_active: true, limit: STOCK_LIST_LIMIT });
  const status = useDispensingStatusQuery(tenantId, prescriptionId || '');
  const dispense = useDispenseMutation(tenantId, prescriptionId || '');

  const items: StockItem[] = useMemo(() => (stock.data?.items ?? []).map((item) => ({
    id: item.id, name: item.name, current_stock: item.current_stock, price: item.price, gst_percentage: item.gst_percentage, unit: item.unit,
  })), [stock.data]);
  const medications = useMemo(() => prescription.data?.prescription_data?.medications ?? [], [prescription.data]);

  const [chosen, setChosen] = useState<Record<number, { itemId: string | null; quantity: string } | undefined>>({});
  const [searching, setSearching] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<{ id: string; number: string } | null>(null);

  const rows: DispenseRow[] = medications.map((medication, index) => {
    const mine = chosen[index];
    if (mine) return mine;
    const suggestion = suggestInventoryItem(medication.name, items);
    return { itemId: suggestion?.id ?? null, quantity: medication.quantity ? String(medication.quantity) : '' };
  });
  const lines = dispenseLinesFrom(rows);
  const estimate = billEstimate(lines, items);
  const itemById = (id: string | null) => items.find((item) => item.id === id);
  const overStock = rows.some((row) => row.itemId && itemById(row.itemId) && exceedsStock(row.quantity, itemById(row.itemId)!));

  const setRow = useCallback((index: number, patch: Partial<DispenseRow>) => {
    setChosen((current) => ({ ...current, [index]: { ...rows[index], ...patch } }));
  }, [rows]);

  const submit = useCallback(async () => {
    setError(null);
    if (lines.length === 0) { setError(t('dispensing.screen.nothingToDispense')); return; }
    try {
      const created = await dispense.mutateAsync(lines);
      setBill({ id: created.id, number: created.invoice_number });
    } catch (failure) {
      setError(dispensingErrorMessage(t, failure));
    }
  }, [lines, dispense]);

  if (!canDispense(permissions)) {
    return <SafeAreaView style={styles.container}><Text style={styles.message} testID="dispense-no-access">{t('dispensing.noAccess')}</Text></SafeAreaView>;
  }

  const money = (amount: number) => amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (bill || status.data?.dispensed) {
    const number = bill?.number ?? status.data?.invoice_number ?? '';
    const invoiceId = bill?.id ?? status.data?.invoice_id ?? null;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={theme.sizes.iconLarge * 2} color={theme.colors.feedback.success} />
          <Text style={styles.title} testID="dispense-done-title">{bill ? t('dispensing.screen.billCreated') : t('dispensing.errors.alreadyDispensed')}</Text>
          {!!number && <Text style={styles.message}>{t('dispensing.screen.billCreatedBody', { number })}</Text>}
          {!!invoiceId && permissions.includes(COLLECT_PERMISSION) && (
            <TouchableOpacity style={styles.primary} onPress={() => router.push(`/clinic-admin/billing/invoices/${invoiceId}` as never)} accessibilityRole="button" testID="dispense-collect">
              <Text style={styles.primaryText}>{t('dispensing.screen.collectPayment')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/clinic-admin/dispensing' as never)} accessibilityRole="button" testID="dispense-done">
            <Text style={styles.secondaryText}>{t('dispensing.screen.done')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.goBack')} style={styles.back} testID="dispense-back">
          <Ionicons name="arrow-back" size={theme.sizes.iconMedium} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{t('dispensing.screen.title')}</Text>
      </View>
      {(prescription.isLoading || stock.isLoading) && <View style={styles.center}><ActivityIndicator color={theme.colors.primary.default} /><Text style={styles.message}>{t('dispensing.screen.loading')}</Text></View>}
      {prescription.data && prescription.data.status !== 'SIGNED' && <Text style={styles.error} testID="dispense-not-signed">{t('dispensing.screen.notSigned')}</Text>}
      <ScrollView contentContainerStyle={styles.body}>
        {prescription.data?.status === 'SIGNED' && medications.map((medication, index) => {
          const row = rows[index];
          const item = itemById(row.itemId);
          const suggested = !chosen[index] && !!item;
          const matches = searching === index ? items.filter((candidate) => candidate.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, PICK_LIMIT) : [];
          return (
            <View key={index} style={styles.card} testID={`dispense-row-${index}`}>
              <Text style={styles.label}>{t('dispensing.screen.medicine')}</Text>
              <Text style={styles.medicine}>{medication.name}</Text>
              <Text style={styles.label}>{t('dispensing.screen.pickItem')}</Text>
              <TouchableOpacity style={styles.picker} onPress={() => { setSearching(searching === index ? null : index); setSearch(''); }} accessibilityRole="button" testID={`dispense-pick-${index}`}>
                <Text style={item ? styles.pickerText : styles.pickerPlaceholder}>{item ? item.name : t('dispensing.screen.chooseItem')}</Text>
                <Ionicons name="chevron-down" size={theme.sizes.iconSmall} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
              {suggested && <Text style={styles.hint}>{t('dispensing.screen.suggested')}</Text>}
              {searching === index && (
                <View>
                  <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder={t('dispensing.screen.searchItems')} placeholderTextColor={theme.colors.text.tertiary} autoCapitalize="none" testID={`dispense-search-${index}`} />
                  {matches.map((candidate) => (
                    <TouchableOpacity key={candidate.id} style={styles.option} onPress={() => { setRow(index, { itemId: candidate.id }); setSearching(null); }} accessibilityRole="button" testID={`dispense-option-${index}-${candidate.id}`}>
                      <Text style={styles.pickerText}>{candidate.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!!item && (
                <Text style={styles.hint}>
                  {Number(item.current_stock) > 0 ? t('dispensing.screen.inStock', { count: item.current_stock, unit: item.unit ?? '' }) : t('dispensing.screen.outOfStock')}
                  {item.price != null ? `  ·  ${t('dispensing.screen.price', { amount: money(item.price) })}` : ''}
                </Text>
              )}
              <Text style={styles.label}>{t('dispensing.screen.quantity')}</Text>
              <TextInput style={styles.input} value={row.quantity} onChangeText={(quantity) => setRow(index, { quantity })} keyboardType="decimal-pad" accessibilityLabel={t('dispensing.screen.quantity')} testID={`dispense-quantity-${index}`} />
              {!!item && exceedsStock(row.quantity, item) && <Text style={styles.error} testID={`dispense-over-${index}`}>{t('dispensing.screen.moreThanStock')}</Text>}
            </View>
          );
        })}
        {prescription.data?.status === 'SIGNED' && (
          <View style={styles.card}>
            <Text style={styles.label}>{t('dispensing.screen.estimate')}</Text>
            <Text style={styles.total} testID="dispense-estimate">{money(estimate)}</Text>
            <Text style={styles.hint}>{t('dispensing.screen.estimateNote')}</Text>
            {!!error && <Text style={styles.error} accessibilityRole="alert" testID="dispense-error">{error}</Text>}
            <TouchableOpacity style={[styles.primary, (dispense.isPending || overStock) && styles.disabled]} onPress={submit} disabled={dispense.isPending || overStock} accessibilityRole="button" testID="dispense-confirm">
              <Text style={styles.primaryText}>{dispense.isPending ? t('dispensing.screen.confirming') : t('dispensing.screen.confirm')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.default },
    header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.sm },
    back: { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, justifyContent: 'center' },
    title: { ...theme.typography.h5, color: theme.colors.text.primary, flex: 1 },
    body: { padding: theme.spacing.md, gap: theme.spacing.md },
    center: { alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.xl },
    message: { ...theme.typography.body1, color: theme.colors.text.secondary, padding: theme.spacing.md, textAlign: 'center' },
    card: { gap: theme.spacing.xs, padding: theme.spacing.md, borderRadius: theme.radii.large, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.elevated },
    label: { ...theme.typography.caption, color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
    medicine: { ...theme.typography.subtitle1, color: theme.colors.text.primary },
    picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default },
    pickerText: { ...theme.typography.body1, color: theme.colors.text.primary },
    pickerPlaceholder: { ...theme.typography.body1, color: theme.colors.text.tertiary },
    option: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderBottomWidth: theme.borderWidths.hairline, borderBottomColor: theme.colors.border.subtle },
    hint: { ...theme.typography.caption, color: theme.colors.text.secondary },
    input: { ...theme.typography.body1, minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, color: theme.colors.text.primary, backgroundColor: theme.colors.background.default },
    total: { ...theme.typography.h4, color: theme.colors.text.primary },
    error: { ...theme.typography.body2, color: theme.colors.feedback.error, padding: theme.spacing.xs },
    primary: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.medium, backgroundColor: theme.colors.primary.default, marginTop: theme.spacing.sm },
    primaryText: { ...theme.typography.button, color: theme.colors.primary.onPrimary },
    secondary: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.primary.default },
    secondaryText: { ...theme.typography.button, color: theme.colors.primary.default },
    disabled: { opacity: 0.5 },
  });

export default DispenseScreen;
