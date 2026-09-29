import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAuth } from '../../../auth/presentation/hooks/useAuth';
import { useApplicationDetailQuery } from '../../data/repositories/onboarding.repository.impl';
import { BringClinicInput, ContactKind, NewClinicInput } from '../../domain/clinic-entry';
import {
  buildClinicEntryViewModel,
  ClinicEntryPathId,
  ClinicEntryPathViewModel,
} from '../../domain/usecases/build-clinic-entry-view-model.usecase';
import { ErrorScreen } from '../components/ErrorScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { useClinicEntryOrchestration } from '../hooks/useClinicEntryOrchestration';
import { useOnboardingStore } from '../providers/onboarding.store';

interface ClinicEntryPathCardProps {
  path: ClinicEntryPathViewModel;
  selected: boolean;
  disabled: boolean;
  onSelect: (pathId: ClinicEntryPathId) => void;
  theme: ClinicTheme;
  t: (key: string) => string;
}

const ClinicEntryPathCard = ({ path, selected, disabled, onSelect, theme, t }: ClinicEntryPathCardProps) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const title = t(path.titleKey);
  const description = t(path.descriptionKey);
  return (
    <TouchableOpacity
      testID={`clinic-entry-path-${path.id}`}
      style={[styles.pathCard, selected && styles.pathCardSelected]}
      onPress={() => onSelect(path.id)}
      disabled={disabled}
      accessible
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: selected, disabled }}
    >
      <View style={styles.pathHeader}>
        <Ionicons
          name={path.iconToken}
          size={theme.spacing.xl}
          color={selected ? theme.colors.primary.default : theme.colors.text.secondary}
        />
        <View style={styles.pathHeading}>
          <Text style={styles.pathTitle}>{title}</Text>
          <Text style={styles.pathBadge}>{t(path.badgeKey)}</Text>
        </View>
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={theme.spacing.lg}
          color={selected ? theme.colors.primary.default : theme.colors.text.tertiary}
        />
      </View>
      <Text style={styles.pathDescription}>{description}</Text>
    </TouchableOpacity>
  );
};

interface FieldProps {
  testID: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: ClinicTheme;
  inputRef?: React.RefObject<TextInput | null>;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const FormField = ({
  testID,
  label,
  value,
  onChangeText,
  theme,
  inputRef,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: FieldProps) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        testID={testID}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
      />
    </View>
  );
};

const ContactKindChoice = ({
  value,
  onChange,
  theme,
  t,
}: {
  value: ContactKind;
  onChange: (value: ContactKind) => void;
  theme: ClinicTheme;
  t: (key: string) => string;
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.choiceRow} accessibilityRole="radiogroup">
      {(['email', 'mobile'] as const).map((kind) => (
        <TouchableOpacity
          key={kind}
          testID={`clinic-entry-contact-${kind}`}
          style={[styles.smallChoice, value === kind && styles.smallChoiceSelected]}
          onPress={() => onChange(kind)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === kind }}
          accessibilityLabel={t(`onboarding.progressiveExperience.clinicEntry.form.${kind}`)}
        >
          <Text style={styles.smallChoiceText}>
            {t(`onboarding.progressiveExperience.clinicEntry.form.${kind}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export function ChoiceScreen() {
  const theme = useClinicTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const { setCurrentApplicationId } = useOnboardingStore();
  const { currentUser } = useAuth();
  const orchestration = useClinicEntryOrchestration();
  const [selectedPathId, setSelectedPathId] = useState<ClinicEntryPathId | null>(null);
  const [contactKind, setContactKind] = useState<ContactKind>('email');
  const [organizationName, setOrganizationName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [contactValue, setContactValue] = useState('');
  const [ownershipReference, setOwnershipReference] = useState('');
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const clinicNameRef = useRef<TextInput>(null);
  const ownershipRef = useRef<TextInput>(null);

  const { data: application, isLoading, error, refetch } = useApplicationDetailQuery(
    applicationId || '',
    { enabled: Boolean(applicationId) }
  );
  const viewModel = useMemo(
    () => (application ? buildClinicEntryViewModel({ tenantName: application.tenant_name }) : null),
    [application]
  );
  const isBusy = ['submitting', 'refreshing_session'].includes(orchestration.state);

  useEffect(() => {
    if (applicationId) setCurrentApplicationId(applicationId);
  }, [applicationId, setCurrentApplicationId]);

  useEffect(() => {
    if (application?.tenant_name) {
      if (!clinicName) setClinicName(application.tenant_name);
      if (!organizationName) setOrganizationName(application.tenant_name);
    }
  }, [application, clinicName, organizationName]);

  useEffect(() => {
    if (currentUser?.applicationStatus === 'onboarding') router.replace('/onboarding/wizard-flow');
  }, [currentUser, router]);

  useEffect(() => {
    if (orchestration.state === 'error') {
      if (selectedPathId === 'bring_your_clinic') ownershipRef.current?.focus();
      else clinicNameRef.current?.focus();
    }
  }, [orchestration.state, selectedPathId]);

  const validate = () => {
    if (orchestration.organizations.length === 0 && !organizationName.trim()) {
      setValidationToken('onboarding.progressiveExperience.clinicEntry.form.requiredError');
      clinicNameRef.current?.focus();
      return false;
    }
    if (selectedPathId === 'new_clinic') {
      if (
        !clinicName.trim() ||
        !specialty.trim() ||
        !addressLine1.trim() ||
        !city.trim() ||
        !region.trim() ||
        !postalCode.trim() ||
        !countryCode.trim() ||
        !contactValue.trim()
      ) {
        setValidationToken('onboarding.progressiveExperience.clinicEntry.form.requiredError');
        clinicNameRef.current?.focus();
        return false;
      }
    } else if (!ownershipReference.trim() || !contactValue.trim()) {
      setValidationToken('onboarding.progressiveExperience.clinicEntry.form.requiredError');
      ownershipRef.current?.focus();
      return false;
    }
    setValidationToken(null);
    return true;
  };

  const submit = () => {
    if (!validate()) return;
    if (selectedPathId === 'new_clinic') {
      const input: NewClinicInput = {
        clinicName: clinicName.trim(),
        clinicTypeSpecialty: specialty.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: region.trim(),
        postalCode: postalCode.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        contactKind,
        contactValue: contactValue.trim(),
      };
      void orchestration.submitNewClinic(input, organizationName.trim());
    } else {
      const input: BringClinicInput = {
        ownershipReference: ownershipReference.trim(),
        contactKind,
        contactValue: contactValue.trim(),
      };
      void orchestration.submitBringClinic(input, organizationName.trim());
    }
  };

  if (!applicationId) return <ErrorScreen message={t('onboarding.progressiveExperience.clinicEntry.empty')} />;
  if (isLoading || orchestration.isLoadingContext) {
    return <LoadingScreen message={t('onboarding.progressiveExperience.clinicEntry.loading')} />;
  }
  if (error || orchestration.contextError) {
    return <ErrorScreen message={t('onboarding.progressiveExperience.clinicEntry.loadError')} onRetry={refetch} />;
  }
  if (!application || !viewModel) {
    return <ErrorScreen message={t('onboarding.progressiveExperience.clinicEntry.empty')} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header} accessible accessibilityRole="header">
        <Ionicons name="checkmark-circle" size={theme.spacing.xxl} color={theme.colors.feedback.success} />
        <Text style={styles.approvedTitle}>{t('onboarding.progressiveExperience.clinicEntry.approvedTitle')}</Text>
        <Text style={styles.clinicName}>{viewModel.clinicDisplayName}</Text>
      </View>

      {orchestration.organizations.length > 1 ? (
        <View style={styles.section} accessibilityRole="radiogroup">
          <Text style={styles.sectionTitle}>{t('onboarding.progressiveExperience.clinicEntry.form.organization')}</Text>
          {orchestration.organizations.map((organization) => (
            <TouchableOpacity
              key={organization.organizationId}
              style={[styles.smallChoice, orchestration.organizationId === organization.organizationId && styles.smallChoiceSelected]}
              onPress={() => orchestration.setSelectedOrganizationId(organization.organizationId)}
              accessibilityRole="radio"
              accessibilityState={{ checked: orchestration.organizationId === organization.organizationId }}
            >
              <Text style={styles.smallChoiceText}>{organization.organizationName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.introduction}>
        <Text style={styles.question} accessibilityRole="header">{t('onboarding.progressiveExperience.clinicEntry.question')}</Text>
        <Text style={styles.questionHint}>{t('onboarding.progressiveExperience.clinicEntry.questionHint')}</Text>
      </View>
      <View accessibilityRole="radiogroup">
        {viewModel.paths.map((path) => (
          <ClinicEntryPathCard
            key={path.id}
            path={path}
            selected={path.id === selectedPathId}
            disabled={isBusy}
            onSelect={(pathId) => {
              setSelectedPathId(pathId);
              setValidationToken(null);
            }}
            theme={theme}
            t={t}
          />
        ))}
      </View>

      {selectedPathId ? (
        <View testID="clinic-entry-selection-summary" style={styles.form}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t(`onboarding.progressiveExperience.clinicEntry.${selectedPathId === 'new_clinic' ? 'newClinic' : 'bringYourClinic'}.title`)}
          </Text>
          {orchestration.organizations.length === 0 ? (
            <FormField
              testID="organization-name"
              label={t('onboarding.progressiveExperience.clinicEntry.form.organizationName')}
              value={organizationName}
              onChangeText={setOrganizationName}
              theme={theme}
            />
          ) : null}
          {selectedPathId === 'new_clinic' ? (
            <>
              <FormField inputRef={clinicNameRef} testID="clinic-name" label={t('onboarding.progressiveExperience.clinicEntry.form.clinicName')} value={clinicName} onChangeText={setClinicName} theme={theme} />
              <FormField testID="clinic-specialty" label={t('onboarding.progressiveExperience.clinicEntry.form.specialty')} value={specialty} onChangeText={setSpecialty} theme={theme} />
              <FormField testID="clinic-address-line1" label={t('onboarding.progressiveExperience.clinicEntry.form.addressLine1')} value={addressLine1} onChangeText={setAddressLine1} theme={theme} />
              <FormField testID="clinic-address-line2" label={t('onboarding.progressiveExperience.clinicEntry.form.addressLine2')} value={addressLine2} onChangeText={setAddressLine2} theme={theme} />
              <FormField testID="clinic-city" label={t('onboarding.progressiveExperience.clinicEntry.form.city')} value={city} onChangeText={setCity} theme={theme} />
              <FormField testID="clinic-state" label={t('onboarding.progressiveExperience.clinicEntry.form.state')} value={region} onChangeText={setRegion} theme={theme} />
              <FormField testID="clinic-postal-code" label={t('onboarding.progressiveExperience.clinicEntry.form.postalCode')} value={postalCode} onChangeText={setPostalCode} theme={theme} />
              <FormField testID="clinic-country-code" label={t('onboarding.progressiveExperience.clinicEntry.form.countryCode')} value={countryCode} onChangeText={setCountryCode} theme={theme} autoCapitalize="characters" />
            </>
          ) : (
            <FormField inputRef={ownershipRef} testID="ownership-reference" label={t('onboarding.progressiveExperience.clinicEntry.form.ownershipReference')} value={ownershipReference} onChangeText={setOwnershipReference} theme={theme} autoCapitalize="none" />
          )}
          <Text style={styles.label}>{t('onboarding.progressiveExperience.clinicEntry.form.contactKind')}</Text>
          <ContactKindChoice value={contactKind} onChange={setContactKind} theme={theme} t={t} />
          <FormField
            testID="clinic-contact-value"
            label={t(`onboarding.progressiveExperience.clinicEntry.form.${contactKind}Value`)}
            value={contactValue}
            onChangeText={setContactValue}
            theme={theme}
            keyboardType={contactKind === 'email' ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
          />
          {validationToken ? <Text style={styles.errorText} accessibilityRole="alert">{t(validationToken)}</Text> : null}
          <TouchableOpacity testID="clinic-entry-submit" style={styles.primaryButton} onPress={submit} disabled={isBusy} accessibilityRole="button" accessibilityState={{ disabled: isBusy, busy: isBusy }}>
            <Text style={styles.primaryButtonText}>{t('onboarding.progressiveExperience.clinicEntry.form.submit')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectionPrompt} accessible accessibilityRole="summary">
          <Text style={styles.selectionPromptText}>{t('onboarding.progressiveExperience.clinicEntry.selectionPrompt')}</Text>
        </View>
      )}

      <View testID="clinic-entry-live-status" style={styles.status} accessibilityLiveRegion="polite" accessible>
        {isBusy ? <Text style={styles.statusText}>{t('onboarding.progressiveExperience.clinicEntry.status.loading')}</Text> : null}
        {orchestration.state === 'pending' ? (
          <>
            <Text style={styles.statusText}>{t('onboarding.progressiveExperience.clinicEntry.status.pending')}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => void orchestration.resumePending()} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{t('onboarding.progressiveExperience.clinicEntry.status.checkAgain')}</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {orchestration.state === 'error' ? (
          <>
            <Text style={styles.errorText} accessibilityRole="alert">{t(orchestration.errorToken || 'errors.clinicEntry.transientFailure')}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={orchestration.retry} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>{t('onboarding.progressiveExperience.clinicEntry.status.retry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => void orchestration.logout()} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>{t('onboarding.progressiveExperience.clinicEntry.status.logout')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      {orchestration.state === 'selecting_tenant' ? (
        <View style={styles.section} accessibilityRole="radiogroup">
          <Text style={styles.sectionTitle}>{t('onboarding.progressiveExperience.clinicEntry.status.selectClinic')}</Text>
          {orchestration.tenantChoices.map((clinic) => (
            <TouchableOpacity key={clinic.tenantId} style={styles.tenantChoice} onPress={() => void orchestration.chooseTenant(clinic.tenantId)} accessibilityRole="radio" accessibilityLabel={clinic.clinicName}>
              <Text style={styles.pathTitle}>{clinic.clinicName}</Text>
              {clinic.city ? <Text style={styles.pathDescription}>{clinic.city}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.default },
  contentContainer: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  approvedTitle: { ...theme.typography.h3, color: theme.colors.text.primary, marginTop: theme.spacing.md, textAlign: 'center' },
  clinicName: { ...theme.typography.body1, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  introduction: { marginBottom: theme.spacing.lg },
  question: { ...theme.typography.h5, color: theme.colors.text.primary, textAlign: 'center' },
  questionHint: { ...theme.typography.body2, color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: 'center' },
  pathCard: { minHeight: 44, backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  pathCardSelected: { backgroundColor: theme.colors.primary.soft, borderColor: theme.colors.primary.default },
  pathHeader: { flexDirection: 'row', alignItems: 'center' },
  pathHeading: { flex: 1, marginHorizontal: theme.spacing.md },
  pathTitle: { ...theme.typography.h6, color: theme.colors.text.primary },
  pathBadge: { ...theme.typography.caption, color: theme.colors.primary.default, marginTop: theme.spacing.xs },
  pathDescription: { ...theme.typography.body2, color: theme.colors.text.secondary, marginTop: theme.spacing.sm },
  selectionPrompt: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  selectionPromptText: { ...theme.typography.body2, color: theme.colors.text.secondary, textAlign: 'center' },
  form: { backgroundColor: theme.colors.surface.default, borderColor: theme.colors.border.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.h6, color: theme.colors.text.primary, marginBottom: theme.spacing.md },
  field: { marginBottom: theme.spacing.md },
  label: { ...theme.typography.caption, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs },
  input: { minHeight: 44, ...theme.typography.body1, color: theme.colors.text.primary, backgroundColor: theme.colors.background.default, borderColor: theme.colors.border.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  choiceRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  smallChoice: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: theme.colors.border.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, padding: theme.spacing.sm, marginRight: theme.spacing.sm },
  smallChoiceSelected: { borderColor: theme.colors.primary.default, backgroundColor: theme.colors.primary.soft },
  smallChoiceText: { ...theme.typography.body2, color: theme.colors.text.primary },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.default, borderRadius: theme.spacing.sm, padding: theme.spacing.md, marginTop: theme.spacing.sm },
  primaryButtonText: { ...theme.typography.body1, color: theme.colors.primary.onPrimary },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderColor: theme.colors.primary.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, padding: theme.spacing.md, marginTop: theme.spacing.sm, marginRight: theme.spacing.sm },
  secondaryButtonText: { ...theme.typography.body2, color: theme.colors.primary.default },
  status: { marginTop: theme.spacing.md },
  statusText: { ...theme.typography.body2, color: theme.colors.text.secondary },
  errorText: { ...theme.typography.body2, color: theme.colors.feedback.error, marginTop: theme.spacing.sm },
  actionRow: { flexDirection: 'row' },
  tenantChoice: { minHeight: 44, borderColor: theme.colors.border.default, borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.spacing.sm, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
});
