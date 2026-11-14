import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { formatTime } from '../../../../core/utils/dateTimeUtils';

export type SessionType = 'DOCTOR' | 'THERAPY';
type AppointmentBookingType = 'SINGLE' | 'MULTI';

export interface AppointmentPickerOption {
  id: string;
  label: string;
  subtitle?: string;
  phone?: string;
  duration_minutes?: number | null;
  role?: string;
  staff_type?: string;
  gender?: string;
}

interface TypeSelectorProps {
  value: AppointmentBookingType;
  onChange: (type: AppointmentBookingType) => void;
  allowMultiDay?: boolean;
}

export const AppointmentTypeSelector: React.FC<TypeSelectorProps> = ({
  value,
  onChange,
  allowMultiDay = false,
}) => (
  <View style={styles.typeSelector} accessibilityRole="radiogroup" accessibilityLabel="Appointment Type">
    <TouchableOpacity
      style={[styles.typeOption, value === 'SINGLE' && styles.typeOptionSelected]}
      onPress={() => onChange('SINGLE')}
      accessibilityRole="radio"
      accessibilityState={{ checked: value === 'SINGLE' }}
      accessibilityLabel="Single Day appointment"
    >
      <Ionicons
        name="calendar-outline"
        size={24}
        color={value === 'SINGLE' ? colors.primary.main : colors.text.secondary}
      />
      <Text style={[styles.typeOptionTitle, value === 'SINGLE' && styles.typeOptionTitleSelected]}>
        Single Day
      </Text>
      <Text style={styles.typeOptionSubtitle}>One-time appointment</Text>
    </TouchableOpacity>

    {allowMultiDay && (
      <TouchableOpacity
        style={[styles.typeOption, value === 'MULTI' && styles.typeOptionSelected]}
        onPress={() => onChange('MULTI')}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === 'MULTI' }}
        accessibilityLabel="Multi Day therapy series"
      >
        <Ionicons
          name="calendar"
          size={24}
          color={value === 'MULTI' ? colors.primary.main : colors.text.secondary}
        />
        <Text style={[styles.typeOptionTitle, value === 'MULTI' && styles.typeOptionTitleSelected]}>
          Multi Day
        </Text>
        <Text style={styles.typeOptionSubtitle}>Therapy series</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface SessionTypeSelectorProps {
  value: SessionType;
  onChange: (type: SessionType) => void;
  allowTherapySession: boolean;
}

export const AppointmentSessionTypeSelector: React.FC<SessionTypeSelectorProps> = ({
  value,
  onChange,
  allowTherapySession,
}) => (
  <View style={styles.sessionTypeSelector} accessibilityRole="radiogroup" accessibilityLabel="Session Type">
    <TouchableOpacity
      style={[styles.sessionTypeOption, value === 'DOCTOR' && styles.sessionTypeOptionSelected]}
      onPress={() => onChange('DOCTOR')}
      accessibilityRole="radio"
      accessibilityState={{ checked: value === 'DOCTOR' }}
      accessibilityLabel="Doctor Consultation"
    >
      <Ionicons
        name="medkit"
        size={18}
        color={value === 'DOCTOR' ? colors.background.default : colors.text.secondary}
      />
      <Text style={[styles.sessionTypeText, value === 'DOCTOR' && styles.sessionTypeTextSelected]}>
        Doctor Consultation
      </Text>
    </TouchableOpacity>
    {allowTherapySession && (
      <TouchableOpacity
        style={[styles.sessionTypeOption, value === 'THERAPY' && styles.sessionTypeOptionSelected]}
        onPress={() => onChange('THERAPY')}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === 'THERAPY' }}
        accessibilityLabel="Therapy Session"
      >
        <Ionicons
          name="fitness"
          size={18}
          color={value === 'THERAPY' ? colors.background.default : colors.text.secondary}
        />
        <Text style={[styles.sessionTypeText, value === 'THERAPY' && styles.sessionTypeTextSelected]}>
          Therapy Session
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

interface SearchableDropdownProps {
  title: string;
  placeholder?: string;
  options: AppointmentPickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyText?: string;
  showCreateOption?: boolean;
  onCreateNew?: () => void;
  multiple?: boolean;
  selectedIds?: string[];
  maxSelect?: number;
  autoCloseOnSelect?: boolean;
  disabled?: boolean;
}

export const AppointmentSearchableDropdown: React.FC<SearchableDropdownProps> = ({
  title,
  placeholder = 'Select...',
  options,
  selectedId,
  onSelect,
  isLoading,
  emptyText = 'No options available',
  showCreateOption,
  onCreateNew,
  multiple,
  selectedIds = [],
  maxSelect = 2,
  autoCloseOnSelect = true,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((option) => option.id === selectedId);
  const selectedCount = selectedIds.length;
  const selectedLabels = options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.label)
    .join(', ');
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) => option.label.toLowerCase().includes(query)
        || option.subtitle?.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  const close = () => {
    setExpanded(false);
    setSearchQuery('');
  };

  const select = (id: string) => {
    onSelect(id);
    if (autoCloseOnSelect && !multiple) close();
  };

  if (disabled) {
    return (
      <View style={[styles.dropdownContainer, styles.dropdownDisabled]}>
        <View style={styles.dropdownHeader}>
          <View style={styles.dropdownHeaderContent}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <Text style={[styles.dropdownValue, styles.dropdownValueDisabled]}>{placeholder}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${multiple ? selectedLabels || placeholder : selectedOption?.label || placeholder}`}
        accessibilityHint="Double tap to open selection"
      >
        <View style={styles.dropdownHeaderContent}>
          <Text style={styles.dropdownTitle}>{title}</Text>
          <Text style={styles.dropdownValue} numberOfLines={1}>
            {multiple ? (selectedCount > 0 ? selectedLabels : placeholder) : selectedOption?.label || placeholder}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdownContent}>
          <View style={styles.dropdownSearch}>
            <Ionicons name="search" size={18} color={colors.text.tertiary} />
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder="Search..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              accessibilityLabel="Search options"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} style={styles.dropdownLoader} />
          ) : (
            <ScrollView style={styles.dropdownOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {showCreateOption && onCreateNew && (
                <TouchableOpacity
                  style={styles.dropdownCreateOption}
                  onPress={() => {
                    close();
                    onCreateNew();
                  }}
                  accessibilityLabel="Create new client"
                  data-testid="dropdown-create-new-client"
                >
                  <Ionicons name="add-circle" size={20} color={colors.primary.main} />
                  <Text style={styles.dropdownCreateText}>+ Create New Client</Text>
                </TouchableOpacity>
              )}
              {filteredOptions.length === 0 && !showCreateOption ? (
                <Text style={styles.dropdownEmpty}>{emptyText}</Text>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multiple ? selectedIds.includes(option.id) : selectedId === option.id;
                  const canSelect = !multiple || selectedIds.length < maxSelect || isSelected;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownOption,
                        isSelected && styles.dropdownOptionSelected,
                        !canSelect && styles.dropdownOptionDisabled,
                      ]}
                      onPress={() => canSelect && select(option.id)}
                      disabled={!canSelect}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={option.label}
                    >
                      <View style={styles.dropdownOptionContent}>
                        <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelSelected]}>
                          {option.label}
                        </Text>
                        {!!option.subtitle && <Text style={styles.dropdownOptionSubtitle}>{option.subtitle}</Text>}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
          {multiple && (
            <TouchableOpacity style={styles.dropdownDoneButton} onPress={close} accessibilityLabel="Done selecting">
              <Text style={styles.dropdownDoneText}>Done ({selectedCount} selected)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

interface BookedSlotsProps {
  appointments: {
    id: string;
    appointment_start: string;
    appointment_end?: string | null;
    client_name?: string | null;
  }[];
  isLoading?: boolean;
}

export const AppointmentBookedSlots: React.FC<BookedSlotsProps> = ({ appointments, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.bookedSlotsLoading}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text style={styles.bookedSlotsLoadingText}>Loading schedule...</Text>
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <View style={styles.bookedSlotsEmpty}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
        <Text style={styles.bookedSlotsEmptyText}>No booked slots - Doctor is available</Text>
      </View>
    );
  }

  return (
    <View style={styles.bookedSlotsContainer}>
      <Text style={styles.bookedSlotsTitle}>Already booked slots:</Text>
      <View style={styles.bookedSlotsList}>
        {appointments.slice(0, 5).map((appointment) => (
          <View key={appointment.id} style={styles.bookedSlot}>
            <View style={styles.bookedSlotTimeContainer}>
              <Text style={styles.bookedSlotTime}>{formatTime(appointment.appointment_start)}</Text>
              {!!appointment.appointment_end && (
                <Text style={styles.bookedSlotTimeSeparator}> - {formatTime(appointment.appointment_end)}</Text>
              )}
            </View>
            <Text style={styles.bookedSlotClient} numberOfLines={1}>{appointment.client_name || 'Client'}</Text>
          </View>
        ))}
        {appointments.length > 5 && (
          <Text style={styles.bookedSlotsMore}>+{appointments.length - 5} more appointments</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  typeSelector: { flexDirection: 'row', gap: spacing.md },
  typeOption: { flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: colors.background.default, borderRadius: spacing.sm, borderWidth: 2, borderColor: colors.border.light, minHeight: 100 },
  typeOptionSelected: { borderColor: colors.primary.main, backgroundColor: colors.primary.main + '10' },
  typeOptionTitle: { ...typography.body1, color: colors.text.primary, fontWeight: '600', marginTop: spacing.sm },
  typeOptionTitleSelected: { color: colors.primary.main },
  typeOptionSubtitle: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs / 2, textAlign: 'center' },
  sessionTypeSelector: { flexDirection: 'row', backgroundColor: colors.background.default, borderRadius: spacing.sm, padding: spacing.xs, borderWidth: 1, borderColor: colors.border.light },
  sessionTypeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: spacing.xs, minHeight: 44 },
  sessionTypeOptionSelected: { backgroundColor: colors.primary.main },
  sessionTypeText: { ...typography.body2, color: colors.text.secondary, fontWeight: '500' },
  sessionTypeTextSelected: { color: colors.background.default },
  dropdownContainer: { backgroundColor: colors.background.default, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  dropdownDisabled: { opacity: 0.5 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, minHeight: 56 },
  dropdownHeaderContent: { flex: 1 },
  dropdownTitle: { ...typography.caption, color: colors.text.secondary },
  dropdownValue: { ...typography.body1, color: colors.text.primary, marginTop: spacing.xs / 2 },
  dropdownValueDisabled: { color: colors.text.tertiary },
  dropdownContent: { borderTopWidth: 1, borderTopColor: colors.border.light },
  dropdownSearch: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.background.paper, gap: spacing.sm },
  dropdownSearchInput: { flex: 1, ...typography.body2, color: colors.text.primary, paddingVertical: spacing.xs },
  dropdownOptions: { maxHeight: 200 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.light, minHeight: 56 },
  dropdownOptionSelected: { backgroundColor: colors.primary.main + '10' },
  dropdownOptionDisabled: { opacity: 0.5 },
  dropdownOptionContent: { flex: 1 },
  dropdownOptionLabel: { ...typography.body1, color: colors.text.primary },
  dropdownOptionLabelSelected: { color: colors.primary.main, fontWeight: '600' },
  dropdownOptionSubtitle: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs / 2 },
  dropdownEmpty: { ...typography.body2, color: colors.text.tertiary, textAlign: 'center', padding: spacing.lg },
  dropdownLoader: { padding: spacing.md },
  dropdownCreateOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.light, gap: spacing.sm, minHeight: 56 },
  dropdownCreateText: { ...typography.body1, color: colors.primary.main, fontWeight: '500' },
  dropdownDoneButton: { padding: spacing.md, backgroundColor: colors.primary.main, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  dropdownDoneText: { ...typography.button, color: colors.background.default },
  bookedSlotsContainer: { backgroundColor: colors.warning.main + '10', borderRadius: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.warning.main + '30' },
  bookedSlotsLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.background.default, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.border.light },
  bookedSlotsLoadingText: { ...typography.body2, color: colors.text.secondary },
  bookedSlotsTitle: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', marginBottom: spacing.sm },
  bookedSlotsList: { gap: spacing.xs },
  bookedSlot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.default, padding: spacing.sm, borderRadius: spacing.xs },
  bookedSlotTimeContainer: { flexDirection: 'row', alignItems: 'center' },
  bookedSlotTime: { ...typography.body2, color: colors.warning.main, fontWeight: '600' },
  bookedSlotTimeSeparator: { ...typography.body2, color: colors.warning.main },
  bookedSlotClient: { ...typography.caption, color: colors.text.secondary, flex: 1, textAlign: 'right', marginLeft: spacing.sm },
  bookedSlotsMore: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.xs },
  bookedSlotsEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success.main + '10', borderRadius: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.success.main + '30' },
  bookedSlotsEmptyText: { ...typography.body2, color: colors.success.main },
});
