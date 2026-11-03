import React, { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { ConfirmationDialog } from './ConfirmationDialog';
import { currentWebAlert, resolveWebAlert, subscribeWebAlerts } from '../utils/webAlert';

/** Renders the alert queued by the web `Alert.alert` replacement as an in-app dialog (web only). */
export function WebAlertHost() {
  const alert = useSyncExternalStore(subscribeWebAlerts, currentWebAlert, currentWebAlert);
  if (Platform.OS !== 'web' || !alert) return null;
  const cancel = alert.buttons.length > 1 ? alert.buttons.find(button => button.style === 'cancel') ?? alert.buttons[0] : undefined;
  const confirm = alert.buttons.find(button => button !== cancel) ?? alert.buttons[0];
  return (
    <ConfirmationDialog
      key={alert.id}
      visible
      title={alert.title}
      message={alert.message ?? ''}
      confirmText={confirm.text ?? 'OK'}
      cancelText={cancel?.text ?? 'OK'}
      hideCancel={!cancel}
      destructive={confirm.style === 'destructive'}
      onConfirm={() => resolveWebAlert(confirm)}
      onCancel={() => resolveWebAlert(cancel ?? confirm)}
    />
  );
}
