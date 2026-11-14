/**
 * Job Status Panel Component
 * Displays the current status and summary of a bulk upload job
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  JobSummary,
  getJobStatusLabel,
  getJobStatusColor,
  isJobInProgress,
  formatPercentage,
} from '../../data/models/bulkUpload.dtos';

interface JobStatusPanelProps {
  job: JobSummary;
}

export const JobStatusPanel: React.FC<JobStatusPanelProps> = ({ job }) => {
  const statusColor = getJobStatusColor(job.status);
  const inProgress = isJobInProgress(job.status);
  const successRate =
    job.total_rows > 0
      ? formatPercentage(job.valid_rows, job.total_rows)
      : '0%';

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          {inProgress ? (
            <ActivityIndicator size="small" color={statusColor} />
          ) : (
            <Ionicons
              name={
                job.status === 'committed'
                  ? 'checkmark-circle'
                  : job.status === 'failed'
                  ? 'close-circle'
                  : 'time'
              }
              size={20}
              color={statusColor}
            />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getJobStatusLabel(job.status)}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{job.total_rows}</Text>
          <Text style={styles.statLabel}>Total Rows</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success.main }]}>
            {job.valid_rows}
          </Text>
          <Text style={styles.statLabel}>Valid</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error.main }]}>
            {job.invalid_rows}
          </Text>
          <Text style={styles.statLabel}>Invalid</Text>
        </View>
        {job.committed_rows > 0 && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary.main }]}>
              {job.committed_rows}
            </Text>
            <Text style={styles.statLabel}>Committed</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {job.total_rows > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(job.valid_rows / job.total_rows) * 100}%`,
                  backgroundColor: colors.success.main,
                },
              ]}
            />
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(job.invalid_rows / job.total_rows) * 100}%`,
                  backgroundColor: colors.error.main,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{successRate} valid</Text>
        </View>
      )}

      {/* File Info */}
      {!!job.filename && (
        <View style={styles.fileInfo}>
          <Ionicons name="document" size={16} color={colors.text.tertiary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {job.filename}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    ...typography.body2,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h5,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: colors.grey[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  fileName: {
    ...typography.caption,
    color: colors.text.tertiary,
    flex: 1,
  },
});
