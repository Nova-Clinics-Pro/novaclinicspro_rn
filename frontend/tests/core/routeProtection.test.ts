/**
 * Regression: NC-UAT-04. Authenticated route trees must be wrapped in
 * ProtectedRoute so that an anonymous visitor (or a visitor whose storage was
 * cleared) is redirected to /login instead of seeing the authenticated shell.
 * Backend authorization remains authoritative; this is the frontend guard.
 *
 * Every route file under app/ must either be explicitly public or be covered by
 * ProtectedRoute (in the file itself or an ancestor _layout).
 */
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(__dirname, '../../app');

/** Routes that are intentionally reachable without a session. */
const PUBLIC_ROUTES = new Set([
  '_layout.tsx',
  'index.tsx', // session router: redirects to /login or the right dashboard
  'login.tsx',
  'register.tsx',
  'forgot-password.tsx',
  'reset-password.tsx',
  'logout.tsx', // ends the session
  'localization.tsx', // language choice, available on the sign-in screen
  'theme-demo.tsx', // static theme gallery, no data
  'feedback/[token].tsx', // token-addressed public patient feedback link
]);

const walk = (dir: string, base = ''): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(base, entry.name);
    return entry.isDirectory() ? walk(path.join(dir, entry.name), rel) : /\.tsx?$/.test(entry.name) ? [rel] : [];
  });

const usesProtectedRoute = (file: string): boolean => /\bProtectedRoute\b/.test(fs.readFileSync(path.join(APP_DIR, file), 'utf8'));

const isCovered = (file: string): boolean => {
  if (usesProtectedRoute(file)) return true;
  const parts = file.split('/');
  for (let depth = parts.length - 1; depth > 0; depth -= 1) {
    const layout = [...parts.slice(0, depth), '_layout.tsx'].join('/');
    if (fs.existsSync(path.join(APP_DIR, layout)) && usesProtectedRoute(layout)) return true;
  }
  return false;
};

describe('route protection', () => {
  const files = walk(APP_DIR);

  it('discovers the route tree', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toEqual(expect.arrayContaining(['login.tsx', 'clinic-admin/_layout.tsx', 'onboarding/_layout.tsx']));
  });

  it.each(files.filter(f => !PUBLIC_ROUTES.has(f) && !f.endsWith('/_layout.tsx')))('%s is protected by ProtectedRoute', file => {
    expect(isCovered(file)).toBe(true);
  });

  it.each(['onboarding/_layout.tsx', 'clinic-admin/_layout.tsx', 'owner/_layout.tsx', 'super-admin/_layout.tsx'])(
    'layout %s wraps its screens in ProtectedRoute',
    layout => {
      expect(usesProtectedRoute(layout)).toBe(true);
    },
  );

  it('does not treat the public allow-list as protected (guard against accidental widening)', () => {
    for (const file of PUBLIC_ROUTES) {
      expect(fs.existsSync(path.join(APP_DIR, file))).toBe(true);
    }
  });
});
