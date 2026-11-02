import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useClinicTheme } from '../../theme/useClinicTheme';
import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';
import { t } from '../../localization';

export function ThemedSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const theme = useClinicTheme();
  return <View>
    <ThemedButton variant="outline" icon="chevron-down" accessibilityLabel={label} label={options.find(o => o.value === value)?.label ?? label} disabled={disabled} onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface.overlay }}>
        <View accessibilityViewIsModal style={{ width: theme.sizes.dialogWidth, maxWidth: theme.sizes.dialogMaxWidth, maxHeight: theme.sizes.selectMaxHeight, backgroundColor: theme.colors.surface.default, borderRadius: theme.radii.medium, padding: theme.spacing.md, gap: theme.spacing.sm }}>
          <ThemedText variant="subtitle1">{label}</ThemedText>
          <ScrollView>{options.map(o => <ThemedButton key={o.value} variant="subtle" label={o.label} selected={o.value === value} onPress={() => { onChange(o.value); setOpen(false); }} />)}</ScrollView>
          <ThemedButton variant="outline" label={t('common.close')} onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </View>;
}
