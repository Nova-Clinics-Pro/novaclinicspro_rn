import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface EpisodeDetailMetadataGridProps {
  startDateText?: string | null;
  endDateText?: string | null;
  lastVisitDateText?: string | null;
  showEndDate: boolean;
  showLastVisit: boolean;
  visitsCount?: number | null;
  textColors: Readonly<{ primary: string; tertiary: string }>;
}

/** Display resolved metadata; formatting, visibility decisions and state stay in the screen. */
export const EpisodeDetailMetadataGrid: React.FC<EpisodeDetailMetadataGridProps> = ({
  startDateText,
  endDateText,
  lastVisitDateText,
  showEndDate,
  showLastVisit,
  visitsCount,
  textColors,
}) => (
  <View style={styles.metadataGrid}>
    <View style={styles.metadataItem}>
      <Ionicons name="calendar-outline" size={16} color={textColors.tertiary} />
      <Text style={[styles.metadataLabel, { color: textColors.tertiary }]}>
        Start Date
      </Text>
      <Text style={[styles.metadataValue, { color: textColors.primary }]}>
        {startDateText}
      </Text>
    </View>

    {showEndDate && (
      <View style={styles.metadataItem}>
        <Ionicons name="calendar-outline" size={16} color={textColors.tertiary} />
        <Text style={[styles.metadataLabel, { color: textColors.tertiary }]}>
          End Date
        </Text>
        <Text style={[styles.metadataValue, { color: textColors.primary }]}>
          {endDateText}
        </Text>
      </View>
    )}

    {showLastVisit && (
      <View style={styles.metadataItem}>
        <Ionicons name="time-outline" size={16} color={textColors.tertiary} />
        <Text style={[styles.metadataLabel, { color: textColors.tertiary }]}>
          Last Visit
        </Text>
        <Text style={[styles.metadataValue, { color: textColors.primary }]}>
          {lastVisitDateText}
        </Text>
      </View>
    )}

    <View style={styles.metadataItem}>
      <Ionicons name="medical-outline" size={16} color={textColors.tertiary} />
      <Text style={[styles.metadataLabel, { color: textColors.tertiary }]}>
        Total Visits
      </Text>
      <Text style={[styles.metadataValue, { color: textColors.primary }]}>
        {visitsCount}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  metadataLabel: {
    fontSize: 12,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
