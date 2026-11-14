/**
 * Feedback List Item Component
 * Displays a single feedback entry in a list
 */

import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import { StarRatingDisplay } from './StarRatingDisplay';
import { formatFeedbackDate, formatSubmittedAt } from '../../domain/entities/feedback.entity';
import type { StaffFeedbackItem } from '../../data/models/feedback.dtos';

interface FeedbackListItemProps {
  item: StaffFeedbackItem;
  onPress?: () => void;
  testID?: string;
}

export const FeedbackListItem: React.FC<FeedbackListItemProps> = ({
  item,
  onPress,
  testID,
}) => {
  const needsAttention = item.needs_attention || item.rating <= 2;

  return (
    <TouchableOpacity
      style={[styles.container, needsAttention && styles.containerAttention]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      testID={testID}
    >
      <View style={styles.header}>
        <StarRatingDisplay rating={item.rating} size={14} />
        {needsAttention && (
          <View style={styles.attentionBadge}>
            <Ionicons name="alert-circle" size={12} color={colors.error.main} />
            <Text style={styles.attentionText}>Needs Attention</Text>
          </View>
        )}
      </View>

      {!!item.comments && (
        <Text style={styles.comments} numberOfLines={3}>
          &ldquo;{item.comments}&rdquo;
        </Text>
      )}

      {Object.keys(item.question_scores).length > 0 && (
        <View style={styles.scoresContainer}>
          {Object.entries(item.question_scores).slice(0, 3).map(([key, score]) => (
            <View key={key} style={styles.scoreBadge}>
              <Text style={styles.scoreLabel}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <Text style={styles.scoreValue}>{score}/5</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
          <Text style={styles.dateText}>
            {formatFeedbackDate(item.appointment_date)}
          </Text>
        </View>
        <Text style={styles.submittedText}>
          Submitted {formatSubmittedAt(item.submitted_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  containerAttention: {
    borderColor: colors.error.light,
    borderLeftWidth: 3,
    borderLeftColor: colors.error.main,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  attentionText: {
    ...typography.caption,
    color: colors.error.main,
    fontWeight: '600',
  },
  comments: {
    ...typography.body2,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  scoresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  scoreValue: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  submittedText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});

export default FeedbackListItem;
