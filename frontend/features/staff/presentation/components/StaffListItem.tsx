/**
 * Staff List Item Component
 * Displays a single staff member in a list
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme, type ClinicTheme } from '../../../../core/theme/useClinicTheme';
import { spacing } from '../../../../core/theme/spacing';
import { typography } from '../../../../core/theme/typography';
import {
  StaffResponse,
  getStaffTypeLabel,
  getStaffTypeColor,
} from '../../data/models/staff.dtos';

interface StaffListItemProps {
  staff: StaffResponse;
  onPress: (staff: StaffResponse) => void;
}

export const StaffListItem: React.FC<StaffListItemProps> = ({ staff, onPress }) => {
  const theme = useClinicTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const typeColor = getStaffTypeColor(staff.staff_type);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(staff)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: typeColor + '20' }]}>
          <Ionicons name="person" size={24} color={typeColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{staff.full_name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '15' }]}>
              <Text style={[styles.typeText, { color: theme.colors.text.primary }]}>
                {getStaffTypeLabel(staff.staff_type)}
              </Text>
            </View>
            {!!staff.designation && (
              <Text style={styles.designation}>{staff.designation}</Text>
            )}
          </View>
          {!!staff.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.contactText}>{staff.phone}</Text>
            </View>
          )}
        </View>
        <View style={styles.rightSection}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: staff.is_active
                  ? theme.colors.feedback.success
                  : theme.colors.text.disabled,
              },
            ]}
          />
          {staff.has_login && (
            <Ionicons
              name="key-outline"
              size={16}
              color={theme.colors.primary.default}
              style={styles.loginIcon}
            />
          )}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.text.secondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: ClinicTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body1,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  designation: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    ...typography.caption,
    color: theme.colors.text.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loginIcon: {
    marginLeft: 4,
  },
});
