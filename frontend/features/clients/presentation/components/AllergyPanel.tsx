/**
 * A patient's allergies on the patient screen: the status, the active allergies with a way to resolve each, the resolved ones, a way to add one,
 * and (when nobody has recorded anything) a way to confirm that the patient has none. Recording needs the allergy permission; reading does not.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { t } from '../../../../core/localization';
import {
  useAddAllergyMutation, useChangeAllergyMutation, useClientAllergiesQuery, useConfirmNoKnownAllergiesMutation,
} from '../../data/repositories/clientAllergies.repository.impl';
import { SEVERITIES, activeAllergies, type Allergy, type AllergySeverity } from '../../domain/clientAllergies';
import { AllergyStatusBanner } from './AllergyStatusBanner';

const errorText = (error: unknown): string => {
  const code = (error as { code?: string } | undefined)?.code ?? 'ALLERGY_FAILED';
  const key = `clientAllergies.errors.${code}`;
  return t(key) === key ? t('clientAllergies.errors.ALLERGY_FAILED') : t(key);
};

export const AllergyPanel: React.FC<{ tenantId: string; clientId: string; canManage: boolean }> = ({ tenantId, clientId, canManage }) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const query = useClientAllergiesQuery(tenantId, clientId);
  const add = useAddAllergyMutation(tenantId, clientId);
  const change = useChangeAllergyMutation(tenantId, clientId);
  const confirmNone = useConfirmNoKnownAllergiesMutation(tenantId, clientId);

  const [substance, setSubstance] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState<AllergySeverity>('moderate');
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(errorText(failure));
    }
  }, []);

  const submit = useCallback(() => run(async () => {
    await add.mutateAsync({ substance, reaction: reaction.trim() || null, severity });
    setSubstance('');
    setReaction('');
    setSeverity('moderate');
  }), [add, reaction, run, severity, substance]);

  if (query.isLoading) return <ActivityIndicator testID="allergies-loading" />;
  if (query.isError || !query.data) {
    return (
      <View style={styles.box} testID="allergies-error">
        <Text style={styles.error}>{t('clientAllergies.loadFailed')}</Text>
        <TouchableOpacity style={styles.secondary} onPress={() => query.refetch()} accessibilityRole="button" testID="allergies-retry">
          <Text style={styles.secondaryText}>{t('clientAllergies.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const data = query.data;
  const active = activeAllergies(data.items);
  const resolved = data.items.filter((item) => item.status === 'resolved');
  const row = (item: Allergy) => (
    <View key={item.id} style={styles.row} testID={`allergy-${item.id}`}>
      <View style={styles.rowText}>
        <Text style={styles.substance}>{item.substance}</Text>
        <Text style={styles.detail}>{[t(`clientAllergies.severities.${item.severity}`), item.reaction].filter(Boolean).join(' · ')}</Text>
      </View>
      {canManage ? (
        <TouchableOpacity
          style={styles.link}
          onPress={() => run(() => change.mutateAsync({ id: item.id, changes: { status: item.status === 'active' ? 'resolved' : 'active' } }))}
          accessibilityRole="button"
          testID={`allergy-toggle-${item.id}`}
        >
          <Text style={styles.linkText}>{t(item.status === 'active' ? 'clientAllergies.resolve' : 'clientAllergies.reactivate')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={styles.box} testID="allergy-panel">
      <Text style={styles.title}>{t('clientAllergies.title')}</Text>
      <AllergyStatusBanner allergies={data} />
      {active.map(row)}
      {resolved.length > 0 ? <Text style={styles.heading}>{t('clientAllergies.resolvedHeading')}</Text> : null}
      {resolved.map(row)}
      {canManage && data.status === 'unknown' ? (
        <TouchableOpacity style={styles.secondary} onPress={() => run(() => confirmNone.mutateAsync())} accessibilityRole="button" testID="allergy-confirm-none">
          <Text style={styles.secondaryText}>{t('clientAllergies.confirmNone')}</Text>
        </TouchableOpacity>
      ) : null}
      {canManage ? (
        <View style={styles.form}>
          <Text style={styles.heading}>{t('clientAllergies.add')}</Text>
          <TextInput
            style={styles.input} value={substance} onChangeText={setSubstance} placeholder={t('clientAllergies.substance')}
            placeholderTextColor={theme.colors.text.tertiary} accessibilityLabel={t('clientAllergies.substance')} testID="allergy-substance-input"
          />
          <TextInput
            style={styles.input} value={reaction} onChangeText={setReaction} placeholder={t('clientAllergies.reaction')}
            placeholderTextColor={theme.colors.text.tertiary} accessibilityLabel={t('clientAllergies.reaction')} testID="allergy-reaction-input"
          />
          <View style={styles.chips} accessibilityLabel={t('clientAllergies.severity')}>
            {SEVERITIES.map((level) => (
              <TouchableOpacity
                key={level} style={[styles.chip, severity === level && styles.chipOn]} onPress={() => setSeverity(level)}
                accessibilityRole="button" accessibilityState={{ selected: severity === level }} testID={`allergy-severity-${level}`}
              >
                <Text style={[styles.chipText, severity === level && styles.chipTextOn]}>{t(`clientAllergies.severities.${level}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primary, (!substance.trim() || add.isPending) && styles.disabled]} disabled={!substance.trim() || add.isPending}
            onPress={submit} accessibilityRole="button" testID="allergy-save"
          >
            <Text style={styles.primaryText}>{t('clientAllergies.save')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? <Text style={styles.error} testID="allergy-error">{error}</Text> : null}
      <Text style={styles.note}>{t('clientAllergies.matchNote')}</Text>
    </View>
  );
};

const makeStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    box: { gap: theme.spacing.sm },
    title: { ...theme.typography.h6, color: theme.colors.text.primary },
    heading: { ...theme.typography.subtitle2, color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, minHeight: theme.sizes.touchTarget },
    rowText: { flex: 1 },
    substance: { ...theme.typography.subtitle1, color: theme.colors.text.primary },
    detail: { ...theme.typography.caption, color: theme.colors.text.secondary },
    link: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.sm },
    linkText: { ...theme.typography.button, color: theme.colors.primary.default },
    form: { gap: theme.spacing.sm },
    input: { ...theme.typography.body1, minHeight: theme.sizes.touchTarget, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default, color: theme.colors.text.primary, backgroundColor: theme.colors.background.default },
    chips: { flexDirection: 'row', gap: theme.spacing.sm },
    chip: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.border.default },
    chipOn: { backgroundColor: theme.colors.primary.default, borderColor: theme.colors.primary.default },
    chipText: { ...theme.typography.body2, color: theme.colors.text.primary },
    chipTextOn: { color: theme.colors.primary.onPrimary },
    primary: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.medium, backgroundColor: theme.colors.primary.default },
    primaryText: { ...theme.typography.button, color: theme.colors.primary.onPrimary },
    secondary: { minHeight: theme.sizes.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.medium, borderWidth: theme.borderWidths.default, borderColor: theme.colors.primary.default },
    secondaryText: { ...theme.typography.button, color: theme.colors.primary.default },
    disabled: { opacity: 0.5 },
    error: { ...theme.typography.body2, color: theme.colors.feedback.error },
    note: { ...theme.typography.caption, color: theme.colors.text.secondary },
  });
