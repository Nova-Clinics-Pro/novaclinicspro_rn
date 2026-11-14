/**
 * Tenant Locale Settings Screen
 * Allows Clinic Admins to configure tenant-level locale defaults
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import {
  useSupportedLocalesQuery,
  useTenantDefaultLocaleQuery,
  useUpdateTenantDefaultLocaleMutation,
} from '../../data/repositories/localization.repository.impl';
import { LocaleSelect } from '../components/LocaleSelect';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';

export function TenantLocaleSettingsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId || '';

  const { data: localesData, isLoading: localesLoading } = useSupportedLocalesQuery();
  const { data: tenantLocale, isLoading: tenantLocaleLoading } = useTenantDefaultLocaleQuery(tenantId);
  const updateMutation = useUpdateTenantDefaultLocaleMutation(tenantId);

  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

  const currentLocale = selectedLocale || tenantLocale?.defaultLocaleCode || 'en-US';
  const isLoading = localesLoading || tenantLocaleLoading;
  const isApiNotAvailable = !isLoading && localesData && !localesData.isApiAvailable;

  const handleBack = () => {
    router.back();
  };

  const handleLocaleSelect = (localeCode: string) => {
    setSelectedLocale(localeCode);
  };

  const handleSave = async () => {
    if (selectedLocale && !isApiNotAvailable) {
      try {
        await updateMutation.mutateAsync({ defaultLocaleCode: selectedLocale });
        router.back();
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Clinic Language Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}

        {isApiNotAvailable && (
          <View style={styles.comingSoonBanner}>
            <Ionicons name="construct" size={32} color={colors.warning.main} />
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              Tenant-level localization settings are not yet configurable in your environment.
              Once enabled, you&apos;ll be able to set the default language for your clinic.
            </Text>
          </View>
        )}

        {!isLoading && localesData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Default Clinic Language</Text>
            <Text style={styles.sectionDescription}>
              Set the default language for all users in your clinic. Individual users can
              override this in their personal settings.
              {isApiNotAvailable && ' (Preview only - changes will not be saved)'}
            </Text>

            <LocaleSelect
              locales={localesData.locales}
              selectedLocale={currentLocale}
              onSelect={handleLocaleSelect}
              disabled={isApiNotAvailable}
            />

            {!!(!isApiNotAvailable && selectedLocale && selectedLocale !== tenantLocale?.defaultLocaleCode) && (
              <Pressable
                style={[
                  styles.saveButton,
                  updateMutation.isPending && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text.light} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.infoText}>
              The clinic default language applies to new users and those who haven&apos;t
              set a personal preference. Clinical terminology will use standardized
              translations when available.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  comingSoonBanner: {
    backgroundColor: colors.warning.main + '15',
    borderWidth: 1,
    borderColor: colors.warning.main + '30',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  comingSoonTitle: {
    ...typography.h6,
    color: colors.warning.dark,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  comingSoonText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.text.light,
  },
  infoSection: {
    backgroundColor: colors.grey[100],
    borderRadius: 12,
    padding: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
});
