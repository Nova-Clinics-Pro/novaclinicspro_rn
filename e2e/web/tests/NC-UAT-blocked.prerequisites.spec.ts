import { test } from '../fixtures';

/**
 * Scenarios that cannot run yet. They are registered so that they appear in every report as Blocked with the exact
 * prerequisite, never silently skipped and never counted as passed.
 */
const ONBOARDING = 'Prerequisite NC-UAT-05 fails (NC-WEB-001): the onboarding journey cannot load for a newly registered owner, so the clinic never becomes operational and no dashboard, patient, appointment or clinical UI is reachable.';
const STAFF = 'Also requires doctor/therapist staff accounts created through staff onboarding, which is not automated yet.';

const blocked: Array<{ id: string; title: string; clinic: 'ayurveda' | 'general' | 'n/a'; role: string; reason: string }> = [
  { id: 'NC-UAT-06', title: 'dashboard and role-based navigation', clinic: 'n/a', role: 'clinic_owner', reason: ONBOARDING },
  { id: 'NC-UAT-07', title: 'patient creation and search', clinic: 'n/a', role: 'clinic_owner', reason: ONBOARDING },
  { id: 'NC-UAT-08', title: 'appointment creation and details', clinic: 'n/a', role: 'clinic_owner', reason: ONBOARDING },
  { id: 'NC-UAT-09', title: 'consultation and case sheet', clinic: 'n/a', role: 'doctor', reason: `${ONBOARDING} ${STAFF}` },
  { id: 'NC-UAT-10', title: 'prescription and treatment', clinic: 'n/a', role: 'doctor', reason: `${ONBOARDING} ${STAFF}` },
  { id: 'NC-UAT-11', title: 'restart and data persistence of clinical records', clinic: 'n/a', role: 'clinic_owner', reason: `${ONBOARDING} (No clinical records can be created yet.)` },
  { id: 'NC-UAT-15', title: 'Ayurveda therapy appointment creation (UI)', clinic: 'ayurveda', role: 'clinic_owner', reason: `${ONBOARDING} ${STAFF}` },
  { id: 'NC-UAT-16', title: 'therapy scheduling conflict permutations (UI/API against live data)', clinic: 'ayurveda', role: 'clinic_owner', reason: `${ONBOARDING} ${STAFF} Comprehensive predicate coverage exists in the backend tests (tests/test_nc_uat_scheduling_rules.py).` },
];

for (const b of blocked) {
  test.describe(`${b.id} ${b.title}`, () => {
    test.use({ scenario: { id: b.id, clinicType: b.clinic as any, role: b.role } });
    test('blocked by documented prerequisite', async () => {
      test.skip(true, b.reason);
    });
  });
}
