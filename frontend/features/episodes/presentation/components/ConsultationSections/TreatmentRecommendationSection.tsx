import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { useClinicTheme } from '../../../../../core/theme/useClinicTheme';
import {
  SectionProgressStatus,
  TreatmentRecommendationDraft,
} from '../../hooks/useConsultationWorkspace';

// Common Ayurvedic / general therapies for auto-search suggestions
const THERAPY_SUGGESTIONS = [
  'Abhyanga (Oil Massage)',
  'Shirodhara',
  'Panchakarma',
  'Nasya',
  'Basti (Enema)',
  'Virechana (Purgation)',
  'Vamana (Emesis)',
  'Kizhi (Herbal Pouch)',
  'Pizhichil (Oil Bath)',
  'Netra Tarpana (Eye Therapy)',
  'Karna Purana (Ear Therapy)',
  'Udvartana (Powder Massage)',
  'Njavarakizhi (Rice Pouch)',
  'Steam Bath',
  'Yoga Therapy',
  'Physiotherapy',
  'Acupuncture',
  'Cupping Therapy',
  'Marma Therapy',
  'Spine Care Program',
];

interface TreatmentRecommendationSectionProps {
  draft: TreatmentRecommendationDraft;
  isSaving: boolean;
  /** True once the doctor has successfully sent to admin — fades the button */
  isSent: boolean;
  saveError: string | null;
  onUpdate: <K extends keyof TreatmentRecommendationDraft>(
    key: K,
    value: TreatmentRecommendationDraft[K],
  ) => void;
  onSendToAdmin: () => void;
  progress: SectionProgressStatus;
  /** The clinic's own treatments. When given, they are the suggestions and picking one links the plan to it. */
  treatments?: ReadonlyArray<{ id: string; name: string }>;
}

const DURATIONS = [7, 14, 21, 30, 45, 60, 'custom'] as const;

const progressIcon = (status: SectionProgressStatus) =>
  status === 'complete' ? 'checkmark-circle' : status === 'in_progress' ? 'ellipse' : 'ellipse-outline';

export const TreatmentRecommendationSection: React.FC<TreatmentRecommendationSectionProps> = ({
  draft,
  isSaving,
  isSent,
  saveError,
  onUpdate,
  onSendToAdmin,
  progress,
  treatments,
}) => {
  const { colors, spacing, typography } = useClinicTheme();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const headerStatus = isSaving
    ? 'Saving...'
    : isSent
    ? 'Ordered'
    : saveError
    ? '⚠ Save failed'
    : '';

  const headerStatusColor = saveError
    ? colors.feedback.error
    : isSent
    ? colors.feedback.success
    : colors.text.secondary;

  // Filter suggestions based on current input
  const suggestionPool = useMemo<ReadonlyArray<{ id?: string; name: string }>>(
    () => (treatments && treatments.length > 0 ? treatments : THERAPY_SUGGESTIONS.map(name => ({ name }))),
    [treatments],
  );
  const filteredSuggestions = useMemo(() => {
    const q = draft.recommendedTherapy.trim().toLowerCase();
    if (!q) return suggestionPool;
    return suggestionPool.filter(t => t.name.toLowerCase().includes(q));
  }, [draft.recommendedTherapy, suggestionPool]);

  const handleSend = () => {
    if (!draft.recommendedTherapy.trim()) {
      setValidationError('Recommended Therapy is required.');
      return;
    }
    setValidationError(null);
    onSendToAdmin();
  };

  const handleTherapyChange = (value: string) => {
    onUpdate('recommendedTherapy', value);
    // Typing the exact name of a clinic treatment links it; any other text is free text with no link.
    const typed = value.trim().toLowerCase();
    onUpdate('recommendedTreatmentId', treatments?.find(t => t.name.trim().toLowerCase() === typed)?.id ?? null);
    setShowSuggestions(value.length > 0);
    setValidationError(null);
  };

  const handleSuggestionSelect = (item: { id?: string; name: string }) => {
    onUpdate('recommendedTherapy', item.name);
    onUpdate('recommendedTreatmentId', item.id ?? null);
    setShowSuggestions(false);
  };

  const isButtonDisabled = isSaving || isSent;

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface.default,
          borderColor: colors.border.default,
          borderRadius: spacing.sm,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.titleRow, { gap: spacing.sm }]}>
          <Ionicons name={progressIcon(progress)} size={20} color={colors.primary.default} />
          <Text style={[typography.h6, { color: colors.text.primary }]}>Treatment Recommendation</Text>
        </View>
        {!!headerStatus && (
          <Text style={[typography.caption, { color: headerStatusColor }]}>
            {headerStatus}
          </Text>
        )}
      </View>

      {/* Recommended Therapy with auto-search */}
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>
          Recommended Therapy <Text style={{ color: colors.feedback.error }}>*</Text>
        </Text>
        <TextInput
          value={draft.recommendedTherapy}
          onChangeText={handleTherapyChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Small delay so suggestion tap registers before hiding
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="Type to search therapies..."
          placeholderTextColor={colors.text.tertiary}
          style={[
            typography.body2,
            styles.input,
            {
              color: colors.text.primary,
              borderColor: validationError ? colors.feedback.error : colors.border.default,
              borderRadius: spacing.sm,
              padding: spacing.sm,
            },
          ]}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <View
            style={[
              styles.suggestionsContainer,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
                borderRadius: spacing.sm,
              },
            ]}
          >
            {filteredSuggestions.slice(0, 8).map(item => (
                <TouchableOpacity
                  key={item.id ?? item.name}
                  onPress={() => handleSuggestionSelect(item)}
                  accessibilityRole="button"
                  style={[
                    styles.suggestionItem,
                    {
                      padding: spacing.sm,
                      borderBottomColor: colors.border.subtle,
                    },
                  ]}
                >
                  <Ionicons name="medical-outline" size={14} color={colors.text.tertiary} style={{ marginRight: spacing.xs }} />
                  <Text style={[typography.body2, { color: colors.text.primary, flex: 1 }]}>{item.name}</Text>
                </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Duration */}
      <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>Duration</Text>
      <View style={[styles.segmentRow, { gap: spacing.xs }]}>
        {DURATIONS.map(value => (
          <Segment
            key={String(value)}
            label={value === 'custom' ? 'Custom' : `${value} days`}
            active={draft.durationDays === value}
            onPress={() => onUpdate('durationDays', value)}
          />
        ))}
      </View>
      {draft.durationDays === 'custom' && (
        <TextInput
          value={draft.customDurationDays ? String(draft.customDurationDays) : ''}
          onChangeText={(value) => onUpdate('customDurationDays', Number(value) || undefined)}
          keyboardType="number-pad"
          placeholder="Number of days"
          placeholderTextColor={colors.text.tertiary}
          style={[typography.body2, styles.input, themedInput(colors, spacing)]}
        />
      )}

      {/* Start Preference */}
      <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>Start Preference</Text>
      <View style={[styles.segmentRow, { gap: spacing.xs }]}>
        <Segment
          label="ASAP"
          active={draft.startPreference === 'asap'}
          onPress={() => {
            onUpdate('startPreference', 'asap');
            setShowDatePicker(false);
          }}
        />
        <Segment
          label="Specific Date"
          active={draft.startPreference === 'specific_date'}
          onPress={() => {
            onUpdate('startPreference', 'specific_date');
            setShowDatePicker(true);
          }}
        />
      </View>
      {draft.startPreference === 'specific_date' && (
        <View style={{ gap: spacing.xs }}>
          {/* Show selected date as a tappable field */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(v => !v)}
            accessibilityRole="button"
            style={[
              styles.dateButton,
              {
                borderColor: colors.border.default,
                borderRadius: spacing.sm,
                padding: spacing.sm,
                backgroundColor: colors.background.elevated,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
            <Text style={[typography.body2, { color: colors.text.primary, flex: 1, marginLeft: spacing.xs }]}>
              {draft.specificStartDate
                ? draft.specificStartDate.toLocaleDateString()
                : 'Select a date'}
            </Text>
            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
          {showDatePicker && Platform.OS !== 'web' && (
            <NativeDateTimePicker
              mode="date"
              value={draft.specificStartDate ?? new Date()}
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              onChange={(_, date) => {
                // On Android the picker closes itself; on iOS we close manually
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (date) onUpdate('specificStartDate', date);
              }}
            />
          )}
          {showDatePicker && Platform.OS !== 'web' && Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              accessibilityRole="button"
              style={[
                styles.doneDateButton,
                {
                  backgroundColor: colors.primary.default,
                  borderRadius: spacing.sm,
                  padding: spacing.sm,
                },
              ]}
            >
              <Text style={[typography.button, { color: colors.primary.onPrimary }]}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notes for Admin */}
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.subtitle2, { color: colors.text.secondary }]}>Notes for Admin</Text>
        <TextInput
          value={draft.notesForAdmin}
          onChangeText={(value) => onUpdate('notesForAdmin', value)}
          multiline
          textAlignVertical="top"
          placeholder="Scheduling notes, contraindications, or preferences"
          placeholderTextColor={colors.text.tertiary}
          style={[typography.body2, styles.textarea, themedInput(colors, spacing)]}
        />
      </View>

      {/* Errors */}
      {!!(validationError || saveError) && (
        <Text style={[typography.body2, { color: colors.feedback.error }]}>
          {validationError || saveError}
        </Text>
      )}

      {/* CTA button — fades/disables once successfully sent */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={isButtonDisabled}
        accessibilityRole="button"
        accessibilityLabel={isSent ? 'Treatment recommendation ordered' : 'Send to Admin for Scheduling'}
        style={[
          styles.primaryButton,
          {
            backgroundColor: isButtonDisabled ? colors.border.default : colors.primary.default,
            borderRadius: spacing.sm,
            padding: spacing.sm,
            gap: spacing.xs,
            opacity: isButtonDisabled ? 0.5 : 1,
          },
        ]}
      >
        {isSaving && <ActivityIndicator size="small" color={colors.primary.onPrimary} />}
        {isSent && <Ionicons name="checkmark-circle" size={18} color={colors.primary.onPrimary} />}
        <Text style={[typography.button, { color: colors.primary.onPrimary }]}>
          {isSent ? 'Ordered' : 'Send to Admin for Scheduling'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface SegmentProps {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const Segment: React.FC<SegmentProps> = ({ label, active, onPress, disabled }) => {
  const { colors, spacing, typography } = useClinicTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.segment,
        {
          backgroundColor: active ? colors.primary.default : colors.background.elevated,
          borderColor: active ? colors.primary.default : colors.border.default,
          borderRadius: spacing.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[typography.caption, { color: active ? colors.primary.onPrimary : colors.text.secondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const themedInput = (
  colors: ReturnType<typeof useClinicTheme>['colors'],
  spacing: ReturnType<typeof useClinicTheme>['spacing'],
) => ({
  color: colors.text.primary,
  borderColor: colors.border.default,
  borderRadius: spacing.sm,
  padding: spacing.sm,
});

const styles = StyleSheet.create({
  section: { borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, minHeight: 44 },
  textarea: { borderWidth: 1, minHeight: 88 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap' },
  segment: { minHeight: 44, borderWidth: 1, justifyContent: 'center' },
  primaryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    minHeight: 44,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneDateButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
  },
  suggestionsContainer: {
    borderWidth: 1,
    marginTop: -4,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
