/**
 * DemoStatusBanner Component
 * Legacy compatibility component for Ready-to-Start guidance.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';

interface DemoStatusBannerProps {
  demoExpiresAt: string;
  trialExpiresAt: string;
  isDemoExpired: boolean;
  isTrialExpired: boolean;
  onExtendDemo?: () => void;
  onTransitionToLive?: () => void;
  canExtendDemo?: boolean;
  isExtendPending?: boolean;
  isTransitionPending?: boolean;
  isExtendDisabled?: boolean;
  isTransitionDisabled?: boolean;
}

export const DemoStatusBanner: React.FC<DemoStatusBannerProps> = ({
  demoExpiresAt,
  trialExpiresAt,
  isDemoExpired,
  isTrialExpired,
  onExtendDemo,
  onTransitionToLive,
  canExtendDemo = true,
  isExtendPending = false,
  isTransitionPending = false,
  isExtendDisabled = false,
  isTransitionDisabled = false,
}) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const [demoTimeRemaining, setDemoTimeRemaining] = useState('');
  const [trialTimeRemaining, setTrialTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const demoEnd = new Date(demoExpiresAt).getTime();
      const trialEnd = new Date(trialExpiresAt).getTime();

      // Legacy sample-access countdown retained for compatibility with existing DTOs.
      const demoDistance = demoEnd - now;
      if (demoDistance > 0) {
        const days = Math.floor(demoDistance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((demoDistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setDemoTimeRemaining(`${days}d ${hours}h`);
      } else {
        setDemoTimeRemaining(t('onboarding.progressiveExperience.statusBanner.expired'));
      }

      // Trial countdown
      const trialDistance = trialEnd - now;
      if (trialDistance > 0) {
        const days = Math.floor(trialDistance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((trialDistance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTrialTimeRemaining(`${days}d ${hours}h`);
      } else {
        setTrialTimeRemaining(t('onboarding.progressiveExperience.statusBanner.expired'));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [demoExpiresAt, trialExpiresAt, t]);

  const getDemoColor = () => {
    const now = new Date().getTime();
    const demoEnd = new Date(demoExpiresAt).getTime();
    const daysRemaining = Math.floor((demoEnd - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 3) return theme.colors.feedback.success;
    if (daysRemaining >= 1) return theme.colors.feedback.warning;
    return theme.colors.feedback.error;
  };

  const getTrialColor = () => {
    const now = new Date().getTime();
    const trialEnd = new Date(trialExpiresAt).getTime();
    const daysRemaining = Math.floor((trialEnd - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 10) return theme.colors.feedback.success;
    if (daysRemaining >= 3) return theme.colors.feedback.warning;
    return theme.colors.feedback.error;
  };

  if (isDemoExpired && isTrialExpired) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.feedback.errorLight,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderRadius: theme.spacing.sm,
            borderLeftWidth: theme.spacing.xs,
            borderLeftColor: theme.colors.feedback.error,
          },
        ]}
      >
        <View style={[styles.header, { marginBottom: theme.spacing.sm }]}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.feedback.error} />
          <Text
            style={[
              theme.typography.h6,
              { color: theme.colors.feedback.error, marginLeft: theme.spacing.sm },
            ]}
          >
            {t('onboarding.progressiveExperience.statusBanner.commercialTrialEnded')}
          </Text>
        </View>
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
          {t('onboarding.progressiveExperience.statusBanner.trialEndedMessage')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.surface.elevated,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          borderRadius: theme.spacing.sm,
          borderLeftWidth: theme.spacing.xs,
          borderLeftColor: isDemoExpired ? getTrialColor() : getDemoColor(),
        },
      ]}
    >
      <View style={[styles.header, { marginBottom: theme.spacing.md }]}>
        <Ionicons
          name={isDemoExpired ? 'time' : 'flask'}
          size={24}
          color={isDemoExpired ? getTrialColor() : getDemoColor()}
        />
        <Text
          style={[
            theme.typography.h6,
            {
              color: theme.colors.text.primary,
              marginLeft: theme.spacing.sm,
              flex: 1,
            },
          ]}
        >
          {isDemoExpired ? t('onboarding.progressiveExperience.statusBanner.commercialTrial') : t('onboarding.progressiveExperience.statusBanner.sampleClinic')}
        </Text>
      </View>

      {!isDemoExpired && (
        <View style={[styles.countdown, { marginBottom: theme.spacing.sm }]}>
          <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
            {t('onboarding.progressiveExperience.statusBanner.sampleAccessEndsIn')}{' '}
          </Text>
          <Text
            style={[
              theme.typography.h6,
              { color: getDemoColor(), marginLeft: theme.spacing.xs },
            ]}
          >
            {demoTimeRemaining}
          </Text>
        </View>
      )}

      <View style={[styles.countdown, { marginBottom: theme.spacing.md }]}>
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
          {t('onboarding.progressiveExperience.statusBanner.commercialTrialEndsIn')}{' '}
        </Text>
        <Text
          style={[
            theme.typography.h6,
            { color: getTrialColor(), marginLeft: theme.spacing.xs },
          ]}
        >
          {trialTimeRemaining}
        </Text>
      </View>

      <View style={[styles.actions, { flexDirection: 'row', gap: theme.spacing.sm }]}>
        {!isDemoExpired && canExtendDemo && onExtendDemo && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.surface.default,
                borderColor: theme.colors.border.default,
                borderWidth: 1,
                padding: theme.spacing.sm,
                borderRadius: theme.spacing.xs,
                flex: 1,
                alignItems: 'center',
                opacity: isExtendPending || isExtendDisabled ? 0.7 : 1,
              },
            ]}
            accessibilityLabel={t('onboarding.progressiveExperience.statusBanner.extendSampleAccess')}
            accessibilityState={{ disabled: isExtendPending || isExtendDisabled }}
            disabled={isExtendPending || isExtendDisabled}
            onPress={onExtendDemo}
          >
            {isExtendPending ? (
              <ActivityIndicator color={theme.colors.text.primary} />
            ) : (
              <Text style={[theme.typography.button, { color: theme.colors.text.primary }]}>
                {t('onboarding.progressiveExperience.statusBanner.extendSampleAccess')}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {onTransitionToLive && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary.default,
                padding: theme.spacing.sm,
                borderRadius: theme.spacing.xs,
                flex: 1,
                alignItems: 'center',
                opacity: isTransitionPending || isTransitionDisabled ? 0.7 : 1,
              },
            ]}
            accessibilityLabel={t('onboarding.progressiveExperience.statusBanner.readyToStart')}
            accessibilityState={{ disabled: isTransitionPending || isTransitionDisabled }}
            disabled={isTransitionPending || isTransitionDisabled}
            onPress={onTransitionToLive}
          >
            {isTransitionPending ? (
              <ActivityIndicator color={theme.colors.text.onPrimary} />
            ) : (
              <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
                {isDemoExpired ? t('onboarding.progressiveExperience.statusBanner.choosePlan') : t('onboarding.progressiveExperience.statusBanner.readyToStart')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    // Styles set inline with theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    // Styles set inline with theme
  },
  button: {
    // Styles set inline with theme
  },
});
