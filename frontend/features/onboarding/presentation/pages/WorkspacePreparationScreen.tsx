import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '../../../../core/localization/useTranslation';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import {
  WORKSPACE_PREPARATION_UNIT_ORDER,
  WorkspacePreparationOrchestrationState,
  WorkspacePreparationUnitCode,
} from '../../domain/entities/workspace-preparation.entity';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProgressBar } from '../components/ProgressBar';
import { useWorkspacePreparation } from '../hooks/useWorkspacePreparation';

interface WorkspacePreparationScreenProps {
  tenantId: string;
  organizationId?: string | null;
}

const unitToken = (unit: WorkspacePreparationUnitCode) =>
  `onboarding.progressiveExperience.workspacePreparation.units.${unit}`;

const stateToken = (state: WorkspacePreparationOrchestrationState['lifecycle']) =>
  `onboarding.progressiveExperience.workspacePreparation.states.${state}`;

export function WorkspacePreparationScreen({
  tenantId,
  organizationId,
}: WorkspacePreparationScreenProps) {
  const router = useRouter();
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const presentation = useWorkspacePreparation(tenantId, organizationId);
  const failureRef = useRef<View>(null);
  const completionRef = useRef<View>(null);
  const failureKind = presentation.domain?.failure.kind ?? 'NONE';
  const personalizationAvailable =
    presentation.domain?.personalizationAvailable ?? false;

  useEffect(() => {
    const target =
      failureKind !== 'NONE'
        ? failureRef.current
        : personalizationAvailable
          ? completionRef.current
          : null;
    const node = target ? findNodeHandle(target) : null;
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, [failureKind, personalizationAvailable]);

  if (presentation.loading) {
    return (
      <LoadingScreen
        message={t('onboarding.progressiveExperience.workspacePreparation.loading')}
      />
    );
  }

  if (presentation.error || !presentation.domain) {
    return (
      <View style={styles.centered} accessible accessibilityRole="alert">
        <Ionicons
          name="alert-circle-outline"
          size={theme.spacing.xxl}
          color={theme.colors.feedback.error}
        />
        <Text style={styles.title} accessibilityRole="header">
          {t('onboarding.progressiveExperience.workspacePreparation.failure.title')}
        </Text>
        <Text style={styles.body}>
          {t('onboarding.progressiveExperience.workspacePreparation.failure.safeMessage')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'onboarding.progressiveExperience.workspacePreparation.actions.reload'
          )}
          onPress={() => void presentation.reload()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {t('onboarding.progressiveExperience.workspacePreparation.actions.reload')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const domain = presentation.domain;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      accessibilityLabel={t(
        'onboarding.progressiveExperience.workspacePreparation.accessibility.screen'
      )}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t('onboarding.progressiveExperience.workspacePreparation.title')}
      </Text>
      <Text style={styles.body}>{t(stateToken(domain.lifecycle))}</Text>

      <View style={styles.section}>
        {domain.progress.indeterminate ? (
          <View
            style={styles.indeterminateProgress}
            accessible
            accessibilityRole="progressbar"
            accessibilityState={{ busy: true }}
            accessibilityLabel={t(
              'onboarding.progressiveExperience.workspacePreparation.accessibility.progressIndeterminate'
            )}
          >
            <Text style={styles.meta}>
              {t(
                'onboarding.progressiveExperience.workspacePreparation.progressIndeterminate'
              )}
            </Text>
          </View>
        ) : (
          <ProgressBar
            percentage={domain.progress.percentage}
            accessibilityLabel={t(
              'onboarding.progressiveExperience.workspacePreparation.accessibility.progress'
            )}
          />
        )}
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {t('onboarding.progressiveExperience.workspacePreparation.progressSummary', {
            completed: domain.progress.completed,
            total: domain.progress.total,
          })}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('onboarding.progressiveExperience.workspacePreparation.unitsTitle')}
        </Text>
        {WORKSPACE_PREPARATION_UNIT_ORDER.map((unit) => {
          const completed = domain.progress.completedUnits.includes(unit);
          const current = domain.progress.currentUnit === unit;
          return (
            <View
              key={unit}
              style={styles.unitRow}
              accessible
              accessibilityLabel={`${t(unitToken(unit))}. ${t(
                completed
                  ? 'onboarding.progressiveExperience.workspacePreparation.unitStatus.completed'
                  : current
                    ? 'onboarding.progressiveExperience.workspacePreparation.unitStatus.current'
                    : 'onboarding.progressiveExperience.workspacePreparation.unitStatus.remaining'
              )}`}
            >
              <Ionicons
                name={completed ? 'checkmark-circle' : current ? 'time' : 'ellipse-outline'}
                size={theme.spacing.lg}
                color={
                  completed
                    ? theme.colors.feedback.success
                    : current
                      ? theme.colors.primary.default
                      : theme.colors.text.secondary
                }
              />
              <View style={styles.unitText}>
                <Text style={styles.unitTitle}>{t(unitToken(unit))}</Text>
                <Text style={styles.meta}>
                  {t(
                    completed
                      ? 'onboarding.progressiveExperience.workspacePreparation.unitStatus.completed'
                      : current
                        ? 'onboarding.progressiveExperience.workspacePreparation.unitStatus.current'
                        : 'onboarding.progressiveExperience.workspacePreparation.unitStatus.remaining'
                  )}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {domain.failure.kind !== 'NONE' && (
        <View
          ref={failureRef}
          style={styles.failureCard}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.sectionTitle}>
            {t(
              domain.failure.kind === 'RETRYABLE'
                ? 'onboarding.progressiveExperience.workspacePreparation.failure.retryableTitle'
                : 'onboarding.progressiveExperience.workspacePreparation.failure.terminalTitle'
            )}
          </Text>
          <Text style={styles.body}>
            {t('onboarding.progressiveExperience.workspacePreparation.failure.safeMessage')}
          </Text>
          <Text style={styles.meta}>
            {domain.retry.exhausted
              ? t('onboarding.progressiveExperience.workspacePreparation.retry.exhausted')
              : t('onboarding.progressiveExperience.workspacePreparation.retry.remaining', {
                  count: domain.retry.remaining,
                })}
          </Text>
          <Text style={styles.meta}>
            {t('onboarding.progressiveExperience.workspacePreparation.nextAction', {
              action: t(
                `onboarding.progressiveExperience.workspacePreparation.actions.${domain.nextAction}`
              ),
            })}
          </Text>
          {domain.retry.available && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                'onboarding.progressiveExperience.workspacePreparation.actions.retry'
              )}
              accessibilityState={{ disabled: presentation.retrying }}
              disabled={presentation.retrying}
              onPress={() => void presentation.retry()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {t(
                  presentation.retrying
                    ? 'onboarding.progressiveExperience.workspacePreparation.retry.retrying'
                    : 'onboarding.progressiveExperience.workspacePreparation.actions.retry'
                )}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {domain.personalizationAvailable && (
        <View
          ref={completionRef}
          style={styles.completionCard}
          accessible
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name="sparkles"
            size={theme.spacing.xl}
            color={theme.colors.feedback.success}
          />
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('onboarding.progressiveExperience.workspacePreparation.complete.title')}
          </Text>
          <Text style={styles.body}>
            {t('onboarding.progressiveExperience.workspacePreparation.complete.message')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              'onboarding.progressiveExperience.workspacePreparation.actions.personalize'
            )}
            accessibilityState={{ disabled: presentation.personalizing }}
            disabled={presentation.personalizing}
            onPress={async () => {
              if (await presentation.preparePersonalizationHandoff()) {
                router.push(`/onboarding/wizard-flow?tenantId=${tenantId}` as never);
              }
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {t('onboarding.progressiveExperience.workspacePreparation.actions.personalize')}
            </Text>
          </Pressable>
        </View>
      )}

      {!domain.personalizationAvailable && domain.failure.kind === 'NONE' && (
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {t('onboarding.progressiveExperience.workspacePreparation.nextAction', {
            action: t(
              `onboarding.progressiveExperience.workspacePreparation.actions.${domain.nextAction}`
            ),
          })}
        </Text>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background.default },
    content: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background.default,
    },
    title: { ...theme.typography.h3, color: theme.colors.text.primary },
    sectionTitle: { ...theme.typography.h5, color: theme.colors.text.primary },
    body: { ...theme.typography.body1, color: theme.colors.text.secondary },
    meta: { ...theme.typography.body2, color: theme.colors.text.secondary },
    section: { gap: theme.spacing.md },
    indeterminateProgress: {
      minHeight: theme.spacing.xxl,
      justifyContent: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface.default,
      borderRadius: theme.spacing.sm,
    },
    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface.default,
      borderRadius: theme.spacing.sm,
    },
    unitText: { flex: 1, gap: theme.spacing.xs },
    unitTitle: { ...theme.typography.body1, color: theme.colors.text.primary },
    failureCard: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.feedback.errorLight,
      borderRadius: theme.spacing.sm,
    },
    completionCard: {
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.feedback.successLight,
      borderRadius: theme.spacing.sm,
    },
    primaryButton: {
      minHeight: theme.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary.default,
      borderRadius: theme.spacing.sm,
    },
    primaryButtonText: {
      ...theme.typography.button,
      color: theme.colors.text.onPrimary,
    },
  });
