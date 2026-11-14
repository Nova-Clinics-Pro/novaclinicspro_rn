/**
 * Batch Form Component
 * Form for creating/editing inventory batches
 */

import { DateField } from '../../../../core/components/DateField';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  BatchCreateRequest,
  BatchUpdateRequest,
  BatchResponse,
} from '../../data/models/inventory.dtos';

interface BatchFormProps {
  initialData?: BatchResponse;
  onSubmit: (data: BatchCreateRequest | BatchUpdateRequest) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export const BatchForm: React.FC<BatchFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  isEdit = false,
}) => {
  const [batchNumber, setBatchNumber] = useState(initialData?.batch_number || '');
  const [quantity, setQuantity] = useState(
    initialData ? (parseFloat(initialData.quantity_available) || 0).toString() : ''
  );
  const [unitCost, setUnitCost] = useState(initialData?.unit_cost?.toString() || '');
  const [mrp, setMrp] = useState(initialData?.mrp?.toString() || '');
  const [gstRate, setGstRate] = useState(initialData?.gst_rate?.toString() || '');
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiry_date ? initialData.expiry_date.split('T')[0] : ''
  );
  const [manufactureDate, setManufactureDate] = useState(
    initialData?.manufacture_date ? initialData.manufacture_date.split('T')[0] : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchase_date ? initialData.purchase_date.split('T')[0] : ''
  );

  const isValid = isEdit
    ? true // For edit, we just need any change
    : batchNumber.trim().length > 0 && parseFloat(quantity) > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    if (isEdit) {
      const data: BatchUpdateRequest = {
        expiry_date: expiryDate || null,
        manufacture_date: manufactureDate || null,
      };
      onSubmit(data);
    } else {
      const data: BatchCreateRequest = {
        batch_number: batchNumber.trim(),
        quantity: parseFloat(quantity),
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        mrp: mrp ? parseFloat(mrp) : null,
        gst_rate: gstRate ? parseFloat(gstRate) : null,
        expiry_date: expiryDate || null,
        manufacture_date: manufactureDate || null,
        purchase_date: purchaseDate || null,
      };
      onSubmit(data);
    }
  };

  return (
    <View style={styles.container}>
      {/* Batch Number (only for create) */}
      {!isEdit && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Batch Number *</Text>
          <TextInput
            style={styles.input}
            value={batchNumber}
            onChangeText={setBatchNumber}
            placeholder="Enter batch number"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      )}

      {/* Quantity (only for create) */}
      {!isEdit && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter quantity"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </View>
      )}

      {/* Pricing (only for create) */}
      {!isEdit && (
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Unit Cost (₹)</Text>
            <TextInput
              style={styles.input}
              value={unitCost}
              onChangeText={setUnitCost}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ width: spacing.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>MRP (₹)</Text>
            <TextInput
              style={styles.input}
              value={mrp}
              onChangeText={setMrp}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* GST (only for create) */}
      {!isEdit && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Rate (%)</Text>
          <TextInput
            style={styles.input}
            value={gstRate}
            onChangeText={setGstRate}
            placeholder="18"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </View>
      )}

      {/* Dates */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Expiry Date</Text>
        <DateField value={expiryDate} onChange={setExpiryDate} />
        <Text style={styles.hint}>Format: 2025-12-31</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Manufacture Date</Text>
        <DateField value={manufactureDate} onChange={setManufactureDate} />
      </View>

      {/* Purchase Date (only for create) */}
      {!isEdit && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Purchase Date</Text>
          <DateField value={purchaseDate} onChange={setPurchaseDate} />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          !isValid && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.light} />
        ) : (
          <>
            <Ionicons
              name={isEdit ? 'checkmark' : 'add'}
              size={24}
              color={colors.text.light}
            />
            <Text style={styles.submitButtonText}>
              {isEdit ? 'Update Batch' : 'Create Batch'}
            </Text>
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
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
  },
  hint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.light,
  },
});
