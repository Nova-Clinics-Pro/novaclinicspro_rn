/**
 * Architecture guard: screens never decide what a user MAY DO from role names.
 *
 * Why this exists. Actions were offered from hand-written lists of role names (`['clinic_admin', 'doctor'].includes(role)`)
 * and from `roles[0]`. Each list was a copy that drifted from what the backend enforces: the Clinic Owner and later a new
 * Clinic Admin were hidden from actions the server allows, a user with an unlisted role was bounced between two guards
 * forever, and the same bug came back in every clinic. The backend is the authority:
 *
 *  - what a user may DO     -> their effective permissions (`currentUser.permissions`), via the *Access helpers
 *                              (appointmentActionAccess, episodeActionAccess, clinicalAuthoringAccess, ...);
 *  - which dashboard to open -> `features/auth/domain/dashboardRoute` (the single authority for every guard/redirect).
 *
 * A role may still choose how a screen is LAID OUT (doctor view vs front-desk view); that is presentation, not
 * authorization, and each such file is listed below with its reason. Adding a file here needs the same justification.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'features', 'core'];

/** file (relative to the frontend root) -> why a role name is legitimately used there. */
const PRESENTATION_ONLY: Record<string, string> = {
  'features/appointments/presentation/pages/PreviewAppointmentsScreen.tsx':
    'chooses which workspace mode (doctor/admin) a visit opens in; the destination enforces permissions itself',
  'features/appointments/presentation/pages/AppointmentsListScreen.tsx':
    'passes the role to AppointmentRow, which uses it only to pick the doctor/therapist/front-desk card layout',
};

// The signed-in user's first role (not a clinic's list of roles, which is also called `roles` in the permissions tool).
const ROLE_FIRST = /(currentUser|user|session)\??\.roles\??\.?\[0\]/;
const ROLE_NAME_LIST = /\[[^\]]*['"](clinic[ _-]admin|clinic[ _-]owner|tenant[ _-]admin|receptionist)['"][^\]]*\]\s*\.includes\(/;

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

describe('no role-name authorization in screens', () => {
  const offenders: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (PRESENTATION_ONLY[rel]) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (isComment(line)) return;
          if (ROLE_FIRST.test(line) || ROLE_NAME_LIST.test(line)) offenders.push(`${rel}:${index + 1}  ${line.trim()}`);
        });
    }
  }

  it('uses permissions (or the dashboardRoute authority), never roles[0] or a list of role names', () => {
    expect(offenders).toEqual([]);
  });

  it('every allow-listed file still exists (remove an entry when its file goes away)', () => {
    for (const rel of Object.keys(PRESENTATION_ONLY)) {
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    }
  });
});
