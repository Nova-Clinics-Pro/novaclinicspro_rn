/**
 * Column Mapping Form Component
 * Allows mapping CSV columns to entity fields
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  BulkEntityType,
  getRequiredFields,
  getSampleFields,
} from '../../data/models/bulkUpload.dtos';

interface ColumnMappingFormProps {
  entityType: BulkEntityType;
  detectedColumns: string[];
  suggestedMapping?: Record<string, string> | null;
  onSubmit: (mapping: Record<string, string>) => void;
  isLoading?: boolean;
}

export const ColumnMappingForm: React.FC<ColumnMappingFormProps> = ({
  entityType,
  detectedColumns,
  suggestedMapping,
  onSubmit,
  isLoading = false,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [showPicker, setShowPicker] = useState<string | null>(null);

  const targetFields = getSampleFields(entityType);
  const requiredFields = getRequiredFields(entityType);

  // Initialize with suggested mapping (adjusted during render when it changes, not in an effect)
  const [syncedSuggestion, setSyncedSuggestion] = useState<{ value: typeof suggestedMapping } | null>(null);
  if (!syncedSuggestion || syncedSuggestion.value !== suggestedMapping) {
    setSyncedSuggestion({ value: suggestedMapping });
    if (suggestedMapping) {
      setMapping(suggestedMapping);
    }
  }

  const handleFieldSelect = (csvColumn: string, targetField: string) => {
    setMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField,
    }));
    setShowPicker(null);
  };

  const handleClearMapping = (csvColumn: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      delete next[csvColumn];
      return next;
    });
  };

  const getMappedField = (csvColumn: string): string | null => {
    return mapping[csvColumn] || null;
  };

  const isFieldUsed = (targetField: string): boolean => {
    return Object.values(mapping).includes(targetField);
  };

  const missingRequired = requiredFields.filter(
    (field) => !Object.values(mapping).includes(field)
  );

  const handleSubmit = () => {
    onSubmit(mapping);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Your Columns</Text>
      <Text style={styles.subtitle}>
        Match your CSV columns to the required fields
      </Text>

      {/* Required fields warning */}
      {missingRequired.length > 0 && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color={colors.warning.main} />
          <Text style={styles.warningText}>
            Required fields not mapped: {missingRequired.join(', ')}
          </Text>
        </View>
      )}

      {/* Mapping list */}
      <ScrollView style={styles.mappingList}>
        {detectedColumns.map((csvColumn) => {
          const mappedField = getMappedField(csvColumn);
          const isRequired = mappedField && requiredFields.includes(mappedField);

          return (
            <View key={csvColumn} style={styles.mappingRow}>
              {/* CSV Column */}
              <View style={styles.columnBox}>
                <Ionicons name="document-text" size={16} color={colors.text.secondary} />
                <Text style={styles.columnName} numberOfLines={1}>
                  {csvColumn}
                </Text>
              </View>

              {/* Arrow */}
              <Ionicons name="arrow-forward" size={20} color={colors.text.tertiary} />

              {/* Target Field Picker */}
              <TouchableOpacity
                style={[
                  styles.fieldBox,
                  mappedField && styles.fieldBoxMapped,
                  isRequired && styles.fieldBoxRequired,
                ]}
                onPress={() => setShowPicker(csvColumn)}
              >
                {mappedField ? (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={isRequired ? colors.primary.main : colors.success.main}
                    />
                    <Text
                      style={[
                        styles.fieldName,
                        isRequired && styles.fieldNameRequired,
                      ]}
                      numberOfLines={1}
                    >
                      {mappedField}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleClearMapping(csvColumn)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={16} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.fieldPlaceholder}>Select field...</Text>
                )}
              </TouchableOpacity>

              {/* Field picker dropdown */}
              {showPicker === csvColumn && (
                <View style={styles.pickerDropdown}>
                  <Text style={styles.pickerTitle}>Select Target Field</Text>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {targetFields.map((field) => {
                      const used = isFieldUsed(field);
                      const required = requiredFields.includes(field);

                      return (
                        <TouchableOpacity
                          key={field}
                          style={[
                            styles.pickerOption,
                            used && styles.pickerOptionUsed,
                          ]}
                          onPress={() => handleFieldSelect(csvColumn, field)}
                          disabled={used}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              used && styles.pickerOptionTextUsed,
                            ]}
                          >
                            {field}
                          </Text>
                          {required && (
                            <Text style={styles.requiredBadge}>Required</Text>
                          )}
                          {used && (
                            <Ionicons name="checkmark" size={16} color={colors.success.main} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.pickerClose}
                    onPress={() => setShowPicker(null)}
                  >
                    <Text style={styles.pickerCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Submit button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          missingRequired.length > 0 && styles.submitButtonWarning,
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.light} />
        ) : (
          <>
            <Text style={styles.submitButtonText}>
              {missingRequired.length > 0 ? 'Continue Anyway' : 'Apply Mapping'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.text.light} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning.main + '15',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.body2,
    color: colors.warning.dark,
    flex: 1,
  },
  mappingList: {
    flex: 1,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    position: 'relative',
  },
  columnBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.grey[100],
    padding: spacing.sm,
    borderRadius: 8,
  },
  columnName: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
  },
  fieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.default,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderStyle: 'dashed',
  },
  fieldBoxMapped: {
    borderStyle: 'solid',
    borderColor: colors.success.main,
    backgroundColor: colors.success.main + '10',
  },
  fieldBoxRequired: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  fieldName: {
    ...typography.body2,
    color: colors.success.main,
    flex: 1,
  },
  fieldNameRequired: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  fieldPlaceholder: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
  pickerDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    width: '60%',
    backgroundColor: colors.background.default,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    maxHeight: 250,
  },
  pickerTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerScroll: {
    maxHeight: 180,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerOptionUsed: {
    backgroundColor: colors.grey[50],
  },
  pickerOptionText: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
  },
  pickerOptionTextUsed: {
    color: colors.text.tertiary,
  },
  requiredBadge: {
    ...typography.caption,
    fontSize: 10,
    color: colors.primary.main,
    backgroundColor: colors.primary.main + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  pickerClose: {
    padding: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  pickerCloseText: {
    ...typography.body2,
    color: colors.primary.main,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  submitButtonWarning: {
    backgroundColor: colors.warning.main,
  },
  submitButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
});
