import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClinicTheme, useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { JourneyViewModel } from '../../domain/entities/journey.entity';
import type { JourneyCorrectiveAction } from '../../domain/entities/journey-visibility.entity';
import { calculateJourneyProgressPercentage } from '../../domain/usecases/build-journey-view-model.usecase';
import { ProgressBar } from './ProgressBar';
import { StepCard } from './StepCard';

interface JourneySurfaceProps {
  journey: JourneyViewModel;
  onSelectStep: (stepCode: string) => void | Promise<void>;
  onExecuteAction?: (action: JourneyCorrectiveAction, stepCode: string) => void;
  refreshing?: boolean;
}

export const JourneySurface: React.FC<JourneySurfaceProps> = ({
  journey,
  onSelectStep,
  onExecuteAction,
  refreshing = false,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const heading = t('onboarding.progressiveExperience.journey.heading');

  if (journey.availability === 'unsupported_version') {
    const unavailableMessage = t(
      'onboarding.progressiveExperience.journey.unavailable'
    );

    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLabel={unavailableMessage}
          style={styles.state}
        >
          <Text style={styles.stateText}>{unavailableMessage}</Text>
        </View>
      </View>
    );
  }

  if (journey.cards.length === 0) {
    const emptyMessage = t('onboarding.progressiveExperience.journey.empty');

    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={emptyMessage}
          style={styles.state}
        >
          <Text style={styles.stateText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  const progressText = t(
    'onboarding.progressiveExperience.journey.progress',
    {
      completed: journey.progress.completed,
      total: journey.progress.total,
    }
  );
  const progressPercentage = calculateJourneyProgressPercentage(journey.progress);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        {heading}
      </Text>
      <Text style={styles.progressText}>{progressText}</Text>
      {refreshing && (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          style={styles.refreshingText}
        >
          {t('onboarding.progressiveExperience.journey.refreshing')}
        </Text>
      )}
      <ProgressBar
        percentage={progressPercentage}
        showLabel={false}
        accessibilityLabel={progressText}
      />
      <View accessibilityRole="list" style={styles.cardList}>
        {journey.cards.map(card => (
          <StepCard
            key={`${card.cardId}:${card.stepCode}`}
            journeyCard={card}
            onPress={() => card.action && onExecuteAction
              ? onExecuteAction(card.action, card.stepCode)
              : onSelectStep(card.destination.stepCode)}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: ClinicTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    heading: {
      ...theme.typography.h5,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    progressText: {
      ...theme.typography.body2,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    refreshingText: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    cardList: {
      marginTop: theme.spacing.lg,
    },
    state: {
      backgroundColor: theme.colors.surface.muted,
      borderColor: theme.colors.border.default,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    stateText: {
      ...theme.typography.body1,
      color: theme.colors.text.secondary,
    },
  });
