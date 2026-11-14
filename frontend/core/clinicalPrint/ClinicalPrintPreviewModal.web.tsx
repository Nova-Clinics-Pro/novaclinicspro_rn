import React, { useRef } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useClinicTheme } from '../theme/useClinicTheme';
import { printFrame, type PrintableFrame } from './webPrint';

interface Props {
  visible: boolean;
  html: string;
  title?: string;
  onClose: () => void;
}

/**
 * Web version of the print preview. `react-native-webview` does not support the web ("React Native WebView does not
 * support this platform"), so the native component showed an empty preview and nothing could be printed. Here the document
 * is shown in an iframe and the Print button prints that iframe. Metro picks this file on web and the `.tsx` one on
 * iOS/Android.
 */
export const ClinicalPrintPreviewModal: React.FC<Props> = ({ visible, html, title = 'Print Preview', onClose }) => {
  const theme = useClinicTheme();
  const frameRef = useRef<PrintableFrame | null>(null);
  if (!visible) return null;

  const handlePrint = () => {
    if (!printFrame(frameRef.current)) {
      Alert.alert('Print failed', 'The document is not ready to print yet. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: title });
        return;
      }
      Alert.alert('Share unavailable', 'Your browser does not support sharing. Use Print and choose "Save as PDF".');
    } catch (err: unknown) {
      // The user dismissing the browser's share sheet is not an error.
      if ((err as { name?: string })?.name !== 'AbortError') {
        Alert.alert('Share failed', 'Unable to share this document.');
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle, backgroundColor: theme.colors.background.elevated }]}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handlePrint}
              style={[styles.actionButton, { borderColor: theme.colors.border.subtle }]}
              accessibilityRole="button"
              accessibilityLabel="Print document"
            >
              <Ionicons name="print-outline" size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.actionButton, { borderColor: theme.colors.border.subtle }]}
              accessibilityRole="button"
              accessibilityLabel="Share document"
            >
              <Ionicons name="share-outline" size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close print preview">
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.frameHost}>
          {React.createElement('iframe', {
            ref: (node: unknown) => {
              frameRef.current = node as PrintableFrame | null;
            },
            srcDoc: html,
            title,
            'data-testid': 'print-preview-frame',
            style: { flex: 1, width: '100%', height: '100%', border: 0, backgroundColor: '#ffffff' },
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: { padding: 8 },
  frameHost: { flex: 1 },
});
