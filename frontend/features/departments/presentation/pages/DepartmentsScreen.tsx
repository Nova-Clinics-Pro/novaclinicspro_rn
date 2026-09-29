import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import type { Department } from '../../domain/entities/department.entity';
import { useCreateDepartmentMutation, useDepartmentsQuery, useSetDepartmentActiveMutation, useUpdateDepartmentMutation } from '../../data/repositories/departments.repository.impl';

export const DepartmentsScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const tenantId = useAuthStore(state => state.currentUser?.tenantId ?? '');
  const departments = useDepartmentsQuery(tenantId);
  const create = useCreateDepartmentMutation(tenantId);
  const [editing, setEditing] = useState<Department | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const update = useUpdateDepartmentMutation(tenantId, editing?.id ?? '');
  const setActive = useSetDepartmentActiveMutation(tenantId);
  const isSaving = create.isPending || update.isPending;

  const open = useCallback((department?: Department) => {
    setEditing(department ?? null);
    setName(department?.name ?? '');
    setCode(department?.code ?? '');
    setDescription(department?.description ?? '');
    setIsEditorOpen(true);
  }, []);
  const close = useCallback(() => setIsEditorOpen(false), []);
  const save = useCallback(async () => {
    if (!name.trim() || !code.trim()) return;
    try {
      const input = { name: name.trim(), code: code.trim(), description: description.trim() || null };
      if (editing) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      close();
      Alert.alert(t('common.success'), t('success.saved'));
    } catch {
      Alert.alert(t('common.error'), t('common.createFailed'));
    }
  }, [close, code, create, description, editing, name, t, update]);
  const toggleActive = useCallback(async (department: Department) => {
    try {
      await setActive.mutateAsync({ id: department.id, isActive: !department.isActive });
      Alert.alert(t('common.success'), t('success.updated'));
    } catch {
      Alert.alert(t('common.error'), t('common.createFailed'));
    }
  }, [setActive, t]);

  if (!tenantId) return <SafeAreaView style={styles.screen}><DashboardHeader title={t('common.departments')} onBackPress={() => router.back()} /><Text style={styles.empty}>{t('common.noClinicContext')}</Text></SafeAreaView>;

  return <SafeAreaView style={styles.screen}>
    <DashboardHeader title={t('common.departments')} onBackPress={() => router.back()} />
    {departments.isError ? <View><Text style={styles.empty}>{t('common.createFailed')}</Text><TouchableOpacity style={styles.button} onPress={() => void departments.refetch()}><Text style={styles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View> : <>
      <TouchableOpacity style={styles.button} onPress={() => open()} accessibilityRole="button" accessibilityLabel={t('common.addDepartment')}><Text style={styles.buttonText}>{t('common.addDepartment')}</Text></TouchableOpacity>
      <FlatList data={departments.data ?? []} keyExtractor={item => item.id} refreshing={departments.isFetching} onRefresh={() => void departments.refetch()} contentContainerStyle={styles.list}
        renderItem={({ item }) => <View style={styles.row}><TouchableOpacity style={styles.rowMain} onPress={() => open(item)} accessibilityRole="button" accessibilityLabel={item.name}><Text style={styles.name}>{item.name}</Text><Text style={styles.code}>{item.code}</Text></TouchableOpacity><TouchableOpacity onPress={() => void toggleActive(item)} accessibilityRole="button" accessibilityLabel={t(item.isActive ? 'common.inactive' : 'common.active')}><Text style={item.isActive ? styles.active : styles.inactive}>{t(item.isActive ? 'common.active' : 'common.inactive')}</Text></TouchableOpacity></View>}
        ListEmptyComponent={!departments.isLoading ? <Text style={styles.empty}>{t('common.noDepartments')}</Text> : null} />
    </>}
    <Modal visible={isEditorOpen} transparent animationType="fade" onRequestClose={close}><View style={styles.modal}><View style={styles.dialog}>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('common.departmentName')} accessibilityLabel={t('common.departmentName')} />
      <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder={t('common.departmentCode')} accessibilityLabel={t('common.departmentCode')} />
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder={t('common.description')} accessibilityLabel={t('common.description')} />
      <TouchableOpacity style={styles.button} disabled={isSaving || !name.trim() || !code.trim()} onPress={() => void save()}><Text style={styles.buttonText}>{t('common.save')}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.cancel} onPress={close}><Text style={styles.name}>{t('common.cancel')}</Text></TouchableOpacity>
    </View></View></Modal>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  list: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, backgroundColor: colors.background.paper }, rowMain: { flex: 1 },
  name: { ...typography.body1, color: colors.text.primary }, code: { ...typography.caption, color: colors.text.secondary }, active: { ...typography.caption, color: colors.success.dark }, inactive: { ...typography.caption, color: colors.text.secondary },
  button: { margin: spacing.md, padding: spacing.md, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primary.main }, buttonText: { ...typography.button, color: colors.text.light }, empty: { ...typography.body1, color: colors.text.secondary, padding: spacing.lg, textAlign: 'center' },
  modal: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.35)' }, dialog: { gap: spacing.sm, padding: spacing.lg, borderRadius: 8, backgroundColor: colors.background.default }, input: { borderWidth: 1, borderColor: colors.border.main, borderRadius: 6, padding: spacing.sm, color: colors.text.primary }, cancel: { padding: spacing.sm, alignItems: 'center' },
});
