/**
 * Reusable Size Tokens
 * Governed touch-target and icon-size scale — components must reference
 * these, never a raw pixel number, so accessible sizing and icon
 * consistency stay changeable from one place.
 */
export const sizes = {
  wideLayout: 768,
  adminCardMinWidth: 280,
  adminFourColumnLayout: 1280,
  selectMaxHeight: '80%' as const,
  dialogMaxWidth: 400,
  dialogWidth: '85%' as const,
  inputMultilineMinHeight: 80,
  /** Minimum accessible touch target (WCAG 2.5.5 / platform guidance). */
  touchTarget: 44,
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
};
