import React from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  href?: string;
  color?: string;
}

/**
 * QuickActionButton - A button for dashboard quick actions
 * 
 * Supports two modes:
 * 1. href prop (preferred): Uses expo-router Link for navigation
 * 2. onPress prop (fallback): Uses callback for custom actions
 */
export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onPress,
  href,
  color = colors.primary.main,
}) => {
  const buttonContent = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  // If href is provided, use Link for navigation (more reliable in Expo Router)
  if (href) {
    return (
      <Link href={href as any} asChild>
        <Pressable style={styles.button}>
          {buttonContent}
        </Pressable>
      </Link>
    );
  }

  // Fallback to onPress callback
  const handlePress = () => {
    console.log(`[QuickActionButton] Pressed: ${label}`);
    if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      {buttonContent}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    width: '30%',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
