/**
 * TreatmentSessionCompleteModal
 * Modal form for submitting session completion with materials.
 *
 * - Material name: searchable autocomplete against inventory, free-text fallback
 * - Required fields: material_name, quantity_used, unit
 * - Optional/hidden: material_code, ml_per_unit (sent as defaults if absent)
 * - Works for both multi-day (rowId present) and single-day (rowId null)
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  SheetRowUsable,
  CompleteSheetRowRequest,
} from '../../../staffDashboards/data/models/staffDashboards.dtos';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { InventoryItemResponse } from '../../../inventory/data/models/inventory.dtos';
import { useInventoryItemsListQuery } from '../../../inventory/data/repositories/inventory.repository.impl';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';

// ============================================
// ZOD SCHEMA
// ============================================

export const completeMaterialSchema = z.object({
  inventory_item_id: z.string().nullable().optional(),
  material_name: z.string().min(1, 'Material name is required'),
  material_code: z.string().nullable().optional(),
  quantity_used: z
    .number()
    .gt(0, 'Must be greater than 0')
    .lte(10000, 'Must be 10000 or less'),
  unit: z.string().min(1, 'Unit is required'),
  ml_per_unit: z.number().optional(),
  category: z.enum(['oil', 'medicine', 'disposable', 'other']),
}).refine(
  (material) => Boolean(material.inventory_item_id || material.material_code),
  {
    message: 'Select a material from inventory or use a configured material',
    path: ['material_name'],
  }
);

export const completeSheetRowSchema = z.object({
  materials: z
    .array(completeMaterialSchema)
    .max(50, 'Maximum 50 materials allowed'),
});

type CompleteSheetRowFormData = z.infer<typeof completeSheetRowSchema>;

// ============================================
// HELPERS
// ============================================

const CATEGORIES: Array<'oil' | 'medicine' | 'disposable' | 'other'> = [
  'oil', 'medicine', 'disposable', 'other',
];

const CATEGORY_LABELS: Record<string, string> = {
  oil: 'Oil', medicine: 'Medicine', disposable: 'Disposable', other: 'Other',
};

const emptyMaterial = (): CompleteSheetRowFormData['materials'][number] => ({
  inventory_item_id: null,
  material_name: '',
  material_code: null,
  quantity_used: 0,
  unit: '',
  ml_per_unit: 1,
  category: 'other',
});

const usableToFormRow = (
  usable: SheetRowUsable,
): CompleteSheetRowFormData['materials'][number] => ({
  inventory_item_id: usable.inventory_item_id ?? null,
  material_name: usable.material_name,
  material_code: usable.material_code ?? null,
  quantity_used: usable.quantity_used,
  unit: usable.unit,
  ml_per_unit: usable.ml_per_unit,
  category: usable.category,
});

// ============================================
// PROPS
// ============================================

interface TreatmentSessionCompleteModalProps {
  visible: boolean;
  /** null for single-day appointments (no treatment sheet row) */
  rowId: string | null;
  initialMaterials: SheetRowUsable[];
  onSubmit: (payload: CompleteSheetRowRequest) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  submitStatus: 'idle' | 'completing' | 'error';
  errorMessage: string | null;
}

// ============================================
// INVENTORY SEARCH HOOK
// ============================================

export const useInventorySearch = (tenantId: string, query: string) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const params = useMemo(
    () => ({ search: debouncedQuery, limit: 8, is_active: true }),
    [debouncedQuery]
  );

  useEffect(() => {
    if (!query || query.length < 2) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query, tenantId]);

  const { data, isFetching } = useInventoryItemsListQuery(tenantId, params, {
    enabled: !!tenantId && debouncedQuery.length >= 2,
    retry: false,
    staleTime: 0,
  });

  return {
    results: debouncedQuery.length >= 2 ? data?.items ?? [] : [],
    isSearching: debouncedQuery === query && query.length >= 2 && isFetching,
  };
};

// ============================================
// MATERIAL NAME FIELD WITH AUTOCOMPLETE
// ============================================

interface MaterialNameFieldProps {
  value: string;
  onChange: (name: string, itemId: string | null, unit: string | null) => void;
  tenantId: string;
  error?: string;
  index: number;
}

const MaterialNameField: React.FC<MaterialNameFieldProps> = ({
  value, onChange, tenantId, error, index,
}) => {
  const inputRef = useRef<TextInput>(null);
  const isSelectingRef = useRef(false);
  const [inputText, setInputText] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const { results, isSearching } = useInventorySearch(tenantId, inputText);

  // Sync external value changes (e.g. reset)
  useEffect(() => { setInputText(value); }, [value]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    setShowDropdown(text.length >= 2);
    onChange(text, null, null);
  };

  const handleSelect = (item: InventoryItemResponse) => {
    if (isSelectingRef.current) return;
    isSelectingRef.current = true;
    setInputText(item.name);
    setShowDropdown(false);
    onChange(item.name, item.id, item.unit ?? null);
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 0);
  };

  const handleBlur = () => {
    if (isSelectingRef.current) return;

    if (showSuggestions) {
      setTimeout(() => {
        if (!isSelectingRef.current) {
          inputRef.current?.focus();
        }
      }, 50);
      return;
    }

    setShowDropdown(false);
  };

  const showSuggestions = showDropdown && inputText.length >= 2 && (results.length > 0 || isSearching);

  return (
    <View style={[styles.fieldGroup, showSuggestions && styles.autocompleteFieldGroup]}>
      <Text style={styles.label}>Material Name *</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, error && styles.inputError]}
        value={inputText}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        onFocus={() => inputText.length >= 2 && setShowDropdown(true)}
        placeholder="Search inventory or type name"
        accessibilityLabel={`Material ${index + 1} name`}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
      {showSuggestions && (
        <View style={styles.dropdown}>
          {isSearching ? (
            <View style={styles.dropdownLoading}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : (
            results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.dropdownItem}
                delayPressIn={0}
                onPressIn={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
              >
                <Text style={styles.dropdownItemName}>{item.name}</Text>
                {item.unit && (
                  <Text style={styles.dropdownItemUnit}>{item.unit}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// MATERIAL ROW
// ============================================

interface MaterialRowProps {
  index: number;
  control: ReturnType<typeof useForm<CompleteSheetRowFormData>>['control'];
  errors: ReturnType<typeof useForm<CompleteSheetRowFormData>>['formState']['errors'];
  onRemove: () => void;
  tenantId: string;
  setValue: (name: any, value: any, options?: object) => void;
  trigger: (name?: any) => Promise<boolean>;
}

const MaterialRow: React.FC<MaterialRowProps> = ({
  index, control, errors, onRemove, tenantId, setValue, trigger,
}) => {
  const rowErrors = errors.materials?.[index];

  return (
    <View style={styles.materialRow}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>Material {index + 1}</Text>
        <TouchableOpacity
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove material ${index + 1}`}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Material Name — autocomplete */}
      <Controller
        control={control}
        name={`materials.${index}.material_name`}
        render={({ field: { value } }) => (
          <MaterialNameField
            value={value}
            tenantId={tenantId}
            error={rowErrors?.material_name?.message}
            index={index}
            onChange={(name, itemId, unit) => {
              // Set all values without triggering validation on each call,
              // so Zod's refine() sees the final complete state in one pass.
              setValue(`materials.${index}.material_name`, name, { shouldDirty: true });
              setValue(`materials.${index}.inventory_item_id`, itemId, { shouldDirty: true });
              if (itemId) {
                setValue(`materials.${index}.material_code`, null, { shouldDirty: true });
              }
              if (unit) setValue(`materials.${index}.unit`, unit, { shouldDirty: true });
              // Validate the whole row at once after all values are set
              trigger(`materials.${index}`);
            }}
          />
        )}
      />

      {/* Quantity */}
      <Controller
        control={control}
        name={`materials.${index}.quantity_used`}
        render={({ field: { onChange, onBlur, value } }) => {
          // Keep a local string so intermediate input (e.g. "5." or "") doesn't
          // corrupt the numeric RHF value while the user is still typing.
          const [rawText, setRawText] = React.useState(value === 0 ? '' : String(value));
          return (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={[styles.input, rowErrors?.quantity_used && styles.inputError]}
                value={rawText}
                onChangeText={(text) => {
                  setRawText(text);
                  const num = parseFloat(text);
                  onChange(isNaN(num) ? 0 : num);
                }}
                onBlur={() => {
                  // Commit final parsed value on blur
                  const num = parseFloat(rawText);
                  onChange(isNaN(num) ? 0 : num);
                  onBlur();
                }}
                placeholder="e.g. 50"
                keyboardType="numeric"
                accessibilityLabel={`Material ${index + 1} quantity`}
              />
              {rowErrors?.quantity_used && (
                <Text style={styles.fieldError}>{rowErrors.quantity_used.message}</Text>
              )}
            </View>
          );
        }}
      />

      {/* Unit */}
      <Controller
        control={control}
        name={`materials.${index}.unit`}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Unit *</Text>
            <TextInput
              style={[styles.input, rowErrors?.unit && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. ml, g, pcs"
              accessibilityLabel={`Material ${index + 1} unit`}
            />
            {rowErrors?.unit && (
              <Text style={styles.fieldError}>{rowErrors.unit.message}</Text>
            )}
          </View>
        )}
      />

      {/* Category */}
      <Controller
        control={control}
        name={`materials.${index}.category`}
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryButton, value === cat && styles.categoryButtonActive]}
                  onPress={() => onChange(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`${CATEGORY_LABELS[cat]}${value === cat ? ', selected' : ''}`}
                >
                  <Text style={[styles.categoryButtonText, value === cat && styles.categoryButtonTextActive]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const TreatmentSessionCompleteModal: React.FC<TreatmentSessionCompleteModalProps> = ({
  visible,
  rowId,
  initialMaterials,
  onSubmit,
  onClose,
  isSubmitting,
  submitStatus,
  errorMessage,
}) => {
  const { currentUser } = useAuth();
  const tenantId = currentUser?.tenantId ?? '';

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CompleteSheetRowFormData>({
    resolver: zodResolver(completeSheetRowSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      materials: initialMaterials.length > 0 ? initialMaterials.map(usableToFormRow) : [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });

  useEffect(() => {
    if (visible) {
      reset({
        materials: initialMaterials.length > 0 ? initialMaterials.map(usableToFormRow) : [],
      });
    }
  }, [visible, rowId, initialMaterials, reset]);

  const isCompleting = submitStatus === 'completing';
  const showError = submitStatus === 'error' || submitStatus === ('partial_error' as string);

  const onFormSubmit = async (data: CompleteSheetRowFormData) => {
    const payload: CompleteSheetRowRequest = {
      materials: data.materials.map((m) => ({
        inventory_item_id: m.inventory_item_id ?? null,
        material_name: m.material_name,
        material_code: m.material_code ?? null,
        quantity_used: m.quantity_used,
        unit: m.unit,
        ml_per_unit: m.ml_per_unit ?? 1,
        category: m.category,
      })),
    };
    await onSubmit(payload);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {rowId ? 'Complete Session' : 'Complete & Record Materials'}
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
          >
            {fields.map((field, index) => (
              <MaterialRow
                key={field.id}
                index={index}
                control={control}
                errors={errors}
                onRemove={() => remove(index)}
                tenantId={tenantId}
                setValue={setValue}
                trigger={trigger}
              />
            ))}

            {fields.length < 50 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => append(emptyMaterial())}
                accessibilityRole="button"
                accessibilityLabel="Add material row"
              >
                <Text style={styles.addButtonText}>+ Add Material</Text>
              </TouchableOpacity>
            )}

            {errors.materials && !Array.isArray(errors.materials) && (
              <Text style={styles.errorText}>{errors.materials.message}</Text>
            )}

            {showError && errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isCompleting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, (isCompleting || isSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit(onFormSubmit)}
              disabled={isCompleting || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isCompleting ? 'Completing session' : 'Submit'}
            >
              {isCompleting && <ActivityIndicator size="small" color={colors.common.white} />}
              <Text style={styles.submitButtonText}>
                {isCompleting ? 'Completing...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  materialRow: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  removeText: {
    fontSize: 13,
    color: colors.error.main,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  autocompleteFieldGroup: {
    zIndex: 1000,
    elevation: 1000,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.common.white,
    minHeight: 40,
  },
  inputError: { borderColor: colors.error.main },
  fieldError: {
    fontSize: 11,
    color: colors.error.main,
    marginTop: 2,
  },
  // Autocomplete dropdown
  dropdown: {
    position: 'absolute',
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: colors.common.white,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownLoading: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownItemName: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  dropdownItemUnit: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  // Category
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.main,
    backgroundColor: colors.common.white,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: { color: colors.common.white },
  addButton: {
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: colors.error.main,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.white,
  },
});
