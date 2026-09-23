import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import { useCurrentTenantClinicProfileQuery, useUpdateCurrentTenantClinicProfileMutation } from '../../../tenants/data/repositories/tenants.repository.impl';

export const ClinicProfileScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const tenantId = useAuthStore((state) => state.currentUser?.tenantId ?? '');
  const profile = useCurrentTenantClinicProfileQuery(tenantId);
  const update = useUpdateCurrentTenantClinicProfileMutation(tenantId);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [city, setCity] = useState(''); const [state, setState] = useState(''); const [country, setCountry] = useState('');

  useEffect(() => {
    const tenant = profile.data;
    if (!tenant) return;
    setName(tenant.name ?? ''); setEmail(tenant.email ?? '');
    setPhone(Array.isArray(tenant.phones) ? tenant.phones[0] ?? '' : '');
    setCity(String(tenant.address?.city ?? '')); setState(String(tenant.address?.state ?? '')); setCountry(String(tenant.address?.country ?? ''));
  }, [profile.data]);

  const save = async () => {
    try {
      await update.mutateAsync({ name: name.trim(), email: email.trim() || null, phones: phone.trim() ? [phone.trim()] : [], address: { city: city.trim() || null, state: state.trim() || null, country: country.trim() || null } });
      router.back();
    } catch { Alert.alert(t('common.error'), t('common.profileSaveFailed')); }
  };

  if (profile.isLoading) return <SafeAreaView style={styles.screen}><DashboardHeader title={t('common.clinicProfile')} onBackPress={() => router.back()} /><View style={styles.loading}><ActivityIndicator color={colors.primary.main} /></View></SafeAreaView>;
  if (profile.isError || !tenantId) return <SafeAreaView style={styles.screen}><DashboardHeader title={t('common.clinicProfile')} onBackPress={() => router.back()} /><View style={styles.loading}><Text style={styles.text}>{t('common.profileSaveFailed')}</Text><TouchableOpacity style={styles.button} onPress={() => void profile.refetch()}><Text style={styles.buttonText}>{t('common.retry')}</Text></TouchableOpacity></View></SafeAreaView>;

  return <SafeAreaView style={styles.screen}><DashboardHeader title={t('common.clinicProfile')} onBackPress={() => router.back()} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TextInput style={styles.input} value={name} onChangeText={setName} accessibilityLabel={t('common.clinicName')} placeholder={t('common.clinicName')} />
    <TextInput style={styles.input} value={email} onChangeText={setEmail} accessibilityLabel={t('common.clinicEmail')} placeholder={t('common.clinicEmail')} keyboardType="email-address" autoCapitalize="none" />
    <TextInput style={styles.input} value={phone} onChangeText={setPhone} accessibilityLabel={t('common.clinicPhone')} placeholder={t('common.clinicPhone')} keyboardType="phone-pad" />
    <TextInput style={styles.input} value={city} onChangeText={setCity} accessibilityLabel={t('common.city')} placeholder={t('common.city')} />
    <TextInput style={styles.input} value={state} onChangeText={setState} accessibilityLabel={t('common.state')} placeholder={t('common.state')} />
    <TextInput style={styles.input} value={country} onChangeText={setCountry} accessibilityLabel={t('common.country')} placeholder={t('common.country')} />
    <TouchableOpacity style={styles.button} disabled={update.isPending} onPress={() => void save()} accessibilityRole="button"><Text style={styles.buttonText}>{t('common.save')}</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background.default }, content: { padding: spacing.md, gap: spacing.sm }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, input: { borderWidth: 1, borderColor: colors.border.main, borderRadius: 6, padding: spacing.sm, color: colors.text.primary }, button: { alignItems: 'center', borderRadius: 6, backgroundColor: colors.primary.main, padding: spacing.md }, buttonText: { ...typography.button, color: colors.text.light }, text: { ...typography.body1, color: colors.text.primary } });
