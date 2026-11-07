import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('explicit logout orchestration boundary', () => {
  it('keeps useAuth as a compatibility facade over the one application command', () => {
    const source = read('features/auth/presentation/hooks/useAuth.ts');

    expect(source).toContain('unifiedLogoutService.logout');
    expect(source).not.toContain('notificationDeviceLifecycleService');
    expect(source).not.toContain('signOutProviderBestEffort');
    expect(source).not.toContain('queryClient.cancelQueries');
  });

  it('keeps the logout route free of notification/provider orchestration', () => {
    const source = read('app/logout.tsx');

    expect(source).toContain('await logout()');
    expect(source).not.toContain('expoPushService');
    expect(source).not.toContain('unregisterDeviceApi');
    expect(source).not.toContain('router.replace');
  });

  it('keeps direct provider sign-out and device unregister restricted to their canonical owners', () => {
    const authService = read('features/auth/application/auth-session.service.ts');
    const notificationService = read('features/notifications/application/notification-device-lifecycle.service.ts');
    const logoutRoute = read('app/logout.tsx');

    expect(authService).toContain('supabaseAuthProvider.signOut');
    expect(notificationService).toContain('expoPushService.unregisterDevice');
    expect(logoutRoute).not.toContain('signOut');
    expect(logoutRoute).not.toContain('unregister');
  });
});
