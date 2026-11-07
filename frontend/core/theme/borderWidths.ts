/**
 * Border Width Tokens
 * Governed, reusable border-width scale. `hairline` is the platform's
 * own thinnest-renderable line (React Native's `StyleSheet.hairlineWidth`
 * — physically 1px on standard displays, sub-pixel on high-density
 * displays), used for subtle dividers. `default` is a standard 1
 * logical-pixel border, used for visible component/card boundaries.
 */
import { StyleSheet } from 'react-native';

export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  default: 1,
};
