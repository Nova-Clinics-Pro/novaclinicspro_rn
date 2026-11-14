/**
 * Staff List Item Component
 * Displays a single staff member in a list
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../core/theme/colors';
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
              <Text style={[styles.typeText, { color: typeColor }]}>
                {getStaffTypeLabel(staff.staff_type)}
              </Text>
            </View>
            {!!staff.designation && (
              <Text style={styles.designation}>{staff.designation}</Text>
            )}
          </View>
          {!!staff.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={colors.text.secondary} />
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
                  ? colors.success.main
                  : colors.text.disabled,
              },
            ]}
          />
          {staff.has_login && (
            <Ionicons
              name="key-outline"
              size={16}
              color={colors.primary.main}
              style={styles.loginIcon}
            />
          )}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.secondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.primary,
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
    color: colors.text.secondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    ...typography.caption,
    color: colors.text.secondary,
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
