/**
 * Episode Visits Section Component
 * Displays list of appointments/visits in an episode
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../../../../core/theme/useClinicTheme';
import { useAppointmentsListQuery } from '../../../appointments/data/repositories/appointments.repository.impl';
import { AppointmentResponse } from '../../../appointments/data/models/appointments.dtos';
import { formatDate, formatTime } from '../../../../core/utils/dateTimeUtils';
import { getStatusLabel, getStatusColor, getStaffName } from '../../../appointments/domain/helpers';

// ============================================
// TYPES
// ============================================

interface EpisodeVisitsSectionProps {
  tenantId: string;
  episodeId: string;
  onVisitPress?: (appointmentId: string) => void;
}

// ============================================
// VISIT ITEM COMPONENT
// ============================================

interface VisitItemProps {
  appointment: AppointmentResponse;
  onPress?: () => void;
}

const VisitItem: React.FC<VisitItemProps> = ({ appointment, onPress }) => {
  const theme = useClinicTheme();
  const statusColor = getStatusColor(appointment.status);

  return (
    <TouchableOpacity
      style={[styles.visitItem, { backgroundColor: theme.colors.background.default }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.visitHeader}>
        <View style={styles.visitDateTimeContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDate, { color: theme.colors.text.primary }]}>
            {formatDate(appointment.appointment_start)}
          </Text>
          <Ionicons name="time-outline" size={16} color={theme.colors.text.tertiary} style={styles.timeIcon} />
          <Text style={[styles.visitTime, { color: theme.colors.text.secondary }]}>
            {formatTime(appointment.appointment_start)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusLabel(appointment.status)}
          </Text>
        </View>
      </View>

      {getStaffName(appointment) !== 'Unassigned' && (
        <View style={styles.visitDetail}>
          <Ionicons name="person-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDetailText, { color: theme.colors.text.secondary }]}>
            {getStaffName(appointment)}
          </Text>
        </View>
      )}

      {!!appointment.treatment_name && (
        <View style={styles.visitDetail}>
          <Ionicons name="medical-outline" size={14} color={theme.colors.text.tertiary} />
          <Text style={[styles.visitDetailText, { color: theme.colors.text.secondary }]}>
            {appointment.treatment_name}
          </Text>
        </View>
      )}

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EpisodeVisitsSection: React.FC<EpisodeVisitsSectionProps> = ({
  tenantId,
  episodeId,
  onVisitPress,
}) => {
  const theme = useClinicTheme();

  const { data, isLoading, error, refetch } = useAppointmentsListQuery(
    tenantId,
    { episode_id: episodeId, skip: 0, limit: 50 },
    { enabled: !!tenantId && !!episodeId }
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Visits in This Episode
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.default} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading visits...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Visits in This Episode
        </Text>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.feedback.error} />
          <Text style={[styles.errorText, { color: theme.colors.text.secondary }]}>
            Failed to load visits
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.default }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.background.default }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const appointments = data?.items || [];

  // Empty state
  if (appointments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Visits in This Episode
        </Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
            No visits in this episode
          </Text>
        </View>
      </View>
    );
  }

  // Visits list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Visits in This Episode
        </Text>
        <View style={[styles.countBadge, { backgroundColor: theme.colors.primary.light }]}>
          <Text style={[styles.countText, { color: theme.colors.primary.default }]}>
            {appointments.length}
          </Text>
        </View>
      </View>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VisitItem
            appointment={item}
            onPress={() => onVisitPress?.(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    gap: 12,
  },
  visitItem: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeIcon: {
    marginLeft: 8,
  },
  visitTime: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  visitDetailText: {
    fontSize: 13,
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
