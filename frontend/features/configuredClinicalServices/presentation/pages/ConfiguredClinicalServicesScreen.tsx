import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useConfiguredClinicalServicesQuery, useCreateConfiguredClinicalServiceMutation, useTreatmentCategoriesQuery, useUpdateConfiguredClinicalServiceMutation, type ConfiguredClinicalService } from '../../data/repositories/configuredClinicalServices.repository.impl';

export const ConfiguredClinicalServicesScreen = () => {
  const router = useRouter(); const { t } = useTranslation(); const tenantId = useAuthStore(s => s.currentUser?.tenantId ?? '');
  const query = useConfiguredClinicalServicesQuery(tenantId); const categories = useTreatmentCategoriesQuery(); const create = useCreateConfiguredClinicalServiceMutation(tenantId);
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [categoryCode, setCategoryCode] = useState<string | null>(null); const [editing, setEditing] = useState<ConfiguredClinicalService | null>(null);
  const update = useUpdateConfiguredClinicalServiceMutation(tenantId, editing?.id ?? '');
  const save = async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      const input = { name: name.trim(), code: code.trim(), category_code: categoryCode };
      if (editing) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      setName('');
      setCode('');
      setCategoryCode(null);
      setEditing(null);
      Alert.alert(t('common.success'), t('success.saved'));
    } catch {
      Alert.alert(t('common.error'), t('common.createFailed'));
    }
  };
  if (query.isError) return <View style={styles.screen}><Text style={styles.text}>{t('common.createFailed')}</Text><TouchableOpacity style={styles.button} onPress={() => void query.refetch()}><Text style={styles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View>;
  return <View style={styles.screen}><TouchableOpacity onPress={() => router.back()}><Text style={styles.link}>{t('common.close')}</Text></TouchableOpacity><Text style={styles.title}>{t('onboarding.actions.manageServices.label')}</Text><TextInput style={styles.input} value={name} onChangeText={setName} accessibilityLabel={t('common.name')} /><TextInput style={styles.input} value={code} onChangeText={setCode} accessibilityLabel={t('common.code')} /><View style={styles.categories}><TouchableOpacity style={[styles.category, categoryCode === null && styles.categorySelected]} onPress={() => setCategoryCode(null)} accessibilityRole="button"><Text style={styles.text}>{t('common.noCategory')}</Text></TouchableOpacity>{(categories.data ?? []).map(category => <TouchableOpacity key={category.code} style={[styles.category, categoryCode === category.code && styles.categorySelected]} onPress={() => setCategoryCode(category.code)} accessibilityRole="button"><Text style={styles.text}>{t(category.display_key)}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.button} onPress={() => void save()} disabled={create.isPending || update.isPending}><Text style={styles.buttonText}>{t('common.save')}</Text></TouchableOpacity><FlatList data={query.data ?? []} keyExtractor={item => item.id} renderItem={({ item }) => <TouchableOpacity style={styles.row} onPress={() => { setEditing(item); setName(item.name); setCode(item.code); setCategoryCode(item.categoryCode); }}><Text style={styles.text}>{item.name}</Text><Text style={styles.text}>{item.categoryCode ?? t('common.noCategory')}</Text></TouchableOpacity>} /></View>;
};
const styles = StyleSheet.create({ screen: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background.default }, title: { ...typography.h5, color: colors.text.primary }, text: { ...typography.body1, color: colors.text.primary }, link: { ...typography.body2, color: colors.primary.main }, input: { borderWidth: 1, borderColor: colors.border.main, borderRadius: 6, padding: spacing.sm, color: colors.text.primary }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, category: { borderWidth: 1, borderColor: colors.border.main, borderRadius: 6, padding: spacing.sm }, categorySelected: { borderColor: colors.primary.main, backgroundColor: colors.background.paper }, button: { backgroundColor: colors.primary.main, padding: spacing.md, borderRadius: 6, alignItems: 'center' }, buttonText: { ...typography.button, color: colors.text.light }, row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border.light } });
