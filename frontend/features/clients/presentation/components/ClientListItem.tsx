/**
 * Client List Item Component
 * Displays a single client in a list
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
  ClientResponse,
  getGenderColor,
  formatPhone,
} from '../../data/models/clients.dtos';

interface ClientListItemProps {
  client: ClientResponse;
  onPress: (client: ClientResponse) => void;
}

export const ClientListItem: React.FC<ClientListItemProps> = React.memo(function ClientListItem({ client, onPress }) {
  const genderColor = getGenderColor(client.gender);
  const displayAge = client.age || (client.date_of_birth ? calculateAge(client.date_of_birth) : null);

  const handlePress = React.useCallback(() => {
    onPress(client);
  }, [client, onPress]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: genderColor + '20' }]}>
          <Ionicons name="person" size={24} color={genderColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{client.full_name}</Text>
          <View style={styles.metaRow}>
            {client.gender && (
              <View style={[styles.genderBadge, { backgroundColor: genderColor + '15' }]}>
                <Text style={[styles.genderText, { color: genderColor }]}>
                  {client.gender}
                </Text>
              </View>
            )}
            {displayAge && (
              <Text style={styles.ageText}>{displayAge} yrs</Text>
            )}
          </View>
          {client.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.contactText}>
                {formatPhone(client.phone, client.mobile_code)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.rightSection}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: client.is_active
                  ? colors.success.main
                  : colors.text.disabled,
              },
            ]}
          />
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.secondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Helper function
const calculateAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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
    gap: spacing.sm,
  },
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genderText: {
    ...typography.caption,
    fontWeight: '600',
  },
  ageText: {
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
});
