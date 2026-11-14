/**
 * ImproveApplicationScreen
 * Allows users to improve their application based on validation report
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import {
  useApplicationDetailQuery,
  useValidationReportQuery,
  useResubmitApplicationMutation,
} from '../../data/repositories/onboarding.repository.impl';
import { useOnboardingStore } from '../providers/onboarding.store';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export function ImproveApplicationScreen() {
  const theme = useClinicTheme();
  const router = useRouter();
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const { setCurrentApplicationId, setIsSubmitting, isSubmitting } = useOnboardingStore();

  const { data: application, isLoading: isLoadingApp, error: appError, refetch: refetchApp } = 
    useApplicationDetailQuery(applicationId || '', { enabled: !!applicationId });

  const { data: validationReport, isLoading: isLoadingReport, error: reportError } = 
    useValidationReportQuery(applicationId || '', { enabled: !!applicationId });

  const resubmitMutation = useResubmitApplicationMutation(applicationId || '');

  useEffect(() => {
    if (applicationId) {
      setCurrentApplicationId(applicationId);
    }
  }, [applicationId, setCurrentApplicationId]);

  const handleResubmit = async () => {
    Alert.alert(
      'Resubmit Application',
      'Have you addressed all the issues? Your application will be reviewed again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await resubmitMutation.mutateAsync();
              
              Alert.alert(
                'Application Resubmitted',
                'Your application has been resubmitted for review. We will notify you once reviewed.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/'),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to resubmit application');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingApp || isLoadingReport) {
    return <LoadingScreen message="Loading validation report..." />;
  }

  if (appError || reportError) {
    return <ErrorScreen message={appError?.message || reportError?.message || 'Error loading data'} onRetry={refetchApp} />;
  }

  if (!application || !validationReport) {
    return <ErrorScreen message="Application or validation report not found" />;
  }

  const allIssues = [
    ...(validationReport.validation_errors || []),
    ...(validationReport.missing_fields || []),
    ...(validationReport.format_issues || []),
  ].filter(issue => issue && issue.field && issue.message); // Filter out invalid issues

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background.default }]}
      contentContainerStyle={{ padding: theme.spacing.lg }}
    >
      <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
        <Ionicons 
          name="construct-outline" 
          size={64} 
          color={theme.colors.feedback.warning} 
        />
        <Text style={[
          theme.typography.h3, 
          { 
            color: theme.colors.text.primary,
            marginTop: theme.spacing.md,
            textAlign: 'center' 
          }
        ]}>
          Improve Your Application
        </Text>
        <Text style={[
          theme.typography.body1, 
          { 
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.sm,
            textAlign: 'center' 
          }
        ]}>
          {application.tenant_name}
        </Text>
      </View>

      {/* Overall Score */}
      <View style={[
        styles.scoreCard, 
        { 
          backgroundColor: theme.colors.surface.default,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          borderRadius: 8 
        }
      ]}>
        <View style={[styles.scoreHeader, { marginBottom: theme.spacing.sm }]}>
          <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
            Application Score
          </Text>
          <Text style={[
            theme.typography.h4, 
            { 
              color: (validationReport.overall_score ?? 0) >= 0.7 
                ? theme.colors.feedback.success 
                : (validationReport.overall_score ?? 0) >= 0.4
                ? theme.colors.feedback.warning
                : theme.colors.feedback.error 
            }
          ]}>
            {Math.round((validationReport.overall_score ?? 0) * 100)}%
          </Text>
        </View>
        <Text style={[theme.typography.caption, { color: theme.colors.text.secondary }]}>
          Score above 70% increases approval chances
        </Text>
      </View>

      {/* Priority Fixes */}
      {(validationReport.priority_fixes?.length ?? 0) > 0 && (
        <View style={[
          styles.priorityCard, 
          { 
            backgroundColor: theme.colors.feedback.warningLight,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderRadius: 8 
          }
        ]}>
          <View style={[styles.priorityHeader, { marginBottom: theme.spacing.md }]}>
            <Ionicons name="flag" size={24} color={theme.colors.feedback.warning} />
            <Text style={[
              theme.typography.h6, 
              { 
                color: theme.colors.text.primary,
                marginLeft: theme.spacing.sm 
              }
            ]}>
              Priority Fixes
            </Text>
          </View>
          {(validationReport.priority_fixes || []).map((fix, index) => (
            <View 
              key={index} 
              style={[
                styles.priorityItem, 
                { marginBottom: theme.spacing.sm }
              ]}
            >
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={theme.colors.feedback.warning} 
              />
              <Text style={[
                theme.typography.body2, 
                { 
                  color: theme.colors.text.secondary,
                  marginLeft: theme.spacing.sm,
                  flex: 1 
                }
              ]}>
                {fix}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* All Issues */}
      <View style={[styles.issuesCard, { marginBottom: theme.spacing.xl }]}>
        <Text style={[
          theme.typography.h6, 
          { 
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md 
          }
        ]}>
          Issues to Address ({allIssues.length})
        </Text>
        {allIssues.map((issue, index) => (
          <View 
            key={index} 
            style={[
              styles.issueItem, 
              { 
                backgroundColor: theme.colors.surface.default,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.sm,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: 
                  (issue.priority || 'low') === 'high' 
                    ? theme.colors.feedback.error 
                    : (issue.priority || 'low') === 'medium'
                    ? theme.colors.feedback.warning
                    : theme.colors.feedback.info 
              }
            ]}
          >
            <View style={[styles.issueHeader, { marginBottom: theme.spacing.xs }]}>
              <Text style={[
                theme.typography.caption, 
                { 
                  color: theme.colors.text.tertiary,
                  textTransform: 'uppercase' 
                }
              ]}>
                {(issue.priority || 'low').toUpperCase()} Priority
              </Text>
            </View>
            <Text style={[
              theme.typography.body2, 
              { 
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.xs 
              }
            ]}>
              {(issue.field || 'Unknown field').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.text.secondary }]}>
              {issue.message || 'No details available'}
            </Text>
            {!!issue.example && (
              <Text style={[
                theme.typography.caption, 
                { 
                  color: theme.colors.feedback.info,
                  marginTop: theme.spacing.xs,
                  fontStyle: 'italic' 
                }
              ]}>
                Example: {issue.example}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={[
        styles.instructionsCard, 
        { 
          backgroundColor: theme.colors.feedback.infoLight,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.xl,
          borderRadius: 8 
        }
      ]}>
        <View style={[styles.instructionsHeader, { marginBottom: theme.spacing.sm }]}>
          <Ionicons name="information-circle" size={24} color={theme.colors.feedback.info} />
          <Text style={[
            theme.typography.h6, 
            { 
              color: theme.colors.text.primary,
              marginLeft: theme.spacing.sm 
            }
          ]}>
            How to Improve
          </Text>
        </View>
        <Text style={[
          theme.typography.body2, 
          { 
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm 
          }
        ]}>
          1. Contact support or your administrator to update your application details
        </Text>
        <Text style={[
          theme.typography.body2, 
          { 
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm 
          }
        ]}>
          2. Provide complete and authentic business information
        </Text>
        <Text style={[theme.typography.body2, { color: theme.colors.text.secondary }]}>
          3. Once updated, resubmit your application for review
        </Text>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={[
          styles.button, 
          { 
            backgroundColor: theme.colors.primary.default,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md 
          }
        ]}
        onPress={handleResubmit}
        disabled={isSubmitting}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.onPrimary }]}>
          {isSubmitting ? 'Resubmitting...' : 'Resubmit Application'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.secondaryButton, 
          { 
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
            borderRadius: 8 
          }
        ]}
        onPress={() => router.replace('/')}
        disabled={isSubmitting}
      >
        <Text style={[theme.typography.button, { color: theme.colors.text.primary }]}>
          Back to Home
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
  },
  scoreCard: {
    // Styles set inline with theme
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityCard: {
    // Styles set inline with theme
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  issuesCard: {
    // Styles set inline with theme
  },
  issueItem: {
    // Styles set inline with theme
  },
  issueHeader: {
    // Styles set inline with theme
  },
  instructionsCard: {
    // Styles set inline with theme
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
  },
});
