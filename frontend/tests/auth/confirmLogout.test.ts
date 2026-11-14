import { Alert } from 'react-native';
import { confirmLogout } from '../../features/auth/presentation/utils/confirmLogout';

const t = (key: string) => key;

describe('confirmLogout', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => { alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined); });
  afterEach(() => alert.mockRestore());

  const buttons = () => alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];

  it('asks with an in-app dialog (Alert.alert), never the browser confirm', () => {
    const confirm = jest.fn();
    (globalThis as { window?: unknown }).window = { confirm };
    const logout = jest.fn().mockResolvedValue(undefined);
    confirmLogout(t, logout);
    expect(alert).toHaveBeenCalledWith('navigation.logout', 'confirmations.logout', expect.any(Array));
    expect(confirm).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('signs out only when the user confirms', () => {
    const logout = jest.fn().mockResolvedValue(undefined);
    confirmLogout(t, logout);
    buttons().find(b => b.text === 'common.cancel')?.onPress?.();
    expect(logout).not.toHaveBeenCalled();
    buttons().find(b => b.text === 'navigation.logout')?.onPress?.();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('tells the user when signing out fails', async () => {
    const logout = jest.fn().mockRejectedValue(new Error('x'));
    confirmLogout(t, logout);
    buttons().find(b => b.text === 'navigation.logout')?.onPress?.();
    await Promise.resolve(); await Promise.resolve();
    expect(alert).toHaveBeenLastCalledWith('common.error', 'errors.auth.logoutFailed');
  });
});
