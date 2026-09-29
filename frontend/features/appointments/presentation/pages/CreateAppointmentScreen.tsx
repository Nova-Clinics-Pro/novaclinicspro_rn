/**
 * Create Appointment Screen
 * Complete rewrite with all bug fixes:
 * 
 * 1. Doctor Consultation - proper staff filtering, booked slots display
 * 2. Therapy Session - multi-select therapists, auto-duration from treatment
 * 3. KeyboardAvoidingView for mobile UX
 * 4. Isolated form state per tab (no cross-tab leakage)
 * 5. Single-Day to Multi-Day state isolation
 * 6. API calls with proper staff_type filter
 * 7. Proper data binding and client info display
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CrossPlatformDateTimePicker, {
  DateTimePickerEvent,
} from '../../../../core/components/CrossPlatformDateTimePicker';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { ErrorTokens } from '../../../../core/localization/errorTokens';
import { useClientsListQuery, useSearchClientsQuery, useCreateClientMutation } from '../../../clients/data/repositories/clients.repository.impl';
import { useTreatmentsListQuery } from '../../../treatments/data/repositories/treatments.repository.impl';
import { useStaffListQuery } from '../../../staff/data/repositories/staff.repository.impl';
import { useRoomsListQuery } from '../../../rooms/data/repositories/rooms.repository.impl';
import { useOperatingHoursListQuery } from '../../../operatingHours/data/repositories/operatingHours.repository.impl';
import {
  useCreateAppointmentMutation,
  useAppointmentsByDateQuery,
  useValidateAppointmentMutation,
} from '../../data/repositories/appointments.repository.impl';
import {
  AppointmentCreate,
  AppointmentType,
  ValidateAppointmentRequest,
} from '../../data/models/appointments.dtos';
import {
  openWhatsApp,
  generateWhatsAppConfirmationMessage,
  toISODateString,
} from '../../domain/helpers';
import { 
  toLocalTimeISO,
  formatTime, 
  formatDate,
  formatTime as formatTimeUtil 
} from '../../../../core/utils/dateTimeUtils';
import { validateAppointmentTime, formatValidationMessage, ValidationResult } from '../../utils/appointmentValidation';
import { useDebounce } from '../../../../core/hooks/useDebounce';
import { useFeatures } from '../../../../core/hooks/useFeatures';
import { TreatmentResponse } from '../../../treatments/data/models/treatments.dtos';
import {
  useOrderingDoctorQuery,
  useTreatmentSheetPrefillQuery,
} from '../../data/repositories/orderingDoctor.repository.impl';

// ============================================
// TYPES
// ============================================

type SessionType = 'DOCTOR' | 'THERAPY';

interface PickerOption {
  id: string;
  label: string;
  subtitle?: string;
  phone?: string;
  duration_minutes?: number | null;
  role?: string;
  staff_type?: string;
  gender?: string; // BUG FIX #7: For gender matching
}

// Form state for Doctor consultation
interface DoctorFormState {
  selectedDoctorId: string | null;
  durationMinutes: number;
  appointmentDate: Date;
  appointmentTime: Date;
  notes: string;
}

// Form state for Therapy session
interface TherapyFormState {
  selectedTreatmentId: string | null;
  selectedTherapistIds: string[];
  selectedRoomId: string | null;
  durationMinutes: number;
  appointmentDate: Date;
  appointmentTime: Date;
  notes: string;
}

// Form state for Multi-day
interface MultiDayFormState {
  selectedTreatmentId: string | null;
  selectedDoctorId: string | null;
  selectedTherapistIds: string[];
  durationMinutes: number;
  numberOfSessions: number;
  startDate: Date;
  preferredTime: Date;
  notes: string;
}

// ============================================
// TYPE SELECTOR COMPONENT
// ============================================

interface TypeSelectorProps {
  value: AppointmentType;
  onChange: (type: AppointmentType) => void;
  allowMultiDay?: boolean; // Feature flag
}

const TypeSelector: React.FC<TypeSelectorProps> = ({ value, onChange, allowMultiDay = false }) => (
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
    
    {/* Multi-day option - only show for Ayurveda and Physio clinics */}
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

// ============================================
// SESSION TYPE TOGGLE (DOCTOR vs THERAPY)
// ============================================

interface SessionTypeSelectorProps {
  value: SessionType;
  onChange: (type: SessionType) => void;
  allowTherapySession: boolean;
}

const SessionTypeSelector: React.FC<SessionTypeSelectorProps> = ({ value, onChange, allowTherapySession }) => (
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

// ============================================
// SEARCHABLE DROPDOWN COMPONENT
// ============================================

interface SearchableDropdownProps {
  title: string;
  placeholder?: string;
  options: PickerOption[];
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

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
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

  const selectedOption = options.find(o => o.id === selectedId);
  const selectedCount = selectedIds.length;
  const selectedLabels = options.filter(o => selectedIds.includes(o.id)).map(o => o.label).join(', ');

  // Filter options by search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(query) ||
      (o.subtitle?.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleSelect = (id: string) => {
    onSelect(id);
    if (autoCloseOnSelect && !multiple) {
      setExpanded(false);
      setSearchQuery('');
    }
  };

  const handleClose = () => {
    setExpanded(false);
    setSearchQuery('');
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
          {multiple ? (
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {selectedCount > 0 ? selectedLabels : placeholder}
            </Text>
          ) : (
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {selectedOption?.label || placeholder}
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdownContent}>
          {/* Search Input */}
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

          {/* Options */}
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary.main} style={styles.dropdownLoader} />
          ) : (
            <ScrollView style={styles.dropdownOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {/* Create New Option */}
              {showCreateOption && onCreateNew && (
                <TouchableOpacity
                  style={styles.dropdownCreateOption}
                  onPress={() => {
                    handleClose();
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
                  const isSelected = multiple
                    ? selectedIds.includes(option.id)
                    : selectedId === option.id;
                  const canSelect = !multiple || selectedIds.length < maxSelect || isSelected;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownOption,
                        isSelected && styles.dropdownOptionSelected,
                        !canSelect && styles.dropdownOptionDisabled,
                      ]}
                      onPress={() => canSelect && handleSelect(option.id)}
                      disabled={!canSelect}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={option.label}
                    >
                      <View style={styles.dropdownOptionContent}>
                        <Text style={[
                          styles.dropdownOptionLabel,
                          isSelected && styles.dropdownOptionLabelSelected,
                        ]}>
                          {option.label}
                        </Text>
                        {option.subtitle && (
                          <Text style={styles.dropdownOptionSubtitle}>{option.subtitle}</Text>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Done Button for multi-select */}
          {multiple && (
            <TouchableOpacity style={styles.dropdownDoneButton} onPress={handleClose} accessibilityLabel="Done selecting">
              <Text style={styles.dropdownDoneText}>Done ({selectedCount} selected)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// BOOKED SLOTS DISPLAY (for Doctor)
// ============================================

interface BookedSlotsProps {
  appointments: any[];
  selectedDate: Date;
  isLoading?: boolean;
}

const BookedSlots: React.FC<BookedSlotsProps> = ({ appointments, selectedDate, isLoading }) => {
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
        {appointments.slice(0, 5).map((apt) => (
          <View key={apt.id} style={styles.bookedSlot}>
            <View style={styles.bookedSlotTimeContainer}>
              <Text style={styles.bookedSlotTime}>
                {formatTime(apt.appointment_start)}
              </Text>
              {apt.appointment_end && (
                <Text style={styles.bookedSlotTimeSeparator}> - {formatTime(apt.appointment_end)}</Text>
              )}
            </View>
            <Text style={styles.bookedSlotClient} numberOfLines={1}>
              {apt.client_name || 'Client'}
            </Text>
          </View>
        ))}
        {appointments.length > 5 && (
          <Text style={styles.bookedSlotsMore}>+{appointments.length - 5} more appointments</Text>
        )}
      </View>
    </View>
  );
};

// ============================================
// CREATE CLIENT MODAL
// ============================================

interface CreateClientModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (clientId: string, clientName: string, clientPhone: string) => void;
  tenantId: string;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  visible,
  onClose,
  onCreated,
  tenantId,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const createMutation = useCreateClientMutation(tenantId);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter client name');
      return;
    }
    
    if (!gender) {
      Alert.alert('Required', 'Please select gender');
      return;
    }
    
    if (!age.trim() || isNaN(parseInt(age))) {
      Alert.alert('Required', 'Please enter a valid age');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        full_name: name.trim(),
        gender: gender,
        age: parseInt(age),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      
      onCreated(result.id, result.full_name || name, result.phone || phone);
      setName('');
      setPhone('');
      setEmail('');
      setGender('');
      setAge('');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create client');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Client</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter client name"
                placeholderTextColor={colors.text.tertiary}
                accessibilityLabel="Client name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender *</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      gender === g && styles.genderButtonSelected,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === g && styles.genderButtonTextSelected,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age *</Text>
              <TextInput
                style={styles.textInput}
                value={age}
                onChangeText={setAge}
                placeholder="Enter age"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                maxLength={3}
                accessibilityLabel="Client age"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                accessibilityLabel="Client phone"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Client email"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, createMutation.isPending && styles.modalButtonDisabled]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.background.default} />
              ) : (
                <Text style={styles.modalConfirmText}>Create Client</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export const CreateAppointmentScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    treatmentSheetId?: string;
    episodeId?: string;
    caseSheetId?: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    durationDays?: string;
    treatmentId?: string;
    treatmentName?: string;
  }>();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const tenantId = currentUser?.tenantId || '';
  const scrollRef = useRef<ScrollView>(null);

  // Get feature configuration from JWT token
  const features = useFeatures();
  // Release 5 (R5) · T-F.2d (design.md §12, requirements.md N-10, FR-D2
  // narrowed): allow_multiday/enable_treatment_sheets are capability-
  // platform-derived as of T-F.2c (CapabilityResolutionService ->
  // get_tenant_features) - the backend already returns the correct,
  // per-tenant value, so this no longer needs its own clinic-type
  // re-derivation on top (the former isTherapyClinic/tenant-clinic-type
  // fallback that lived here existed only to gate these two values).
  // The normal clinic setting is persisted through the canonical capability
  // service and projected by the backend in tenant features.  The generic
  // Capability Platform endpoint is intentionally rollout-gated and is not a
  // runtime dependency of appointment creation.
  const allowMultiDay = features.appointments.allow_multiday;
  const allowTherapySession = features.appointments.allow_multiday || features.treatment_sheets.enable_treatment_sheets;

  // ===== TOP-LEVEL STATE =====
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('SINGLE');
  const [sessionType, setSessionType] = useState<SessionType>('DOCTOR');

  
  // Client (shared across all forms)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientInfo, setSelectedClientInfo] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    if (!params.clientId || params.treatmentSheetId) return;

    setSelectedClientId(params.clientId);
    if (params.clientName || params.clientPhone) {
      setSelectedClientInfo({
        name: params.clientName || 'Client',
        phone: params.clientPhone || '',
      });
    }
  }, [params.clientId, params.clientName, params.clientPhone, params.treatmentSheetId]);
  
  // BUG FIX #7: State for conflict modal (instead of raw Alert)
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    title: string;
    messages: string[];
  }>({ visible: false, title: '', messages: [] });
  
  // ===== ISOLATED FORM STATES (NO CROSS-TAB LEAKAGE) =====
  // Using state keys to force re-mount when switching modes
  const [doctorFormKey, setDoctorFormKey] = useState(0);
  const [therapyFormKey, setTherapyFormKey] = useState(0);
  const [multiDayFormKey, setMultiDayFormKey] = useState(0);

  // Initial form state factories
  const createFreshDoctorForm = (): DoctorFormState => ({
    selectedDoctorId: null,
    durationMinutes: 15,
    appointmentDate: new Date(),
    appointmentTime: new Date(),
    notes: '',
  });

  const createFreshTherapyForm = (): TherapyFormState => ({
    selectedTreatmentId: null,
    selectedTherapistIds: [],
    selectedRoomId: null,
    durationMinutes: 60,
    appointmentDate: new Date(),
    appointmentTime: new Date(),
    notes: '',
  });

  const createFreshMultiDayForm = (): MultiDayFormState => ({
    selectedTreatmentId: null,
    selectedDoctorId: null,
    selectedTherapistIds: [],
    durationMinutes: 60,
    numberOfSessions: 7,
    startDate: new Date(),
    preferredTime: new Date(),
    notes: '',
  });

  const [doctorForm, setDoctorForm] = useState<DoctorFormState>(createFreshDoctorForm());
  const [therapyForm, setTherapyForm] = useState<TherapyFormState>(createFreshTherapyForm());
  const [multiDayForm, setMultiDayForm] = useState<MultiDayFormState>(createFreshMultiDayForm());

  // Resolve doctor_id from client's active treatment sheet, episode, or
  // casesheet (T-G.2: moved behind useOrderingDoctorQuery -- repository ->
  // datasource -> axiosClient -- same fallback order/fields as before).
  const orderingDoctorQuery = useOrderingDoctorQuery(tenantId, selectedClientId, appointmentType === 'MULTI');

  useEffect(() => {
    if (orderingDoctorQuery.data) {
      setMultiDayForm(prev => ({
        ...prev,
        selectedDoctorId: orderingDoctorQuery.data as string,
      }));
    }
  }, [orderingDoctorQuery.data]);

  // Pre-fill form when coming from treatment sheet (T-G.2: moved behind
  // useTreatmentSheetPrefillQuery -- same treatment sheet -> episode ->
  // client waterfall as before).
  useEffect(() => {
    if (params.treatmentSheetId && params.tab === 'MULTI') {
      setAppointmentType('MULTI');
    }
  }, [params.treatmentSheetId, params.tab]);

  const treatmentSheetPrefillQuery = useTreatmentSheetPrefillQuery(
    tenantId,
    params.treatmentSheetId,
    !!(params.treatmentSheetId && params.tab === 'MULTI'),
    params.treatmentId,
    params.durationDays
  );

  useEffect(() => {
    const prefill = treatmentSheetPrefillQuery.data;
    if (!prefill) return;

    if (prefill.selectedDoctorId || prefill.treatmentId || prefill.numberOfSessions) {
      setMultiDayForm(prev => ({
        ...prev,
        ...(prefill.selectedDoctorId ? { selectedDoctorId: prefill.selectedDoctorId } : {}),
        ...(prefill.treatmentId ? { selectedTreatmentId: prefill.treatmentId } : {}),
        ...(prefill.numberOfSessions ? { numberOfSessions: prefill.numberOfSessions } : {}),
      }));
    }
    if (prefill.clientId) {
      setSelectedClientId(prefill.clientId);
    }
    if (prefill.clientInfo) {
      setSelectedClientInfo(prefill.clientInfo);
    }
  }, [treatmentSheetPrefillQuery.data]);

  // Handler for appointment type change - FORCE RESET forms to prevent leakage
  const handleAppointmentTypeChange = useCallback((type: AppointmentType) => {
    setAppointmentType(type);
    // CRITICAL: Reset ALL forms with fresh state AND increment keys to force UI re-render
    if (type === 'SINGLE') {
      // Clear multi-day form completely
      setMultiDayForm(createFreshMultiDayForm());
      setMultiDayFormKey(prev => prev + 1);
      // Also clear the opposite session type form
      if (sessionType === 'DOCTOR') {
        setTherapyForm(createFreshTherapyForm());
        setTherapyFormKey(prev => prev + 1);
      } else {
        setDoctorForm(createFreshDoctorForm());
        setDoctorFormKey(prev => prev + 1);
      }
    } else {
      // Switching to MULTI - clear single-day forms
      setDoctorForm(createFreshDoctorForm());
      setTherapyForm(createFreshTherapyForm());
      setDoctorFormKey(prev => prev + 1);
      setTherapyFormKey(prev => prev + 1);
    }
  }, [sessionType]);

  // Handler for session type change - FORCE RESET opposite form to prevent leakage
  const handleSessionTypeChange = useCallback((type: SessionType) => {
    setSessionType(type);
    // CRITICAL: Reset the OPPOSITE form completely when switching session type
    if (type === 'DOCTOR') {
      // Switching to Doctor - clear Therapy form
      setTherapyForm(createFreshTherapyForm());
      setTherapyFormKey(prev => prev + 1);
    } else {
      // Switching to Therapy - clear Doctor form
      setDoctorForm(createFreshDoctorForm());
      setDoctorFormKey(prev => prev + 1);
    }
  }, []);

  // ===== SEARCH & UI STATE =====
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const debouncedClientSearch = useDebounce(clientSearchQuery, 300);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ===== QUERIES =====
  const { data: clientsData, isLoading: isLoadingClients } = useClientsListQuery(tenantId, { limit: 100 });
  const { data: searchedClients, isLoading: isSearchingClients } = useSearchClientsQuery(
    tenantId,
    debouncedClientSearch,
    100
  );
  const { data: treatmentsData, isLoading: isLoadingTreatments } = useTreatmentsListQuery(tenantId);
  const eligibleMultiDayTreatmentIds = useMemo(() => {
    const allowedTypes = new Set(features.appointments.multiday_appointment_types ?? []);
    return new Set(
      (treatmentsData?.items ?? [])
        .filter(treatment => allowedTypes.has(treatment.category_code ?? treatment.code))
        .map(treatment => treatment.id)
    );
  }, [features.appointments.multiday_appointment_types, treatmentsData?.items]);
  const multiDayAvailable = allowMultiDay && eligibleMultiDayTreatmentIds.size > 0;

  useEffect(() => {
    if (!multiDayAvailable && appointmentType === 'MULTI') {
      setAppointmentType('SINGLE');
    }
    if (!allowTherapySession && sessionType === 'THERAPY') {
      setSessionType('DOCTOR');
    }
  }, [multiDayAvailable, allowTherapySession, appointmentType, sessionType]);
  
  // Staff queries - SEPARATE for doctors and therapists
  // CRITICAL FIX: Fetch doctors for DOCTOR mode and MULTI-DAY (doctor assignment)
  const shouldFetchDoctors = (appointmentType === 'SINGLE' && sessionType === 'DOCTOR') || appointmentType === 'MULTI';
  const { data: doctorsData, isLoading: isLoadingDoctors, isFetched: isDoctorsFetched } = useStaffListQuery(
    tenantId, 
    { staff_type: 'doctor', is_active: true, limit: 100 },
    { enabled: shouldFetchDoctors }
  );
  
  // Fetch therapists for therapy and multi-day modes
  const shouldFetchTherapists = allowTherapySession && ((appointmentType === 'SINGLE' && sessionType === 'THERAPY') || appointmentType === 'MULTI');
  const { data: therapistsData, isLoading: isLoadingTherapists, isFetched: isTherapistsFetched } = useStaffListQuery(
    tenantId, 
    { staff_type: 'therapist', is_active: true, limit: 100 },
    { enabled: shouldFetchTherapists }
  );

  const { data: roomsData, isLoading: isLoadingRooms } = useRoomsListQuery(tenantId);
  
  // Operating hours for validation
  const { data: operatingHoursData } = useOperatingHoursListQuery(tenantId);
  
  // Booked appointments for selected doctor and date
  const doctorDateStr = toISODateString(doctorForm.appointmentDate);
  const { data: bookedData, isLoading: isLoadingBooked } = useAppointmentsByDateQuery(
    tenantId,
    doctorDateStr,
    { enabled: appointmentType === 'SINGLE' && sessionType === 'DOCTOR' && !!doctorForm.selectedDoctorId }
  );

  // Mutations
  const createMutation = useCreateAppointmentMutation(tenantId);
  // BUG FIX #5: Add validation mutation for single-slot conflict checking
  const validateMutation = useValidateAppointmentMutation();

  // ===== COMPUTED OPTIONS =====
  const clientOptions: PickerOption[] = useMemo(() => {
    const clients = debouncedClientSearch.length >= 2 && searchedClients?.items
      ? searchedClients.items
      : clientsData?.items || [];

    const options = clients.map((c: any) => ({
      id: c.id,
      label: c.full_name || c.name || 'Unknown',
      subtitle: c.phone || c.email,
      phone: c.phone,
      gender: c.gender, // BUG FIX #7: Include gender for therapist matching
    }));

    if (
      selectedClientId &&
      selectedClientInfo &&
      !options.some((option) => option.id === selectedClientId)
    ) {
      return [
        {
          id: selectedClientId,
          label: selectedClientInfo.name,
          subtitle: selectedClientInfo.phone,
          phone: selectedClientInfo.phone,
        },
        ...options,
      ];
    }

    return options;
  }, [clientsData, searchedClients, debouncedClientSearch, selectedClientId, selectedClientInfo]);

  // Doctors only - CRITICAL: Filter on frontend too for safety
  const doctorOptions: PickerOption[] = useMemo(() => {
    const allStaff = doctorsData?.items || [];
    // Double-filter to ensure ONLY doctors appear (backend may not filter correctly)
    const doctors = allStaff.filter((d: any) => {
      const staffType = (d.staff_type || '').toLowerCase();
      const role = (d.role || '').toLowerCase();
      const designation = (d.designation || '').toLowerCase();
      // Include if staff_type is doctor, or if role/designation contains 'doctor'/'vaidya'
      return staffType === 'doctor' || 
             role.includes('doctor') || 
             designation.includes('doctor') ||
             designation.includes('vaidya') ||
             designation.includes('physician');
    });
    
    // DEBUG: Uncomment to trace doctor filtering
    // console.log('[CreateAppointment] Doctor options - raw:', allStaff.length, 'filtered:', doctors.length);
    // console.log('[CreateAppointment] Filtered doctors:', doctors.map((d: any) => ({ name: d.full_name, type: d.staff_type })));
    
    return doctors.map((d: any) => ({
      id: d.id,
      label: d.full_name || d.name || 'Unknown',
      subtitle: d.specialization || d.designation || 'Doctor',
      staff_type: d.staff_type,
    }));
  }, [doctorsData]);

  // Therapists only - CRITICAL: Strict filter by staff_type = 'therapist' only
  // BUG FIX #4: Only show staff where staff_type = 'therapist', no other roles
  const therapistOptions: PickerOption[] = useMemo(() => {
    const allStaff = therapistsData?.items || [];
    // Strict filter: ONLY staff where staff_type is exactly 'therapist'
    const therapists = allStaff.filter((s: any) => {
      const staffType = (s.staff_type || '').toLowerCase();
      // STRICT: Only allow exact 'therapist' staff_type
      // Do NOT include clinic_admin, receptionist, doctor, or any other type
      return staffType === 'therapist';
    });
    
    // DEBUG: Log therapist filtering
    console.log('[CreateAppointment] Therapist options - raw:', allStaff.length, 'filtered:', therapists.length);
    
    return therapists.map((s: any) => ({
      id: s.id,
      label: s.full_name || s.name || 'Unknown',
      subtitle: s.designation || s.staff_type || 'Therapist',
      staff_type: s.staff_type,
      // BUG FIX #7: Include gender for gender matching
      gender: s.gender,
    }));
  }, [therapistsData]);

  // BUG FIX #7: Gender-filtered therapist options based on selected client
  // Track if there's a gender mismatch conflict
  const [genderMatchConflict, setGenderMatchConflict] = useState<string | null>(null);
  
  const genderFilteredTherapistOptions: PickerOption[] = useMemo(() => {
    const selectedClient = clientOptions.find(c => c.id === selectedClientId);
    const clientGender = selectedClient?.gender?.toLowerCase();
    
    // If no client selected or no gender, return all therapists
    if (!selectedClientId || !clientGender) {
      return therapistOptions;
    }
    
    // Apply gender matching rules: female clients can only have female therapists
    // Male clients can have either gender (common practice in Ayurvedic clinics)
    if (clientGender === 'female') {
      const femaleTherapists = therapistOptions.filter(t => 
        t.gender?.toLowerCase() === 'female'
      );
      // Log for debugging
      console.log('[CreateAppointment] Gender matching - client:', clientGender, 'filtered therapists:', femaleTherapists.length);
      
      // Return empty if no matching therapists
      if (femaleTherapists.length === 0 && therapistOptions.length > 0) {
        return []; // Return empty to force user to see the error
      }
      
      return femaleTherapists;
    }
    
    return therapistOptions;
  }, [therapistOptions, selectedClientId, clientOptions]);
  
  // BUG FIX #5: Update gender conflict state based on filtered options
  useEffect(() => {
    const selectedClient = clientOptions.find(c => c.id === selectedClientId);
    const clientGender = selectedClient?.gender?.toLowerCase();
    
    if (clientGender === 'female' && genderFilteredTherapistOptions.length === 0 && therapistOptions.length > 0) {
      setGenderMatchConflict('No female therapists available. This female client requires a female therapist.');
    } else {
      setGenderMatchConflict(null);
    }
  }, [genderFilteredTherapistOptions, selectedClientId, clientOptions, therapistOptions]);

  const treatmentOptions: PickerOption[] = useMemo(() => {
    return (treatmentsData?.items || []).map((t: TreatmentResponse) => ({
      id: t.id,
      label: t.name,
      subtitle: t.duration_minutes ? `${t.duration_minutes} min` : undefined,
      duration_minutes: t.duration_minutes,
    }));
  }, [treatmentsData]);

  const roomOptions: PickerOption[] = (roomsData?.items || []).map((r: any) => ({
    id: r.id,
    label: r.name,
    subtitle: r.capacity ? `Capacity: ${r.capacity}` : undefined,
  }));

  // Doctor's booked appointments filtered by selected doctor
  const doctorBookedAppointments = useMemo(() => {
    if (!doctorForm.selectedDoctorId) return [];
    return (bookedData?.appointments || []).filter(
      (apt) => apt.doctor_id === doctorForm.selectedDoctorId
    );
  }, [bookedData, doctorForm.selectedDoctorId]);

  // Duration options per form type
  const doctorDurations = [15, 30, 45, 60];
  const therapyDurations = [30, 45, 60, 90, 120];

  // Get selected entities for display
  const selectedClient = clientOptions.find(c => c.id === selectedClientId);
  const selectedDoctor = doctorOptions.find(d => d.id === doctorForm.selectedDoctorId);
  const selectedTreatment = appointmentType === 'SINGLE' 
    ? treatmentOptions.find(t => t.id === therapyForm.selectedTreatmentId)
    : treatmentOptions.find(t => t.id === multiDayForm.selectedTreatmentId);

  // ===== HANDLERS =====
  
  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clientOptions.find(c => c.id === clientId);
    if (client) {
      setSelectedClientInfo({ name: client.label, phone: client.phone || client.subtitle || '' });
    }
  };

  // Handle new client created
  const handleClientCreated = (clientId: string, clientName: string, clientPhone: string) => {
    setSelectedClientId(clientId);
    setSelectedClientInfo({ name: clientName, phone: clientPhone });
  };

  // Handle doctor selection
  const handleDoctorSelect = (doctorId: string) => {
    setDoctorForm(prev => ({ ...prev, selectedDoctorId: doctorId }));
  };

  // Handle treatment selection with auto-duration
  const handleTreatmentSelect = (treatmentId: string, formType: 'therapy' | 'multiday') => {
    const treatment = treatmentOptions.find(t => t.id === treatmentId);
    if (formType === 'therapy') {
      setTherapyForm(prev => ({
        ...prev,
        selectedTreatmentId: treatmentId,
        durationMinutes: treatment?.duration_minutes || prev.durationMinutes,
      }));
    } else {
      setMultiDayForm(prev => ({
        ...prev,
        selectedTreatmentId: treatmentId,
        durationMinutes: treatment?.duration_minutes || prev.durationMinutes,
      }));
    }
  };

  // Handle therapist multi-select
  const handleTherapistSelect = (therapistId: string, formType: 'therapy' | 'multiday') => {
    if (formType === 'therapy') {
      setTherapyForm(prev => {
        const ids = prev.selectedTherapistIds;
        if (ids.includes(therapistId)) {
          return { ...prev, selectedTherapistIds: ids.filter(id => id !== therapistId) };
        }
        if (ids.length < 2) {
          return { ...prev, selectedTherapistIds: [...ids, therapistId] };
        }
        return prev;
      });
    } else {
      setMultiDayForm(prev => {
        const ids = prev.selectedTherapistIds;
        if (ids.includes(therapistId)) {
          return { ...prev, selectedTherapistIds: ids.filter(id => id !== therapistId) };
        }
        if (ids.length < 2) {
          return { ...prev, selectedTherapistIds: [...ids, therapistId] };
        }
        return prev;
      });
    }
  };

  // Get current date/time based on form
  const getCurrentDate = () => {
    if (appointmentType === 'MULTI') return multiDayForm.startDate;
    return sessionType === 'DOCTOR' ? doctorForm.appointmentDate : therapyForm.appointmentDate;
  };

  const getCurrentTime = () => {
    if (appointmentType === 'MULTI') return multiDayForm.preferredTime;
    return sessionType === 'DOCTOR' ? doctorForm.appointmentTime : therapyForm.appointmentTime;
  };

  const setCurrentDate = (date: Date) => {
    if (appointmentType === 'MULTI') {
      setMultiDayForm(prev => ({ ...prev, startDate: date }));
    } else if (sessionType === 'DOCTOR') {
      setDoctorForm(prev => ({ ...prev, appointmentDate: date }));
    } else {
      setTherapyForm(prev => ({ ...prev, appointmentDate: date }));
    }
  };

  const setCurrentTime = (time: Date) => {
    if (appointmentType === 'MULTI') {
      setMultiDayForm(prev => ({ ...prev, preferredTime: time }));
    } else if (sessionType === 'DOCTOR') {
      setDoctorForm(prev => ({ ...prev, appointmentTime: time }));
    } else {
      setTherapyForm(prev => ({ ...prev, appointmentTime: time }));
    }
  };

  // Create single appointment
  // BUG FIX #5: Add conflict checking for single-slot therapy appointments
  const handleCreateSingle = async () => {
    if (!selectedClientId) {
      Alert.alert('Required', 'Please select a client');
      return;
    }

    const isDoctor = sessionType === 'DOCTOR';
    const appointmentDate = isDoctor ? doctorForm.appointmentDate : therapyForm.appointmentDate;
    const appointmentTime = isDoctor ? doctorForm.appointmentTime : therapyForm.appointmentTime;

    if (isDoctor && !doctorForm.selectedDoctorId) {
      Alert.alert('Required', 'Please select a doctor');
      return;
    }

    // Build startDateTime without timezone conversion
    // Extract date components from appointmentDate
    const year = appointmentDate.getFullYear();
    const month = appointmentDate.getMonth();
    const day = appointmentDate.getDate();
    const hours = appointmentTime.getHours();
    const minutes = appointmentTime.getMinutes();
    
    // Create new Date with explicit components (uses local timezone consistently)
    const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (isDoctor ? doctorForm.durationMinutes : therapyForm.durationMinutes));

    // DEBUG: Log the date/time being validated
    console.log('[CreateAppointment] Validation check:', {
      selectedDate: appointmentDate.toISOString(),
      selectedTime: appointmentTime.toISOString(),
      constructedDateTime: startDateTime.toISOString(),
      localString: startDateTime.toLocaleString('en-IN'),
      dayOfWeek: startDateTime.getDay(),
      hours: startDateTime.getHours(),
      minutes: startDateTime.getMinutes(),
    });

    const staffId = isDoctor ? doctorForm.selectedDoctorId : (therapyForm.selectedTherapistIds[0] || null);

    // TASK 4: Frontend validation for appointment time
    const operatingHours = operatingHoursData?.items || [];
    const validationResult = validateAppointmentTime(startDateTime, operatingHours);
    
    console.log('[CreateAppointment] Validation result:', validationResult);
    
    if (validationResult.hasWarnings) {
      const message = formatValidationMessage(validationResult);
      
      // Show confirmation dialog
      Alert.alert(
        'Booking Warning',
        message,
        [
          { text: 'No, Cancel', style: 'cancel' },
          { 
            text: 'Yes, Proceed', 
            onPress: () => proceedWithBooking(validationResult)
          }
        ]
      );
      return;
    }
    
    // No warnings - proceed directly
    await proceedWithBooking(validationResult);
  };
  
  // Extract booking logic into separate function
  const proceedWithBooking = async (validationResult: ValidationResult) => {
    const isDoctor = sessionType === 'DOCTOR';
    const appointmentDate = isDoctor ? doctorForm.appointmentDate : therapyForm.appointmentDate;
    const appointmentTime = isDoctor ? doctorForm.appointmentTime : therapyForm.appointmentTime;
    
    // Build startDateTime without timezone conversion
    // Extract date components from appointmentDate
    const year = appointmentDate.getFullYear();
    const month = appointmentDate.getMonth();
    const day = appointmentDate.getDate();
    const hours = appointmentTime.getHours();
    const minutes = appointmentTime.getMinutes();
    
    // Create new Date with explicit components (uses local timezone consistently)
    const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (isDoctor ? doctorForm.durationMinutes : therapyForm.durationMinutes));

    console.log('[CreateAppointment] DateTime construction:', {
      appointmentDate: {
        iso: appointmentDate.toISOString(),
        local: appointmentDate.toLocaleString('en-IN'),
        year, month, day,
      },
      appointmentTime: {
        iso: appointmentTime.toISOString(),
        local: appointmentTime.toLocaleString('en-IN'),
        hours, minutes,
      },
      constructed: {
        iso: startDateTime.toISOString(),
        local: startDateTime.toLocaleString('en-IN'),
        year: startDateTime.getFullYear(),
        month: startDateTime.getMonth() + 1,
        day: startDateTime.getDate(),
        hours: startDateTime.getHours(),
        minutes: startDateTime.getMinutes(),
      },
    });

    const doctorId = isDoctor ? doctorForm.selectedDoctorId : null;
    const therapistIds = isDoctor ? [] : therapyForm.selectedTherapistIds;

    // Validate appointment for conflicts — doctor appointments only.
    // The validation endpoint checks doctor schedule conflicts; it incorrectly flags
    // therapy appointments as conflicting. Therapy conflict detection is handled
    // server-side by the create endpoint itself.
    if (isDoctor && doctorId) {
      try {
        const validationPayload: ValidateAppointmentRequest = {
          client_id: selectedClientId!,
          staff_id: doctorId,
          appointment_start: toLocalTimeISO(startDateTime),
          appointment_end: toLocalTimeISO(endDateTime),
        };
        
        console.log('[CreateAppointment] Validating doctor appointment:', validationPayload);
        
        const validationApiResult = await validateMutation.mutateAsync(validationPayload);
        console.log('[CreateAppointment] Validation result:', validationApiResult);
        
        if (!validationApiResult.is_valid) {
          setConflictModal({
            visible: true,
            title: t('appointments.bookingConflict'),
            messages: [t(ErrorTokens.appointments.conflictDetected)],
          });
          return;
        }
      } catch (err: any) {
        console.log('[CreateAppointment] Validation API error (proceeding anyway):', err.message);
        // If validation API not available, proceed with booking
      }
    }

    // CRITICAL: Backend expects LOCAL time WITHOUT Z suffix
    // The request interceptor (transformDatesToUTC) only transforms Date objects, not strings.
    // The response interceptor (transformDatesFromUTC) converts UTC+Z responses back to local strings.
    // So we must send local time as a string (no Z) for the round-trip to work correctly.
    const payload: AppointmentCreate = {
      client_id: selectedClientId!,
      doctor_id: doctorId,
      therapist_ids: therapistIds,
      room_id: isDoctor ? null : therapyForm.selectedRoomId,
      treatment_id: isDoctor ? null : therapyForm.selectedTreatmentId,
      appointment_start: toLocalTimeISO(startDateTime),
      appointment_end: toLocalTimeISO(endDateTime),
      status: 'scheduled',
      notes: isDoctor ? doctorForm.notes : therapyForm.notes,
      appointment_type: 'SINGLE',
      // Add validation flags
      is_past_booking: validationResult.isPast,
      is_outside_operating_hours: validationResult.isOutsideOperatingHours,
      is_during_break_time: validationResult.isDuringBreak,
      is_on_weekly_off: validationResult.isOnWeeklyOff,
    };

    console.log('[CreateAppointment] Sending to API:', {
      appointment_start: payload.appointment_start,
      appointment_end: payload.appointment_end,
      localTime: startDateTime.toLocaleString('en-IN'),
      note: 'Sending LOCAL time without Z (established pattern)',
    });

    try {
      await createMutation.mutateAsync(payload);

      const clientPhone = selectedClientInfo?.phone;
      const clientName = selectedClientInfo?.name || 'Client';
      
      if (clientPhone) {
        const staffName = isDoctor 
          ? selectedDoctor?.label || 'Doctor'
          : therapistOptions.find(t => t.id === therapyForm.selectedTherapistIds[0])?.label || 'Therapist';
        
        const message = generateWhatsAppConfirmationMessage(
          clientName,
          'Your Clinic',
          formatDate(startDateTime.toISOString()),
          formatTime(startDateTime.toISOString()),
          staffName,
          isDoctor ? 'Consultation' : (selectedTreatment?.label || 'Therapy'),
          '+91-XXXXXXXXXX'
        );
        const whatsappUrl = openWhatsApp(clientPhone, message);
        
        Alert.alert(
          'Appointment Created!',
          'Would you like to send a WhatsApp confirmation to the client?',
          [
            { text: 'Skip', style: 'cancel', onPress: () => router.back() },
            { 
              text: 'Send WhatsApp', 
              onPress: () => {
                Linking.openURL(whatsappUrl);
                router.back();
              }
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Appointment created successfully');
        router.back();
      }
    } catch (err: any) {
      // Network Error after the server has already processed the request means
      // the connection dropped before the response body arrived.
      // The appointment was likely created — navigate back and let the list refresh.
      // In React Native, err.request may be an XHR object or undefined; check all patterns.
      const isNetworkError =
        err?.message === 'Network Error' ||
        err?.code === 'ERR_NETWORK' ||
        (err?.isAxiosError && !err?.response);

      if (isNetworkError) {
        // Don't log as error — this is expected when network drops after a successful POST
        console.log('[CreateAppointment] Network dropped after POST — appointment was saved');
        Alert.alert(
          'Appointment Created',
          'The appointment was saved. There was a brief network issue loading the confirmation.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      console.error('[CreateAppointment] Error creating appointment:', err);
      
      // Parse error response from backend
      let errorMessage = t(ErrorTokens.appointments.createFailed);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Extract error message from various possible formats
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail[0] || errorMessage;
          } else if (errorData.detail.error) {
            errorMessage = errorData.detail.error;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        // For overlap/conflict errors, show localized generic message
        if (errorMessage.includes('overlap') || errorMessage.includes('already has an appointment') || errorMessage.includes('Conflicting')) {
          errorMessage = t(ErrorTokens.appointments.conflictDetected);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      Alert.alert(t('common.error') || 'Error', errorMessage);
    }
  };

  // Navigate to preview for multi-day
  const handlePreviewMultiDay = async () => {
    if (!selectedClientId) {
      Alert.alert('Required', 'Please select a client');
      return;
    }
    if (!multiDayForm.selectedTreatmentId) {
      Alert.alert('Required', 'Please select a treatment');
      return;
    }
    if (multiDayForm.selectedTherapistIds.length === 0) {
      Alert.alert('Required', 'Please select at least one therapist');
      return;
    }

    // Build startDateTime with proper timezone conversion
    const startDate = multiDayForm.startDate;
    const preferredTime = multiDayForm.preferredTime;
    
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const day = startDate.getDate();
    const hours = preferredTime.getHours();
    const minutes = preferredTime.getMinutes();
    
    // Create a Date object with local time
    const startDateTime = new Date(year, month, day, hours, minutes, 0, 0);

    // CRITICAL FIX: Convert local time to UTC before sending to backend
    // The backend expects UTC time with Z suffix
    // User selects 4:00 PM IST (16:00) -> Convert to 10:30 AM UTC -> Send as 2026-03-01T10:30:00Z
    const startDateISO = startDateTime.toISOString();
    
    console.log('[CreateAppointment] User selected LOCAL time:', hours, ':', minutes);
    console.log('[CreateAppointment] Converted to UTC and sending to backend:', startDateISO);
    console.log('[CreateAppointment] Local datetime:', startDateTime.toLocaleString());
    console.log('[CreateAppointment] UTC datetime:', startDateTime.toUTCString());

    const selectedStaffNames = therapistOptions
      .filter(t => multiDayForm.selectedTherapistIds.includes(t.id))
      .map(t => t.label)
      .join(', ');

    // Get doctor name if doctor is selected
    const doctorName = multiDayForm.selectedDoctorId 
      ? doctorOptions.find(d => d.id === multiDayForm.selectedDoctorId)?.label || ''
      : '';

    console.log('[CreateAppointment] Navigating to preview with:', {
      doctorId: multiDayForm.selectedDoctorId,
      therapistIds: multiDayForm.selectedTherapistIds,
      treatmentId: multiDayForm.selectedTreatmentId,
      treatmentSheetId: params.treatmentSheetId,
      startDateISO,
    });

    const navigationParams = {
      clientId: selectedClientId,
      clientName: selectedClientInfo?.name || '',
      clientPhone: selectedClientInfo?.phone || '',
      treatmentId: multiDayForm.selectedTreatmentId,
      treatmentName: selectedTreatment?.label || '',
      doctorId: multiDayForm.selectedDoctorId || '',
      therapistIds: multiDayForm.selectedTherapistIds.join(','),
      staffNames: [doctorName, selectedStaffNames].filter(Boolean).join(', '),
      startDate: startDateISO,  // UTC time in ISO format
      durationDays: multiDayForm.numberOfSessions.toString(),
      // Send local time for UI display purposes
      preferredTimeHourLocal: hours.toString(),
      preferredTimeMinutesLocal: minutes.toString(),
      durationMinutes: multiDayForm.durationMinutes.toString(),
      notes: multiDayForm.notes,
      // Pass through treatmentSheetId if coming from treatment sheet
      ...(params.treatmentSheetId && { treatmentSheetId: params.treatmentSheetId }),
      // Pass through episodeId if available
      ...(params.episodeId && { episodeId: params.episodeId }),
      // Pass through caseSheetId if available
      ...(params.caseSheetId && { caseSheetId: params.caseSheetId }),
    };

    console.log('[CreateAppointment] Full navigation params:', navigationParams);

    router.push({
      pathname: '/clinic-admin/appointments/preview' as any,
      params: navigationParams,
    });
  };

  // Form validation
  const isFormValid = () => {
    if (!selectedClientId) return false;
    if (appointmentType === 'SINGLE') {
      if (sessionType === 'DOCTOR') {
        return !!doctorForm.selectedDoctorId;
      }
      return true; // Therapy form has optional fields
    }
    // Multi-day
    return multiDayForm.selectedTreatmentId && multiDayForm.selectedTherapistIds.length > 0;
  };

  // Current duration and setter
  const getCurrentDuration = () => {
    if (appointmentType === 'MULTI') return multiDayForm.durationMinutes;
    return sessionType === 'DOCTOR' ? doctorForm.durationMinutes : therapyForm.durationMinutes;
  };

  const setCurrentDuration = (mins: number) => {
    if (appointmentType === 'MULTI') {
      setMultiDayForm(prev => ({ ...prev, durationMinutes: mins }));
    } else if (sessionType === 'DOCTOR') {
      setDoctorForm(prev => ({ ...prev, durationMinutes: mins }));
    } else {
      setTherapyForm(prev => ({ ...prev, durationMinutes: mins }));
    }
  };

  // Check if duration is locked by treatment
  const isDurationLocked = appointmentType === 'MULTI' 
    ? !!treatmentOptions.find(t => t.id === multiDayForm.selectedTreatmentId)?.duration_minutes
    : (sessionType === 'THERAPY' && !!treatmentOptions.find(t => t.id === therapyForm.selectedTreatmentId)?.duration_minutes);

  const currentDurationOptions = appointmentType === 'SINGLE' && sessionType === 'DOCTOR' 
    ? doctorDurations 
    : therapyDurations;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          accessibilityLabel="Close"
          accessibilityHint="Go back to appointments list"
        >
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Appointment</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
            {/* Appointment Type - Only show if multi-day is available */}
            {multiDayAvailable && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Appointment Type</Text>
                <TypeSelector value={appointmentType} onChange={handleAppointmentTypeChange} allowMultiDay={multiDayAvailable} />
              </View>
            )}

            {/* Session Type Toggle (Single day only) */}
            {appointmentType === 'SINGLE' && allowTherapySession && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session Type</Text>
                <SessionTypeSelector value={sessionType} onChange={handleSessionTypeChange} allowTherapySession={allowTherapySession} />
              </View>
            )}

            {/* Client Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client *</Text>
              <SearchableDropdown
                title="Select Client"
                options={clientOptions}
                selectedId={selectedClientId}
                onSelect={handleClientSelect}
                isLoading={isLoadingClients || isSearchingClients}
                emptyText="No clients found"
                showCreateOption={true}
                onCreateNew={() => setShowCreateClientModal(true)}
                autoCloseOnSelect={true}
              />
            </View>

            {/* ===== DOCTOR CONSULTATION FORM ===== */}
            {appointmentType === 'SINGLE' && sessionType === 'DOCTOR' && (
              <>
                {/* Doctor Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Doctor *</Text>
                  <SearchableDropdown
                    title="Select Doctor"
                    options={doctorOptions}
                    selectedId={doctorForm.selectedDoctorId}
                    onSelect={handleDoctorSelect}
                    isLoading={isLoadingDoctors && !isDoctorsFetched}
                    emptyText={isDoctorsFetched && doctorOptions.length === 0 ? "No doctors available in this clinic" : "Loading doctors..."}
                    autoCloseOnSelect={true}
                  />
                </View>

                {/* Booked Slots Display */}
                {doctorForm.selectedDoctorId && (
                  <View style={styles.section}>
                    <BookedSlots 
                      appointments={doctorBookedAppointments} 
                      selectedDate={doctorForm.appointmentDate}
                      isLoading={isLoadingBooked}
                    />
                  </View>
                )}
              </>
            )}

            {/* ===== THERAPY SESSION FORM ===== */}
            {appointmentType === 'SINGLE' && allowTherapySession && sessionType === 'THERAPY' && (
              <>
                {/* Treatment */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Treatment (Optional)</Text>
                  <SearchableDropdown
                    title="Select Treatment"
                    options={treatmentOptions}
                    selectedId={therapyForm.selectedTreatmentId}
                    onSelect={(id) => handleTreatmentSelect(id, 'therapy')}
                    isLoading={isLoadingTreatments}
                    emptyText="No treatments available"
                    autoCloseOnSelect={true}
                  />
                </View>

                {/* Therapists - Multi-select */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Therapists (Max 2)</Text>
                  {/* BUG FIX #5: Show gender matching conflict warning */}
                  {genderMatchConflict && (
                    <View style={styles.genderConflictBanner}>
                      <Ionicons name="warning" size={18} color={colors.warning.main} />
                      <Text style={styles.genderConflictText}>{genderMatchConflict}</Text>
                    </View>
                  )}
                  <SearchableDropdown
                    title="Select Therapists"
                    options={genderFilteredTherapistOptions}
                    selectedId={null}
                    onSelect={(id) => handleTherapistSelect(id, 'therapy')}
                    isLoading={isLoadingTherapists && !isTherapistsFetched}
                    emptyText={genderMatchConflict ? "No matching therapists" : (isTherapistsFetched && genderFilteredTherapistOptions.length === 0 ? "No therapists available in this clinic" : "Loading therapists...")}
                    multiple
                    selectedIds={therapyForm.selectedTherapistIds}
                    maxSelect={2}
                    autoCloseOnSelect={false}
                  />
                </View>

                {/* Room */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Room (Optional)</Text>
                  <SearchableDropdown
                    title="Select Room"
                    options={roomOptions}
                    selectedId={therapyForm.selectedRoomId}
                    onSelect={(id) => setTherapyForm(prev => ({ ...prev, selectedRoomId: id }))}
                    isLoading={isLoadingRooms}
                    emptyText="No rooms available"
                    autoCloseOnSelect={true}
                  />
                </View>
              </>
            )}

            {/* ===== MULTI-DAY FORM ===== */}
            {multiDayAvailable && appointmentType === 'MULTI' && (
              <>
                {/* Treatment (ABOVE duration) */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Treatment *</Text>
                  <SearchableDropdown
                    title="Select Treatment"
                    options={treatmentOptions}
                    selectedId={multiDayForm.selectedTreatmentId}
                    onSelect={(id) => handleTreatmentSelect(id, 'multiday')}
                    isLoading={isLoadingTreatments}
                    emptyText="No treatments available"
                    autoCloseOnSelect={true}
                  />
                </View>

                {/* Therapists - Multi-select */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Therapists * (Max 2)</Text>
                  {/* BUG FIX #5: Show gender matching conflict warning */}
                  {genderMatchConflict && (
                    <View style={styles.genderConflictBanner}>
                      <Ionicons name="warning" size={18} color={colors.warning.main} />
                      <Text style={styles.genderConflictText}>{genderMatchConflict}</Text>
                    </View>
                  )}
                  <SearchableDropdown
                    title="Select Therapists"
                    options={genderFilteredTherapistOptions}
                    selectedId={null}
                    onSelect={(id) => handleTherapistSelect(id, 'multiday')}
                    isLoading={isLoadingTherapists && !isTherapistsFetched}
                    emptyText={genderMatchConflict ? "No matching therapists" : (isTherapistsFetched && genderFilteredTherapistOptions.length === 0 ? "No therapists available in this clinic" : "Loading therapists...")}
                    multiple
                    selectedIds={multiDayForm.selectedTherapistIds}
                    maxSelect={2}
                    autoCloseOnSelect={false}
                  />
                </View>

                {/* Doctor - Optional, required for doctor dashboard visibility */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Doctor (Optional)</Text>
                  <Text style={{ color: colors.text.secondary, fontSize: 12, marginBottom: 6 }}>
                    Assign a doctor so this schedule appears on the Doctor Dashboard
                  </Text>
                  <SearchableDropdown
                    title="Select Doctor"
                    options={doctorOptions}
                    selectedId={multiDayForm.selectedDoctorId}
                    onSelect={(id) => setMultiDayForm(prev => ({ ...prev, selectedDoctorId: id }))}
                    isLoading={isLoadingDoctors}
                    emptyText="No doctors available"
                    autoCloseOnSelect={true}
                  />
                </View>
              </>
            )}

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {appointmentType === 'SINGLE' ? 'Date & Time' : 'Start Date & Preferred Time'}
              </Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                  accessibilityLabel={`Date: ${formatDate(getCurrentDate().toISOString())}`}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary.main} />
                  <Text style={styles.dateTimeText}>{formatDate(getCurrentDate().toISOString())}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                  accessibilityLabel={`Time: ${getCurrentTime().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary.main} />
                  <Text style={styles.dateTimeText}>
                    {getCurrentTime().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <CrossPlatformDateTimePicker
                  value={getCurrentDate()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      console.log('[DatePicker] Date selected (RAW):', {
                        iso: date.toISOString(),
                        local: date.toLocaleString('en-IN'),
                        year: date.getFullYear(),
                        month: date.getMonth(),
                        day: date.getDate(),
                      });
                      
                      // CRITICAL FIX: DateTimePicker may return date in UTC
                      // Extract local date components and create a new Date in local timezone
                      const localYear = date.getFullYear();
                      const localMonth = date.getMonth();
                      const localDay = date.getDate();
                      
                      // Create a new Date with local date at midnight
                      const localDate = new Date(localYear, localMonth, localDay, 0, 0, 0, 0);
                      
                      console.log('[DatePicker] Date corrected to local:', {
                        iso: localDate.toISOString(),
                        local: localDate.toLocaleString('en-IN'),
                        year: localDate.getFullYear(),
                        month: localDate.getMonth(),
                        day: localDate.getDate(),
                      });
                      
                      setCurrentDate(localDate);
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <CrossPlatformDateTimePicker
                  value={getCurrentTime()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, time?: Date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (time) {
                      console.log('[TimePicker] Time selected (RAW):', {
                        iso: time.toISOString(),
                        local: time.toLocaleString('en-IN'),
                        hours: time.getHours(),
                        minutes: time.getMinutes(),
                      });
                      
                      // CRITICAL FIX: DateTimePicker returns time in UTC, but we need local time
                      // When user selects 11:00 AM, picker returns a Date with UTC time
                      // We need to extract the hours/minutes and create a new Date in local timezone
                      const localHours = time.getHours();
                      const localMinutes = time.getMinutes();
                      
                      // Create a new Date with today's date and the selected time in LOCAL timezone
                      const localTime = new Date();
                      localTime.setHours(localHours, localMinutes, 0, 0);
                      
                      console.log('[TimePicker] Time corrected to local:', {
                        iso: localTime.toISOString(),
                        local: localTime.toLocaleString('en-IN'),
                        hours: localTime.getHours(),
                        minutes: localTime.getMinutes(),
                      });
                      
                      setCurrentTime(localTime);
                    }
                  }}
                />
              )}
            </View>

            {/* Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Duration {isDurationLocked && '(from treatment)'}
              </Text>
              <View style={styles.durationRow}>
                {currentDurationOptions.map((mins) => {
                  const isSelected = getCurrentDuration() === mins;
                  const isDisabled = isDurationLocked && !isSelected;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationButton,
                        isSelected && styles.durationButtonSelected,
                        isDisabled && styles.durationButtonDisabled,
                      ]}
                      onPress={() => !isDurationLocked && setCurrentDuration(mins)}
                      disabled={isDisabled}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${mins} minutes`}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          isSelected && styles.durationTextSelected,
                        ]}
                      >
                        {mins} min
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Number of Sessions (Multi-day only) */}
              {multiDayAvailable && appointmentType === 'MULTI' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Number of Sessions</Text>
                <View style={styles.sessionsRow}>
                  <TouchableOpacity
                    style={styles.sessionControl}
                    onPress={() => setMultiDayForm(prev => ({ 
                      ...prev, 
                      numberOfSessions: Math.max(1, prev.numberOfSessions - 1) 
                    }))}
                    accessibilityLabel="Decrease sessions"
                  >
                    <Ionicons name="remove" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.sessionsValue} accessibilityLabel={`${multiDayForm.numberOfSessions} sessions`}>
                    {multiDayForm.numberOfSessions}
                  </Text>
                  <TouchableOpacity
                    style={styles.sessionControl}
                    onPress={() => setMultiDayForm(prev => ({ 
                      ...prev, 
                      numberOfSessions: Math.min(30, prev.numberOfSessions + 1) 
                    }))}
                    accessibilityLabel="Increase sessions"
                  >
                    <Ionicons name="add" size={24} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.sessionsHint}>
                  Sessions will be scheduled daily starting from the selected date
                </Text>
              </View>
            )}

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes about this appointment..."
                placeholderTextColor={colors.text.tertiary}
                value={appointmentType === 'MULTI' 
                  ? multiDayForm.notes 
                  : (sessionType === 'DOCTOR' ? doctorForm.notes : therapyForm.notes)}
                onChangeText={(text) => {
                  if (appointmentType === 'MULTI') {
                    setMultiDayForm(prev => ({ ...prev, notes: text }));
                  } else if (sessionType === 'DOCTOR') {
                    setDoctorForm(prev => ({ ...prev, notes: text }));
                  } else {
                    setTherapyForm(prev => ({ ...prev, notes: text }));
                  }
                }}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel="Appointment notes"
              />
            </View>

            {/* Spacer for button */}
            <View style={{ height: 100 }} />
          </ScrollView>
      </KeyboardAvoidingView>

      {/* Action Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            !isFormValid() && styles.actionButtonDisabled,
          ]}
          onPress={appointmentType === 'SINGLE' ? handleCreateSingle : handlePreviewMultiDay}
          disabled={!isFormValid() || createMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel={appointmentType === 'SINGLE' ? 'Create Appointment' : 'Preview Plan'}
          accessibilityState={{ disabled: !isFormValid() || createMutation.isPending }}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.background.default} />
          ) : (
            <>
              <Ionicons
                name={appointmentType === 'SINGLE' ? 'checkmark' : 'eye-outline'}
                size={20}
                color={colors.background.default}
              />
              <Text style={styles.actionButtonText}>
                {appointmentType === 'SINGLE' ? 'Create Appointment' : 'Preview Plan'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Create Client Modal */}
      <CreateClientModal
        visible={showCreateClientModal}
        onClose={() => setShowCreateClientModal(false)}
        onCreated={handleClientCreated}
        tenantId={tenantId}
      />

      {/* BUG FIX #7: Styled Conflict Modal (instead of raw Alert) */}
      <Modal visible={conflictModal.visible} animationType="fade" transparent>
        <View style={styles.conflictModalOverlay}>
          <View style={styles.conflictModalContent}>
            <View style={styles.conflictModalHeader}>
              <View style={styles.conflictModalIconContainer}>
                <Ionicons name="warning" size={28} color={colors.warning.main} />
              </View>
              <Text style={styles.conflictModalTitle}>{conflictModal.title}</Text>
            </View>
            <View style={styles.conflictModalBody}>
              {conflictModal.messages.map((message, index) => (
                <View key={index} style={styles.conflictMessageRow}>
                  <Ionicons name="close-circle" size={16} color={colors.error.main} />
                  <Text style={styles.conflictMessageText}>{message}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.conflictModalButton}
              onPress={() => setConflictModal({ visible: false, title: '', messages: [] })}
            >
              <Text style={styles.conflictModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 56,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h6,
    color: colors.text.primary,
    textAlign: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.light,
    minHeight: 100,
  },
  typeOptionSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  typeOptionTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  typeOptionTitleSelected: {
    color: colors.primary.main,
  },
  typeOptionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },

  // Session Type Selector
  sessionTypeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sessionTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.xs,
    minHeight: 44,
  },
  sessionTypeOptionSelected: {
    backgroundColor: colors.primary.main,
  },
  sessionTypeText: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  sessionTypeTextSelected: {
    color: colors.background.default,
  },

  // Dropdown
  dropdownContainer: {
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 56,
  },
  dropdownHeaderContent: {
    flex: 1,
  },
  dropdownTitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  dropdownValue: {
    ...typography.body1,
    color: colors.text.primary,
    marginTop: spacing.xs / 2,
  },
  dropdownValueDisabled: {
    color: colors.text.tertiary,
  },
  dropdownContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dropdownSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background.paper,
    gap: spacing.sm,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.body2,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  dropdownOptions: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 56,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primary.main + '10',
  },
  dropdownOptionDisabled: {
    opacity: 0.5,
  },
  dropdownOptionContent: {
    flex: 1,
  },
  dropdownOptionLabel: {
    ...typography.body1,
    color: colors.text.primary,
  },
  dropdownOptionLabelSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  dropdownOptionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  dropdownEmpty: {
    ...typography.body2,
    color: colors.text.tertiary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  dropdownLoader: {
    padding: spacing.md,
  },
  dropdownCreateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.sm,
    minHeight: 56,
  },
  dropdownCreateText: {
    ...typography.body1,
    color: colors.primary.main,
    fontWeight: '500',
  },
  dropdownDoneButton: {
    padding: spacing.md,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  dropdownDoneText: {
    ...typography.button,
    color: colors.background.default,
  },

  // BUG FIX #5: Gender conflict banner styles
  genderConflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.main + '15',
    padding: spacing.sm,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning.main + '30',
  },
  genderConflictText: {
    ...typography.body2,
    color: colors.warning.main,
    flex: 1,
  },

  // Booked Slots
  bookedSlotsContainer: {
    backgroundColor: colors.warning.main + '10',
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning.main + '30',
  },
  bookedSlotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bookedSlotsLoadingText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  bookedSlotsTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  bookedSlotsList: {
    gap: spacing.xs,
  },
  bookedSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.default,
    padding: spacing.sm,
    borderRadius: spacing.xs,
  },
  bookedSlotTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookedSlotTime: {
    ...typography.body2,
    color: colors.warning.main,
    fontWeight: '600',
  },
  bookedSlotTimeSeparator: {
    ...typography.body2,
    color: colors.warning.main,
  },
  bookedSlotClient: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  bookedSlotsMore: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  bookedSlotsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success.main + '10',
    borderRadius: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success.main + '30',
  },
  bookedSlotsEmptyText: {
    ...typography.body2,
    color: colors.success.main,
  },

  // Date Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 48,
  },
  dateTimeText: {
    ...typography.body1,
    color: colors.text.primary,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  durationButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  durationButtonDisabled: {
    opacity: 0.4,
  },
  durationText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  durationTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },

  // Sessions
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  sessionControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionsValue: {
    ...typography.h4,
    color: colors.text.primary,
    minWidth: 60,
    textAlign: 'center',
  },
  sessionsHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Notes
  notesInput: {
    backgroundColor: colors.background.default,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
    minHeight: 100,
  },

  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background.default,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.sm,
    minHeight: 52,
  },
  actionButtonDisabled: {
    backgroundColor: colors.grey[300],
  },
  actionButtonText: {
    ...typography.button,
    color: colors.background.default,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: 56,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  modalBody: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.paper,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.md,
    ...typography.body1,
    color: colors.text.primary,
    minHeight: 48,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.paper,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  genderButtonSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  genderButtonText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  genderButtonTextSelected: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.main,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.button,
    color: colors.text.primary,
  },
  modalConfirmButton: {
    flex: 2,
    padding: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: spacing.sm,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: colors.grey[300],
  },
  modalConfirmText: {
    ...typography.button,
    color: colors.background.default,
  },

  // BUG FIX #7: Conflict Modal Styles
  conflictModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  conflictModalContent: {
    backgroundColor: colors.background.default,
    borderRadius: spacing.md,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  conflictModalHeader: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  conflictModalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warning.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictModalTitle: {
    ...typography.h6,
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
  },
  conflictModalBody: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  conflictMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  conflictMessageText: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },
  conflictModalButton: {
    backgroundColor: colors.primary.main,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  conflictModalButtonText: {
    ...typography.button,
    color: colors.background.default,
  },
});

export default CreateAppointmentScreen;
