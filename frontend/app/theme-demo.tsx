/**
 * Theme Demo Page
 * Demonstrates the clinic theming system and BgGradient component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeProvider, useClinicTheme } from '../core/theme/useClinicTheme';
import { BgGradient, BgSolid } from '../core/components/ui/BgGradient';
import { spacing } from '../core/theme/spacing';

/**
 * Inner component that uses the theme
 */
const ThemeDemoContent = () => {
  const theme = useClinicTheme();
  const router = useRouter();
  const [useGradient, setUseGradient] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Background Gradient */}
      {useGradient ? <BgGradient /> : <BgSolid />}

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Theme System Demo
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Theme Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Active Theme
          </Text>
          <View style={[styles.themeCard, { backgroundColor: theme.colors.primary.soft }]}>
            <Ionicons name="color-palette" size={32} color={theme.colors.primary.default} />
            <Text style={[styles.themeLabel, { color: theme.colors.primary.default }]}>
              {theme.clinicType.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Background Toggle */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Background Style
          </Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: useGradient
                  ? theme.colors.primary.default
                  : theme.colors.surface.muted,
              },
            ]}
            onPress={() => setUseGradient(!useGradient)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: useGradient ? theme.colors.primary.onPrimary : theme.colors.text.secondary },
              ]}
            >
              {useGradient ? 'Gradient Enabled' : 'Solid Background'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Color Palette Preview */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Color Palette
          </Text>

          {/* Primary Colors */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.text.secondary }]}>
            Primary
          </Text>
          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary.default }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary.light }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary.dark }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary.soft }]} />
          </View>

          {/* Secondary Colors */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.text.secondary, marginTop: spacing.md }]}>
            Secondary
          </Text>
          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary.default }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary.light }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary.dark }]} />
          </View>

          {/* Feedback Colors */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.text.secondary, marginTop: spacing.md }]}>
            Feedback
          </Text>
          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.feedback.success }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.feedback.warning }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.feedback.error }]} />
            <View style={[styles.colorSwatch, { backgroundColor: theme.colors.feedback.info }]} />
          </View>
        </View>

        {/* Component Examples */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Component Examples
          </Text>

          {/* Primary Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary.default },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary.onPrimary }]}>
              Primary Button
            </Text>
          </TouchableOpacity>

          {/* Secondary Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.colors.secondary.default, marginTop: spacing.sm },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.secondary.onSecondary }]}>
              Secondary Button
            </Text>
          </TouchableOpacity>

          {/* Outlined Button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.outlinedButton,
              {
                borderColor: theme.colors.border.strong,
                backgroundColor: 'transparent',
                marginTop: spacing.sm,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary.default }]}>
              Outlined Button
            </Text>
          </TouchableOpacity>

          {/* Info Card */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.feedback.infoLight, borderLeftColor: theme.colors.feedback.info },
            ]}
          >
            <Ionicons name="information-circle" size={20} color={theme.colors.feedback.info} />
            <Text style={[styles.infoText, { color: theme.colors.text.primary }]}>
              This is an informational message
            </Text>
          </View>

          {/* Success Card */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.feedback.successLight, borderLeftColor: theme.colors.feedback.success },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.feedback.success} />
            <Text style={[styles.infoText, { color: theme.colors.text.primary }]}>
              Operation completed successfully
            </Text>
          </View>

          {/* Warning Card */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.feedback.warningLight, borderLeftColor: theme.colors.feedback.warning },
            ]}
          >
            <Ionicons name="warning" size={20} color={theme.colors.feedback.warning} />
            <Text style={[styles.infoText, { color: theme.colors.text.primary }]}>
              Please review this warning
            </Text>
          </View>
        </View>

        {/* Typography Examples */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface.default }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Typography
          </Text>
          <Text style={[theme.typography.h3, { color: theme.colors.text.primary }]}>
            Heading 3
          </Text>
          <Text style={[theme.typography.h5, { color: theme.colors.text.primary, marginTop: spacing.sm }]}>
            Heading 5
          </Text>
          <Text style={[theme.typography.body1, { color: theme.colors.text.secondary, marginTop: spacing.sm }]}>
            Body 1: This is regular body text for paragraphs and content.
          </Text>
          <Text style={[theme.typography.body2, { color: theme.colors.text.tertiary, marginTop: spacing.sm }]}>
            Body 2: Smaller body text for secondary information.
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.text.tertiary, marginTop: spacing.sm }]}>
            Caption: Very small text for labels and captions.
          </Text>
        </View>

        {/* Accessibility Note */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.colors.surface.default, marginBottom: spacing.xl },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Accessibility
          </Text>
          <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
            All colors meet WCAG 2.1 AA contrast requirements for text and interactive elements.
            Touch targets are minimum 44pt for iOS and 48pt for Android.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Main component with Theme Provider
 */
export default function ThemeDemo() {
  return (
    <ThemeProvider clinicType="AYURVEDA">
      <ThemeDemoContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  toggleButton: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlinedButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
});
