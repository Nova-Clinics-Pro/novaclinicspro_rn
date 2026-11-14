import { Alert } from 'react-native';

type Translate = (key: string) => string;

/**
 * Ask the user to confirm signing out, on every platform.
 *
 * Uses `Alert.alert`, which the app renders as an in-app dialog on the web (see `core/utils/webAlert`). The
 * browser's `window.confirm` must not be used: embedded and some mobile browsers suppress it and answer
 * "cancel", so the Logout button appeared to do nothing.
 */
export const confirmLogout = (t: Translate, logout: () => Promise<void>): void => {
  Alert.alert(t('navigation.logout'), t('confirmations.logout'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('navigation.logout'),
      style: 'destructive',
      onPress: () => {
        void logout().catch(() => Alert.alert(t('common.error'), t('errors.auth.logoutFailed')));
      },
    },
  ]);
};
