import { Alert, AlertButton, Platform } from 'react-native';

export type WebAlert = { id: number; title: string; message?: string; buttons: AlertButton[] };

/**
 * react-native-web ships `Alert.alert` as an empty function, so on the web every alert (validation,
 * success, error) and the button callbacks that follow it (for example navigation) silently never
 * run. Browser `window.confirm` is not an option either: embedded browsers suppress it and answer
 * "cancel". Alerts are therefore queued here and rendered in-app by `WebAlertHost`.
 */
let nextId = 1;
let queue: WebAlert[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

export const subscribeWebAlerts = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const currentWebAlert = (): WebAlert | null => queue[0] ?? null;

export const showWebAlert = (title: string, message?: string, buttons?: AlertButton[]): void => {
  queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] }];
  notify();
};

/** Removes the visible alert, then runs the chosen button's callback. */
export const resolveWebAlert = (button?: AlertButton): void => {
  queue = queue.slice(1);
  notify();
  button?.onPress?.();
};

export const installWebAlert = (): void => {
  if (Platform.OS === 'web') Alert.alert = showWebAlert;
};
