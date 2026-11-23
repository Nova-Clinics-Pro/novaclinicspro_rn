import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useClinicTheme } from '../theme/useClinicTheme';
import { useTranslation } from '../localization/useTranslation';
import type { PrintPaper } from './printOptions';

interface Props {
  visible: boolean;
  onChoose: (paper: PrintPaper) => void;
  onCancel: () => void;
}

/** Asked before every print: is the paper plain (print the clinic's header and footer) or pre-printed letterhead (print the document only)? */
export const PrintPaperChoiceModal: React.FC<Props> = ({ visible, onChoose, onCancel }) => {
  const theme = useClinicTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const options: { paper: PrintPaper; label: string; hint: string }[] = [
    { paper: 'letterhead', label: t('print.paperChoice.letterhead'), hint: t('print.paperChoice.letterheadHint') },
    { paper: 'plain', label: t('print.paperChoice.plain'), hint: t('print.paperChoice.plainHint') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">{t('print.paperChoice.title')}</Text>
          {options.map(({ paper, label, hint }) => (
            <Pressable
              key={paper}
              testID={`print-paper-${paper}`}
              style={styles.option}
              onPress={() => onChoose(paper)}
              accessibilityRole="button"
              accessibilityLabel={`${label}. ${hint}`}
            >
              <Text style={styles.optionLabel}>{label}</Text>
              <Text style={styles.optionHint}>{hint}</Text>
            </Pressable>
          ))}
          <Pressable testID="print-paper-cancel" style={styles.cancel} onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (theme: ReturnType<typeof useClinicTheme>) => {
  const { colors, spacing, radii, borderWidths, sizes, typography } = theme;
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface.overlay },
    dialog: {
      width: sizes.dialogWidth,
      maxWidth: sizes.dialogMaxWidth,
      padding: spacing.md,
      gap: spacing.sm,
      borderRadius: radii.large,
      backgroundColor: colors.background.elevated,
    },
    title: { ...typography.h5, color: colors.text.primary, marginBottom: spacing.xs },
    option: {
      minHeight: sizes.touchTarget,
      padding: spacing.md,
      borderRadius: radii.medium,
      borderWidth: borderWidths.default,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
    },
    optionLabel: { ...typography.h6, color: colors.primary.default },
    optionHint: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.xs },
    cancel: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
    cancelLabel: { ...typography.button, color: colors.text.secondary },
  });
};
