/**
 * Add New Clinic Screen
 * UI-only form for adding a new clinic
 * Shows "coming soon" message as no backend endpoint exists yet
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';

interface ClinicFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
}

export default function AddClinicScreen() {
  const router = useRouter();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [formData, setFormData] = useState<ClinicFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
  });

  const handleInputChange = (field: keyof ClinicFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return (
      formData.name.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.phone.trim() !== ''
    );
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      setShowComingSoon(true);
    }
  };

  if (showComingSoon) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.comingSoonContainer}>
          <View style={styles.comingSoonIcon}>
            <Ionicons name="construct" size={64} color={colors.primary.main} />
          </View>
          <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
          <Text style={styles.comingSoonMessage}>
            The ability to add new clinics is under development.{'\n'}
            We&apos;ll notify you when this feature becomes available.
          </Text>
          <View style={styles.formPreview}>
            <Text style={styles.formPreviewTitle}>Your submission preview:</Text>
            <View style={styles.formPreviewItem}>
              <Text style={styles.formPreviewLabel}>Clinic Name</Text>
              <Text style={styles.formPreviewValue}>{formData.name}</Text>
            </View>
            <View style={styles.formPreviewItem}>
              <Text style={styles.formPreviewLabel}>City</Text>
              <Text style={styles.formPreviewValue}>{formData.city}</Text>
            </View>
            <View style={styles.formPreviewItem}>
              <Text style={styles.formPreviewLabel}>Phone</Text>
              <Text style={styles.formPreviewValue}>{formData.phone}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            testID="coming-soon-back-button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.common.white} />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
          testID="add-clinic-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Clinic</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.info.main} />
            <Text style={styles.infoBannerText}>
              Fill in your clinic details below. All fields marked with * are required.
            </Text>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Clinic Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter clinic name"
                placeholderTextColor={colors.text.tertiary}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                testID="input-clinic-name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="clinic@example.com"
                placeholderTextColor={colors.text.tertiary}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-clinic-email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Phone <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor={colors.text.tertiary}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                testID="input-clinic-phone"
              />
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter full address"
                placeholderTextColor={colors.text.tertiary}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-clinic-address"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>
                  City <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.city}
                  onChangeText={(value) => handleInputChange('city', value)}
                  testID="input-clinic-city"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.state}
                  onChangeText={(value) => handleInputChange('state', value)}
                  testID="input-clinic-state"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PIN Code</Text>
              <TextInput
                style={[styles.input, styles.pincodeInput]}
                placeholder="XXXXXX"
                placeholderTextColor={colors.text.tertiary}
                value={formData.pincode}
                onChangeText={(value) => handleInputChange('pincode', value)}
                keyboardType="number-pad"
                maxLength={6}
                testID="input-clinic-pincode"
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid()}
              testID="submit-clinic-button"
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={isFormValid() ? colors.common.white : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.submitButtonText,
                  !isFormValid() && styles.submitButtonTextDisabled,
                ]}
              >
                Add Clinic
              </Text>
            </TouchableOpacity>
            <Text style={styles.submitHint}>
              By submitting, you agree to our terms of service.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.info.main + '15',
    borderRadius: 12,
  },
  infoBannerText: {
    ...typography.body2,
    color: colors.info.main,
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error.main,
  },
  input: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body1,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  pincodeInput: {
    width: 120,
  },
  submitSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: colors.grey[200],
  },
  submitButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
  submitButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  submitHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Coming Soon Screen
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  comingSoonIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  comingSoonTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  comingSoonMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formPreview: {
    width: '100%',
    marginTop: spacing.xl,
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  formPreviewTitle: {
    ...typography.subtitle2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  formPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  formPreviewLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  formPreviewValue: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 10,
  },
  backButtonText: {
    ...typography.button,
    color: colors.common.white,
  },
});
