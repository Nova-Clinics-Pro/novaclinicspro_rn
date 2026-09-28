/**
 * Treatment Form Component
 * Reusable form for creating and editing treatments
 * 
 * Features:
 * - All treatment fields (code, name, description, duration, price, dosha, contraindications)
 * - hasFormChanges() check - edit won't call API if no changes (Issue #7)
 * - Used for both create and edit flows
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { useTreatmentCategoriesQuery } from '../../../configuredClinicalServices/data/repositories/configuredClinicalServices.repository.impl';
import {
  TreatmentResponse,
  TreatmentCreate,
  TreatmentUpdate,
  DoshaBenefits,
  DOSHA_COLORS,
} from '../../data/models/treatments.dtos';

// ============================================
// TYPES
// ============================================

interface DoshaState {
  balances: boolean;
  notes: string;
}

interface FormData {
  code: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  contraindications: string;
  categoryCode: string | null;
}

interface DoshaFormState {
  vata: DoshaState;
  pitta: DoshaState;
  kapha: DoshaState;
}

interface TreatmentFormProps {
  initialData?: TreatmentResponse | null;
  onSubmit: (data: TreatmentCreate | TreatmentUpdate, hasChanges: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract form data from treatment response
 */
const getInitialFormData = (data?: TreatmentResponse | null): FormData => {
  if (!data) {
    return {
      code: '',
      name: '',
      description: '',
      duration: '',
      price: '',
      contraindications: '',
      categoryCode: null,
    };
  }

  return {
    code: data.code || '',
    name: data.name || '',
    description: data.description || '',
    duration: data.duration_minutes?.toString() || '',
    price: data.price || data.base_price || '',
    contraindications: data.contraindications || '',
    categoryCode: data.category_code ?? null,
  };
};

/**
 * Extract dosha state from treatment response
 */
const getInitialDoshaState = (benefits?: DoshaBenefits | null): DoshaFormState => {
  return {
    vata: {
      balances: benefits?.vata?.balances || false,
      notes: benefits?.vata?.notes || '',
    },
    pitta: {
      balances: benefits?.pitta?.balances || false,
      notes: benefits?.pitta?.notes || '',
    },
    kapha: {
      balances: benefits?.kapha?.balances || false,
      notes: benefits?.kapha?.notes || '',
    },
  };
};

/**
 * Compare current form data with initial data to detect changes
 */
const hasFormChanges = (
  formData: FormData,
  doshaState: DoshaFormState,
  initialData?: TreatmentResponse | null
): boolean => {
  if (!initialData) return true; // Always has changes for new entries

  const initial = getInitialFormData(initialData);
  const initialDosha = getInitialDoshaState(initialData.dosha_benefits);

  // Check basic fields
  if (formData.code.trim().toUpperCase() !== initial.code) return true;
  if (formData.name.trim() !== initial.name) return true;
  if (formData.description.trim() !== (initial.description || '')) return true;
  if (formData.duration !== initial.duration) return true;
  if (formData.price !== initial.price) return true;
  if (formData.contraindications.trim() !== (initial.contraindications || '')) return true;
  if (formData.categoryCode !== initial.categoryCode) return true;

  // Check dosha benefits
  const doshas: Array<keyof DoshaFormState> = ['vata', 'pitta', 'kapha'];
  for (const dosha of doshas) {
    if (doshaState[dosha].balances !== initialDosha[dosha].balances) return true;
    if (doshaState[dosha].notes.trim() !== (initialDosha[dosha].notes || '')) return true;
  }

  return false;
};

// ============================================
// COMPONENT
// ============================================

export const TreatmentForm: React.FC<TreatmentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}) => {
  const isEditing = mode === 'edit';
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const categoriesQuery = useTreatmentCategoriesQuery();

  // Form state
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(initialData));
  const [doshaBenefits, setDoshaBenefits] = useState<DoshaFormState>(() => 
    getInitialDoshaState(initialData?.dosha_benefits)
  );
  const [categoryValidationVisible, setCategoryValidationVisible] = useState(false);
  const [pricingValidationVisible, setPricingValidationVisible] = useState(false);

  // Creation defaults are supplied by the canonical category catalogue. An
  // edit always preserves its saved category, including a historical null.
  useEffect(() => {
    if (isEditing || formData.categoryCode !== null) return;
    const defaultCategory = categoriesQuery.data?.find(category => category.is_active && category.is_default);
    if (defaultCategory) {
      setFormData(current => current.categoryCode === null
        ? { ...current, categoryCode: defaultCategory.code }
        : current);
    }
  }, [categoriesQuery.data, formData.categoryCode, isEditing]);

  // Validation
  const isValid = useMemo(() => {
    return (
      formData.code.trim().length > 0 &&
      formData.name.trim().length > 0 &&
      formData.categoryCode !== null &&
      Number.isInteger(Number(formData.duration)) &&
      Number(formData.duration) > 0 &&
      formData.price.trim().length > 0 &&
      Number.isFinite(Number(formData.price)) &&
      Number(formData.price) >= 0
    );
  }, [formData.categoryCode, formData.code, formData.duration, formData.name, formData.price]);

  // Check for changes
  const formHasChanges = useMemo(() => {
    return hasFormChanges(formData, doshaBenefits, initialData);
  }, [formData, doshaBenefits, initialData]);

  const handleSubmit = useCallback(() => {
    if (formData.categoryCode === null) {
      setCategoryValidationVisible(true);
      return;
    }
    if (
      !Number.isInteger(Number(formData.duration)) ||
      Number(formData.duration) <= 0 ||
      formData.price.trim().length === 0 ||
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) < 0
    ) {
      setPricingValidationVisible(true);
      return;
    }
    if (!isValid) return;

    // Build dosha benefits object
    const doshaData: DoshaBenefits = {};
    if (doshaBenefits.vata.balances || doshaBenefits.vata.notes.trim()) {
      doshaData.vata = {
        balances: doshaBenefits.vata.balances,
        notes: doshaBenefits.vata.notes.trim() || undefined,
      };
    }
    if (doshaBenefits.pitta.balances || doshaBenefits.pitta.notes.trim()) {
      doshaData.pitta = {
        balances: doshaBenefits.pitta.balances,
        notes: doshaBenefits.pitta.notes.trim() || undefined,
      };
    }
    if (doshaBenefits.kapha.balances || doshaBenefits.kapha.notes.trim()) {
      doshaData.kapha = {
        balances: doshaBenefits.kapha.balances,
        notes: doshaBenefits.kapha.notes.trim() || undefined,
      };
    }

    const payload: TreatmentCreate | TreatmentUpdate = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      duration_minutes: formData.duration ? parseInt(formData.duration, 10) : null,
      base_price: formData.price ? parseFloat(formData.price) : null,
      dosha_benefits: Object.keys(doshaData).length > 0 ? doshaData : null,
      contraindications: formData.contraindications.trim() || null,
      category_code: formData.categoryCode,
    };

    onSubmit(payload, formHasChanges);
  }, [formData, doshaBenefits, isValid, formHasChanges, onSubmit]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('treatments.form.sections.basic')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('treatments.form.code.label')}</Text>
            <TextInput
              style={[styles.input, isEditing && styles.inputDisabled]}
              placeholder={t('treatments.form.code.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              value={formData.code}
              onChangeText={(text) => setFormData(prev => ({ ...prev, code: text }))}
              autoCapitalize="characters"
              editable={!isEditing} // Code is typically not editable
            />
            <Text style={styles.hint}>
              {isEditing ? t('treatments.form.code.editHelp') : t('treatments.form.code.createHelp')}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('treatments.form.category.requiredLabel')}</Text>
            <Text style={styles.hint}>{t('treatments.form.category.help')}</Text>
            {categoriesQuery.isError ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
                onPress={() => void categoriesQuery.refetch()}
                style={styles.categoryRetry}
              >
                <Text style={styles.categoryRetryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.categoryOptions} accessibilityRole="radiogroup">
                {(categoriesQuery.data ?? []).filter(category => category.is_active).map(category => (
                  <TouchableOpacity
                    key={category.code}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: formData.categoryCode === category.code }}
                    style={[styles.categoryOption, formData.categoryCode === category.code && styles.categoryOptionSelected]}
                    onPress={() => {
                      setCategoryValidationVisible(false);
                      setFormData(previous => ({ ...previous, categoryCode: category.code }));
                    }}
                  >
                    <Text style={styles.categoryOptionText}>{t(category.display_key)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {categoryValidationVisible && formData.categoryCode === null ? (
              <Text style={styles.validationMessage} accessibilityRole="alert">
                {t('treatments.form.category.requiredMessage')}
              </Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('treatments.form.name.label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('treatments.form.name.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('treatments.form.description.label')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('treatments.form.description.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Duration & Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('treatments.form.sections.durationAndPricing')}</Text>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('treatments.form.duration.label')}</Text>
              <TextInput
                style={styles.input}
              placeholder={t('treatments.form.duration.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
                value={formData.duration}
                onChangeText={(text) => setFormData(prev => ({ ...prev, duration: text }))}
                keyboardType="number-pad"
              />
              {pricingValidationVisible &&
              (!Number.isInteger(Number(formData.duration)) || Number(formData.duration) <= 0) ? (
                <Text style={styles.validationMessage} accessibilityRole="alert">
                  {t('treatments.form.duration.requiredMessage')}
                </Text>
              ) : null}
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('treatments.form.price.label')}</Text>
              <TextInput
                style={styles.input}
              placeholder={t('treatments.form.price.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                keyboardType="decimal-pad"
              />
              {pricingValidationVisible &&
              (formData.price.trim().length === 0 ||
                !Number.isFinite(Number(formData.price)) ||
                Number(formData.price) < 0) ? (
                <Text style={styles.validationMessage} accessibilityRole="alert">
                  {t('treatments.form.price.requiredMessage')}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Ayurveda Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('treatments.form.sections.ayurvedicProperties')}</Text>
          <Text style={styles.sectionHint}>{t('treatments.form.dosha.help')}</Text>

          {/* Vata */}
          <View style={styles.doshaCard}>
            <View style={styles.doshaHeader}>
              <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.vata }]} />
              <Text style={styles.doshaName}>{t('treatments.form.dosha.vata.label')}</Text>
              <Text style={styles.doshaDesc}>{t('treatments.form.dosha.vata.description')}</Text>
              <Switch
                value={doshaBenefits.vata.balances}
                onValueChange={(value) => setDoshaBenefits(prev => ({
                  ...prev,
                  vata: { ...prev.vata, balances: value },
                }))}
                trackColor={{ false: theme.colors.border.default, true: DOSHA_COLORS.vata }}
                thumbColor={doshaBenefits.vata.balances ? DOSHA_COLORS.vata : theme.colors.surface.default}
              />
            </View>
            {doshaBenefits.vata.balances && (
              <TextInput
                style={styles.doshaInput}
                placeholder={t('treatments.form.dosha.vata.placeholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                value={doshaBenefits.vata.notes}
                onChangeText={(text) => setDoshaBenefits(prev => ({
                  ...prev,
                  vata: { ...prev.vata, notes: text },
                }))}
              />
            )}
          </View>

          {/* Pitta */}
          <View style={styles.doshaCard}>
            <View style={styles.doshaHeader}>
              <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.pitta }]} />
              <Text style={styles.doshaName}>{t('treatments.form.dosha.pitta.label')}</Text>
              <Text style={styles.doshaDesc}>{t('treatments.form.dosha.pitta.description')}</Text>
              <Switch
                value={doshaBenefits.pitta.balances}
                onValueChange={(value) => setDoshaBenefits(prev => ({
                  ...prev,
                  pitta: { ...prev.pitta, balances: value },
                }))}
                trackColor={{ false: theme.colors.border.default, true: DOSHA_COLORS.pitta }}
                thumbColor={doshaBenefits.pitta.balances ? DOSHA_COLORS.pitta : theme.colors.surface.default}
              />
            </View>
            {doshaBenefits.pitta.balances && (
              <TextInput
                style={styles.doshaInput}
                placeholder={t('treatments.form.dosha.pitta.placeholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                value={doshaBenefits.pitta.notes}
                onChangeText={(text) => setDoshaBenefits(prev => ({
                  ...prev,
                  pitta: { ...prev.pitta, notes: text },
                }))}
              />
            )}
          </View>

          {/* Kapha */}
          <View style={styles.doshaCard}>
            <View style={styles.doshaHeader}>
              <View style={[styles.doshaIndicator, { backgroundColor: DOSHA_COLORS.kapha }]} />
              <Text style={styles.doshaName}>{t('treatments.form.dosha.kapha.label')}</Text>
              <Text style={styles.doshaDesc}>{t('treatments.form.dosha.kapha.description')}</Text>
              <Switch
                value={doshaBenefits.kapha.balances}
                onValueChange={(value) => setDoshaBenefits(prev => ({
                  ...prev,
                  kapha: { ...prev.kapha, balances: value },
                }))}
                trackColor={{ false: theme.colors.border.default, true: DOSHA_COLORS.kapha }}
                thumbColor={doshaBenefits.kapha.balances ? DOSHA_COLORS.kapha : theme.colors.surface.default}
              />
            </View>
            {doshaBenefits.kapha.balances && (
              <TextInput
                style={styles.doshaInput}
                placeholder={t('treatments.form.dosha.kapha.placeholder')}
                placeholderTextColor={theme.colors.text.tertiary}
                value={doshaBenefits.kapha.notes}
                onChangeText={(text) => setDoshaBenefits(prev => ({
                  ...prev,
                  kapha: { ...prev.kapha, notes: text },
                }))}
              />
            )}
          </View>
        </View>

        {/* Contraindications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('treatments.form.sections.safety')}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('treatments.form.contraindications.label')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('treatments.form.contraindications.placeholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              value={formData.contraindications}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contraindications: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Change indicator for edit mode */}
        {isEditing && (
          <View style={styles.changeIndicator}>
            <Ionicons 
              name={formHasChanges ? 'ellipse' : 'checkmark-circle'} 
              size={16} 
              color={formHasChanges ? theme.colors.feedback.warning : theme.colors.feedback.success}
            />
            <Text style={[
              styles.changeText,
              { color: formHasChanges ? theme.colors.feedback.warning : theme.colors.feedback.success }
            ]}>
              {formHasChanges ? t('treatments.form.changes.unsaved') : t('treatments.form.changes.none')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isValid || isLoading) && styles.disabledButton,
            isEditing && !formHasChanges && styles.noChangesButton,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.text.onPrimary} />
          ) : (
            <>
              <Ionicons 
                name={isEditing ? 'checkmark-circle' : 'add-circle'} 
                size={20} 
                color={theme.colors.text.onPrimary}
              />
              <Text style={styles.submitButtonText}>
                {isEditing 
                  ? (formHasChanges ? t('common.save') : t('treatments.form.changes.none'))
                  : t('treatments.form.actions.create')
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// ============================================
// STYLES
// ============================================

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  sectionTitle: {
    ...theme.typography.h6,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  sectionHint: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface.default,
  },
  categoryOptionSelected: {
    borderColor: theme.colors.primary.default,
    backgroundColor: theme.colors.surface.muted,
  },
  categoryOptionText: {
    ...theme.typography.body2,
    color: theme.colors.text.primary,
  },
  categoryRetry: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  categoryRetryText: {
    ...theme.typography.body2,
    color: theme.colors.primary.default,
  },
  validationMessage: {
    ...theme.typography.caption,
    color: theme.colors.feedback.error,
    marginTop: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface.muted,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body1,
    color: theme.colors.text.primary,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: theme.colors.surface.elevated,
    color: theme.colors.text.secondary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  doshaCard: {
    backgroundColor: theme.colors.surface.muted,
    borderRadius: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  doshaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doshaIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.xs,
  },
  doshaName: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  doshaDesc: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  doshaInput: {
    backgroundColor: theme.colors.surface.default,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    ...theme.typography.body2,
    color: theme.colors.text.primary,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  changeText: {
    ...theme.typography.caption,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface.default,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.surface.default,
  },
  cancelButtonText: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary.default,
    borderRadius: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  noChangesButton: {
    backgroundColor: theme.colors.text.disabled,
  },
  submitButtonText: {
    ...theme.typography.body1,
    fontWeight: '600',
    color: theme.colors.text.onPrimary,
  },
});

export default TreatmentForm;
