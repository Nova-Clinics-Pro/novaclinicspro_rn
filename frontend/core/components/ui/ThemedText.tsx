import React from 'react';
import { Text, TextProps } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { typography } from '../../theme/typography';

export function ThemedText({ variant = 'body2', children, ...props }: TextProps & { variant?: keyof typeof typography }) {
  const theme = useClinicTheme();
  return <Text {...props} style={[theme.typography[variant], { color: theme.colors.text.primary }, props.style]}>{children}</Text>;
}
