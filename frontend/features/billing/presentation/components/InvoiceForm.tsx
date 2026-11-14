/**
 * Invoice Form Component
 * Form for creating/editing invoices
 */

import { DateField } from '../../../../core/components/DateField';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
  InvoiceCreateRequest,
  InvoiceUpdateRequest,
  InvoiceResponse,
  InvoiceLineCreateRequest,
  generateInvoiceNumber,
  getTodayISO,
  getDueDate30Days,
  parseAmount,
  calculateInvoiceTotals,
  formatCurrency,
} from '../../data/models/billing.dtos';

interface InvoiceFormProps {
  initialData?: InvoiceResponse;
  clientId?: string;
  onSubmit: (data: InvoiceCreateRequest | InvoiceUpdateRequest) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const LINE_TYPES = [
  { value: 'treatment', label: 'Treatment' },
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  clientId,
  onSubmit,
  isLoading = false,
  isEdit = false,
}) => {
  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoice_number || generateInvoiceNumber()
  );
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoice_date?.split('T')[0] || getTodayISO()
  );
  const [dueDate, setDueDate] = useState(
    initialData?.due_date?.split('T')[0] || getDueDate30Days()
  );
  const [status, setStatus] = useState(initialData?.status || 'DRAFT');
  const [lines, setLines] = useState<InvoiceLineCreateRequest[]>(
    initialData?.lines?.map((l) => ({
      line_type: l.line_type,
      description: l.description,
      quantity: parseAmount(l.quantity),
      unit_price: parseAmount(l.unit_price),
      discount_amount: parseAmount(l.discount_amount),
      tax_percentage: parseAmount(l.tax_percentage),
      tax_amount: parseAmount(l.tax_amount),
      line_total: parseAmount(l.line_total),
    })) || []
  );

  // Calculated totals
  const totals = calculateInvoiceTotals(lines);

  const addLine = () => {
    setLines([...lines, {
      line_type: 'service',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      tax_percentage: 0,
      tax_amount: 0,
      line_total: 0,
    }]);
  };

  const updateLine = (index: number, field: keyof InvoiceLineCreateRequest, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Recalculate line total
    const qty = parseAmount(newLines[index].quantity);
    const price = parseAmount(newLines[index].unit_price);
    const discount = parseAmount(newLines[index].discount_amount ?? null);
    const taxPct = parseAmount(newLines[index].tax_percentage ?? null);
    const subtotal = qty * price - discount;
    const taxAmt = subtotal * (taxPct / 100);
    
    newLines[index].tax_amount = taxAmt;
    newLines[index].line_total = subtotal + taxAmt;
    
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const isValid = isEdit || (clientId && invoiceNumber.trim() && invoiceDate);

  const handleSubmit = () => {
    if (!isValid) return;

    if (isEdit) {
      const data: InvoiceUpdateRequest = {
        due_date: dueDate || null,
        subtotal_amount: totals.subtotal,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        total_amount: totals.total,
        status: status || null,
      };
      onSubmit(data);
    } else {
      const data: InvoiceCreateRequest = {
        client_id: clientId!,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        subtotal_amount: totals.subtotal,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        total_amount: totals.total,
        status,
        currency: 'INR',
        lines,
      };
      onSubmit(data);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Invoice Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Invoice Number *</Text>
          <TextInput
            style={[styles.input, isEdit && styles.inputDisabled]}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-XXXX-XXXX"
            placeholderTextColor={colors.text.tertiary}
            editable={!isEdit}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Invoice Date *</Text>
            <DateField value={invoiceDate} onChange={setInvoiceDate} disabled={isEdit} />
          </View>
          <View style={{ width: spacing.md }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Due Date</Text>
            <DateField value={dueDate} onChange={setDueDate} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusContainer}>
            {['DRAFT', 'SENT', 'PAID'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusChip,
                  status === s && styles.statusChipActive,
                ]}
                onPress={() => setStatus(s)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    status === s && styles.statusChipTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Line Items (only for create) */}
      {!isEdit && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity style={styles.addLineButton} onPress={addLine}>
              <Ionicons name="add" size={20} color={colors.primary.main} />
              <Text style={styles.addLineText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {lines.map((line, index) => (
            <View key={index} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineNumber}>Item #{index + 1}</Text>
                <TouchableOpacity onPress={() => removeLine(index)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error.main} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.labelSmall}>Description</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={line.description || ''}
                  onChangeText={(v) => updateLine(index, 'description', v)}
                  placeholder="Description"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.labelSmall}>Qty</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={line.quantity?.toString()}
                    onChangeText={(v) => updateLine(index, 'quantity', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ width: spacing.sm }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.labelSmall}>Unit Price</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={line.unit_price?.toString()}
                    onChangeText={(v) => updateLine(index, 'unit_price', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ width: spacing.sm }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.labelSmall}>Tax %</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={line.tax_percentage?.toString()}
                    onChangeText={(v) => updateLine(index, 'tax_percentage', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.lineTotal}>
                Line Total: {formatCurrency(line.line_total ?? null)}
              </Text>
            </View>
          ))}

          {lines.length === 0 && (
            <View style={styles.noLinesContainer}>
              <Text style={styles.noLinesText}>No line items added yet</Text>
            </View>
          )}
        </View>
      )}

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatCurrency(totals.tax)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text style={styles.totalValue}>-{formatCurrency(totals.discount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(totals.total)}</Text>
          </View>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.text.light} />
        ) : (
          <>
            <Ionicons name={isEdit ? 'checkmark' : 'add'} size={24} color={colors.text.light} />
            <Text style={styles.submitButtonText}>
              {isEdit ? 'Update Invoice' : 'Create Invoice'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  labelSmall: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
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
  inputSmall: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: 8,
    padding: spacing.sm,
    ...typography.body2,
    color: colors.text.primary,
  },
  inputDisabled: {
    backgroundColor: colors.grey[100],
  },
  row: {
    flexDirection: 'row',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.grey[100],
  },
  statusChipActive: {
    backgroundColor: colors.primary.main,
  },
  statusChipText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  statusChipTextActive: {
    color: colors.text.light,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addLineText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.primary.main,
  },
  lineCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineNumber: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.text.primary,
  },
  lineTotal: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.primary.main,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  noLinesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noLinesText: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
  totalsCard: {
    backgroundColor: colors.grey[50],
    borderRadius: 12,
    padding: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  totalValue: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.text.primary,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.primary,
  },
  grandTotalValue: {
    ...typography.h6,
    fontWeight: '700',
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
    marginBottom: spacing.xl,
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
