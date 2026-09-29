import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardHeader } from '../../../../core/components/DashboardHeader';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import {
  useCurrentTenantClinicProfileQuery,
  useUpdateCurrentTenantClinicProfileMutation,
  useUploadCurrentTenantClinicLogoMutation,
} from '../../../tenants/data/repositories/tenants.repository.impl';

type ProfileSection = 'basic' | 'contact' | 'business' | 'branding';

const sections: readonly ProfileSection[] = ['basic', 'contact', 'business', 'branding'];

export const ClinicProfileScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tenantId = useAuthStore((state) => state.currentUser?.tenantId ?? '');
  const profile = useCurrentTenantClinicProfileQuery(tenantId);
  const update = useUpdateCurrentTenantClinicProfileMutation(tenantId);
  const uploadLogo = useUploadCurrentTenantClinicLogoMutation(tenantId);
  const [section, setSection] = useState<ProfileSection>('basic');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('');
  const [registration, setRegistration] = useState('');
  const [pan, setPan] = useState('');
  const [gst, setGst] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = profile.data;
    if (!value) return;
    setName(value.name ?? ''); setEmail(value.email ?? '');
    setPhone(value.phones?.[0] ?? ''); setWebsite(value.website_address ?? '');
    setStreet(value.address?.street ?? ''); setCity(value.address?.city ?? '');
    setState(value.address?.state ?? ''); setPincode(value.address?.pincode ?? ''); setCountry(value.address?.country ?? '');
    setRegistration(value.clinic_registration ?? ''); setPan(value.clinic_pan ?? ''); setGst(value.clinic_gst ?? '');
    setLogo(value.clinic_logo ?? null);
  }, [profile.data]);

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        name: name.trim(), email: email.trim() || null, phones: phone.trim() ? [phone.trim()] : [],
        website_address: website.trim() || null,
        clinic_registration: registration.trim() || null, clinic_pan: pan.trim() || null, clinic_gst: gst.trim() || null,
        address: { street: street.trim() || null, city: city.trim() || null, state: state.trim() || null, pincode: pincode.trim() || null, country: country.trim() || null },
      });
      router.back();
    } catch { setError(t('clinicProfile.saveFailed')); }
  };

  const chooseLogo = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(t('clinicProfile.logoPermissionRequired')); return; }
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (selection.canceled || !selection.assets[0]?.base64) return;
    const asset = selection.assets[0];
    try {
      const response = await uploadLogo.mutateAsync(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
      setLogo(response.clinic_logo ?? null);
    } catch { setError(t('clinicProfile.logoUploadFailed')); }
  };

  if (profile.isLoading) return <SafeAreaView style={styles.screen}><DashboardHeader title={t('clinicProfile.title')} onBackPress={() => router.back()} /><View style={styles.center}><ActivityIndicator color={theme.colors.primary.default} /></View></SafeAreaView>;
  if (profile.isError || !tenantId) return <SafeAreaView style={styles.screen}><DashboardHeader title={t('clinicProfile.title')} onBackPress={() => router.back()} /><View style={styles.center}><Text style={styles.text}>{t('clinicProfile.loadFailed')}</Text><TouchableOpacity style={styles.primaryButton} onPress={() => void profile.refetch()}><Text style={styles.primaryButtonText}>{t('common.retry')}</Text></TouchableOpacity></View></SafeAreaView>;

  const input = (label: string, value: string, onChangeText: (value: string) => void, required = false, options: Record<string, unknown> = {}) => <View style={styles.field}><Text style={styles.label}>{label}{required ? ` ${t('clinicProfile.requiredMarker')}` : ` ${t('clinicProfile.optionalMarker')}`}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={theme.colors.text.disabled} accessibilityLabel={label} {...options} /></View>;
  const currentContent = section === 'basic' ? <View>{input(t('clinicProfile.fields.name'), name, setName, true)}<View style={styles.field}><Text style={styles.label}>{t('clinicProfile.fields.type')}</Text><Text style={styles.readOnly}>{profile.data?.clinic_type ?? ''}</Text><Text style={styles.help}>{t('clinicProfile.typeHelp')}</Text></View></View>
    : section === 'contact' ? <View>{input(t('clinicProfile.fields.email'), email, setEmail, true, { keyboardType: 'email-address', autoCapitalize: 'none' })}{input(t('clinicProfile.fields.phone'), phone, setPhone, true, { keyboardType: 'phone-pad' })}{input(t('clinicProfile.fields.website'), website, setWebsite, false, { keyboardType: 'url', autoCapitalize: 'none' })}{input(t('clinicProfile.fields.street'), street, setStreet)}{input(t('clinicProfile.fields.city'), city, setCity, true)}{input(t('clinicProfile.fields.state'), state, setState, true)}{input(t('clinicProfile.fields.pincode'), pincode, setPincode)}{input(t('clinicProfile.fields.country'), country, setCountry, true)}</View>
    : section === 'business' ? <View>{input(t('clinicProfile.fields.registration'), registration, setRegistration)}{input(t('clinicProfile.fields.pan'), pan, setPan, false, { autoCapitalize: 'characters' })}{input(t('clinicProfile.fields.gst'), gst, setGst, false, { autoCapitalize: 'characters' })}</View>
    : <View style={styles.branding}>{logo ? <Image source={{ uri: logo }} style={styles.logo} accessibilityLabel={t('clinicProfile.fields.logo')} /> : <Text style={styles.text}>{t('clinicProfile.noLogo')}</Text>}<TouchableOpacity style={styles.secondaryButton} disabled={uploadLogo.isPending} onPress={() => void chooseLogo()}><Text style={styles.secondaryButtonText}>{t('clinicProfile.chooseLogo')}</Text></TouchableOpacity><Text style={styles.help}>{t('clinicProfile.logoHelp')}</Text></View>;

  return <SafeAreaView style={styles.screen}><DashboardHeader title={t('clinicProfile.title')} onBackPress={() => router.back()} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.subtitle}>{t('clinicProfile.subtitle')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{sections.map(item => <TouchableOpacity key={item} style={[styles.tab, section === item && styles.activeTab]} onPress={() => setSection(item)} accessibilityRole="tab"><Text style={[styles.tabText, section === item && styles.activeTabText]}>{t(`clinicProfile.sections.${item}`)}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.sectionTitle}>{t(`clinicProfile.sections.${section}`)}</Text>{currentContent}{error ? <Text style={styles.error}>{error}</Text> : null}<TouchableOpacity style={styles.primaryButton} disabled={update.isPending} onPress={() => void save()} accessibilityRole="button"><Text style={styles.primaryButtonText}>{update.isPending ? t('clinicProfile.saving') : t('common.save')}</Text></TouchableOpacity></ScrollView></SafeAreaView>;
};

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default }, content: { padding: theme.spacing.lg, gap: theme.spacing.md }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }, subtitle: { ...theme.typography.body2, color: theme.colors.text.secondary }, tabs: { gap: theme.spacing.sm }, tab: { borderWidth: 1, borderColor: theme.colors.border.default, borderRadius: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }, activeTab: { borderColor: theme.colors.primary.default, backgroundColor: theme.colors.primary.light }, tabText: { ...theme.typography.body2, color: theme.colors.text.primary }, activeTabText: { color: theme.colors.primary.default }, sectionTitle: { ...theme.typography.h5, color: theme.colors.text.primary }, field: { gap: theme.spacing.xs, marginBottom: theme.spacing.md }, label: { ...theme.typography.body2, color: theme.colors.text.primary }, input: { borderWidth: 1, borderColor: theme.colors.border.default, borderRadius: theme.spacing.sm, padding: theme.spacing.sm, color: theme.colors.text.primary, backgroundColor: theme.colors.surface.default }, readOnly: { ...theme.typography.body1, color: theme.colors.text.secondary, padding: theme.spacing.sm, backgroundColor: theme.colors.surface.elevated, borderRadius: theme.spacing.sm }, primaryButton: { alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.spacing.sm, backgroundColor: theme.colors.primary.default }, primaryButtonText: { ...theme.typography.button, color: theme.colors.text.onPrimary }, secondaryButton: { alignItems: 'center', padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.default, borderRadius: theme.spacing.sm }, secondaryButtonText: { ...theme.typography.button, color: theme.colors.text.primary }, error: { ...theme.typography.body2, color: theme.colors.feedback.error }, text: { ...theme.typography.body1, color: theme.colors.text.primary }, help: { ...theme.typography.caption, color: theme.colors.text.secondary }, branding: { gap: theme.spacing.md }, logo: { width: theme.spacing.xxl * 4, height: theme.spacing.xxl * 4, borderRadius: theme.spacing.xxl * 2, alignSelf: 'center', backgroundColor: theme.colors.surface.elevated },
});
