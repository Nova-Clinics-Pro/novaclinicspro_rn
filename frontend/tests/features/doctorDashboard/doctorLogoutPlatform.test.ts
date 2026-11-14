import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) => fs.readFileSync(path.resolve(__dirname, '../../..', relative), 'utf8');

describe('Logout confirmation on every dashboard', () => {
  it.each(['app/doctor.tsx', 'app/owner/index.tsx', 'app/clinic-admin/index.tsx'])(
    '%s confirms with the shared in-app dialog, never the browser confirm',
    (file) => {
      const source = read(file);
      expect(source).toContain('confirmLogout(t, logout)');
      // The browser's window.confirm is suppressed by embedded browsers, which answer "cancel": the button did nothing.
      expect(source).not.toContain('window.confirm');
    },
  );

  it('the shared helper uses Alert.alert, which the web app renders as an in-app dialog', () => {
    const helper = read('features/auth/presentation/utils/confirmLogout.ts');
    expect(helper).toContain('Alert.alert(');
    expect(helper).not.toMatch(/window\.confirm\(/);
  });
});
