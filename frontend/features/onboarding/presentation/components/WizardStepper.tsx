/**
 * WizardStepper
 * Visual stepper component showing all steps with progress
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useTranslation } from '../../../../core/localization/useTranslation';
import { getStepperScrollOffset } from './wizardStepperGeometry';

interface Step {
  code: string;
  name: string;
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked';
  order: number;
}

interface WizardStepperProps {
  steps: Step[];
  currentStepIndex: number;
}

export const updateStepOffsets = (
  current: Readonly<Record<number, number>>,
  index: number,
  x: number,
): Record<number, number> =>
  current[index] === x ? current : { ...current, [index]: x };

export const getCurrentStepScrollOffset = (stepX: number, padding: number): number =>
  Math.max(0, stepX - padding);

export function WizardStepper({ steps, currentStepIndex }: WizardStepperProps) {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const completedCount = useMemo(
    () => steps.filter(step => step.status === 'completed').length,
    [steps],
  );
  const circleSize = theme.spacing.xl;
  const scrollViewRef = useRef<ScrollView>(null);
  const [stepOffsets, setStepOffsets] = useState<Record<number, number>>({});
  const [stepWidths, setStepWidths] = useState<Record<number, number>>({});
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const offset = stepOffsets[currentStepIndex];
    const width = stepWidths[currentStepIndex];
    if (offset !== undefined && width !== undefined) {
      scrollViewRef.current?.scrollTo({
        x: getStepperScrollOffset({
          itemX: offset,
          itemWidth: width,
          contentWidth,
          viewportWidth,
        }),
        animated: true,
      });
    }
  }, [contentWidth, currentStepIndex, stepOffsets, stepWidths, viewportWidth]);

  const getStepColor = (index: number, status: string) => {
    if (status === 'completed') return theme.colors.feedback.success;
    if (index === currentStepIndex) return theme.colors.primary.default;
    if (status === 'blocked') return theme.colors.text.disabled;
    return theme.colors.text.secondary;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.default, padding: theme.spacing.lg }]}>
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border.default, height: 4, borderRadius: 2, marginBottom: theme.spacing.lg }]}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.colors.primary.default,
              width: `${steps.length ? (completedCount / steps.length) * 100 : 0}%`,
              height: 4,
              borderRadius: 2,
            },
          ]}
        />
      </View>

      {/* Step Counter - Show before scrollable steps */}
      <Text
        style={[
          theme.typography.body2,
          {
            color: theme.colors.text.secondary,
            textAlign: 'center',
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        {t('onboarding.progressiveExperience.flow.currentStepPosition', {
          current: currentStepIndex + 1,
          total: steps.length,
        })}
      </Text>

      {/* Step Indicators - Horizontal Scroll */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={width => setContentWidth(width)}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
      >
        <View style={[styles.stepsContainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
          {steps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isCompleted = step.status === 'completed';
            const stepColor = getStepColor(index, step.status);

            return (
              <View
                key={step.code}
                testID={`wizard-step-${step.code}`}
                onLayout={event => {
                  const x = event.nativeEvent.layout.x;
                  const width = event.nativeEvent.layout.width;
                  setStepOffsets(current => updateStepOffsets(current, index, x));
                  setStepWidths(current => updateStepOffsets(current, index, width));
                }}
                style={[styles.stepItem, { alignItems: 'center', width: circleSize + theme.spacing.xxl }]}
              >
                {/* Step Number/Icon */}
                <View
                  style={[
                    styles.stepCircle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      backgroundColor: isCompleted ? theme.colors.feedback.success : isCurrent ? theme.colors.primary.default : theme.colors.surface.elevated,
                      borderWidth: 2,
                      borderColor: stepColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={20} color={theme.colors.text.onPrimary} />
                  ) : (
                    <Text
                      style={[
                        theme.typography.caption,
                        {
                          color: isCurrent ? theme.colors.text.onPrimary : stepColor,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Step Name */}
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color: isCurrent ? theme.colors.text.primary : theme.colors.text.secondary,
                      fontWeight: isCurrent ? '600' : '400',
                      textAlign: 'center',
                      width: circleSize + theme.spacing.xxl,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {step.name}
                </Text>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      {
                        position: 'absolute',
                        top: circleSize / 2,
                        left: (circleSize + theme.spacing.xxl) / 2,
                        width: circleSize + theme.spacing.xxl,
                        height: 2,
                        backgroundColor: isCompleted ? theme.colors.feedback.success : theme.colors.border.default,
                        zIndex: -1,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Styles set inline with theme
  },
  progressBarContainer: {
    // Styles set inline with theme
  },
  progressBar: {
    // Styles set inline with theme
  },
  stepsContainer: {
    // Styles set inline with theme
  },
  stepItem: {
    position: 'relative',
  },
  stepCircle: {
    // Styles set inline with theme
  },
  connector: {
    // Styles set inline with theme
  },
});
