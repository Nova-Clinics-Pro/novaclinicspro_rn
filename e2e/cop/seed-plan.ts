/**
 * COP seed plan: every step, in the order the APP requires, with the rule that forces the order.
 * Each "appRule" was read from the backend code (file noted), not assumed.
 * `seeded: false` steps are not created by the seeder: the workbook's test cases create them, because they ARE the
 * behaviour under test (bookings, clinical documents, billing). They are listed so the dependency chain is complete.
 */
export type Method = 'API' | 'API (UI bulk upload possible)' | 'API + approval' | 'Test cases (UI)';

export interface SeedStep {
  id: string;
  title: string;
  dependsOn: string[];
  method: Method;
  creates: string;
  /** Why the step comes where it does: the rule in the app that needs the earlier step. */
  appRule: string;
  /** What the seeder checks after the step (re-reads the data). */
  verify: string;
  /** Workbook cases that cannot run until this step is done. */
  unlocks: string[];
  seeded: boolean;
}

export const PLAN: SeedStep[] = [
  {
    id: 'S01', title: 'Clinic and owner exist', dependsOn: [], method: 'API', seeded: true,
    creates: 'Tenant (Ayurveda or General) and owner login (register-owners.ts, same call as the app). The seeder then reconciles the owner\'s token.',
    appRule: 'Every record is tenant-scoped. A new owner\'s token has no clinic claim until the app\'s clinic-entry handoff (POST /auth/organizations/{org}/session-refresh, then a fresh token); until then every clinic route answers 403 "No tenant_id in JWT token".',
    verify: 'Clinic name starts with NC-*-UAT- (never seed a real clinic); /auth/me no longer asks for a session refresh; a clinic-scoped call (GET /rooms) answers 200.',
    unlocks: ['TC_COP_SET_001', 'TC_COP_SET_002'],
  },
  {
    id: 'S02', title: 'Read the clinic rules in force', dependsOn: ['S01'], method: 'API', seeded: true,
    creates: 'Nothing. Records gender matching, therapy and treatment-sheet settings for the specs to branch on.',
    appRule: 'Gender matching and booking enforcement (flexible = warn and flag, strict = reject) are tenant rules (services/appointment_validation_service.py). Expected results of CNF_004..CNF_009 depend on them.',
    verify: 'GET /tenants/{id}/features answers 200.',
    unlocks: ['TC_COP_CNF_004', 'TC_COP_CNF_005', 'TC_COP_ADM_007', 'TC_COP_ADM_008'],
  },
  {
    id: 'S03', title: 'Operating hours, break and weekly off', dependsOn: ['S01'], method: 'API', seeded: true,
    creates: '09:00-18:00, break 13:00-14:00, Monday-Saturday open, Sunday closed.',
    appRule: 'Booking checks overlap first, then past date, operating hours, break and weekly off (appointment_validation_service.py). Without hours the checks have nothing to compare against.',
    verify: 'GET /operating-hours returns 7 days.',
    unlocks: ['TC_COP_ADM_003', 'TC_COP_CNF_006', 'TC_COP_CNF_007', 'TC_COP_CNF_008'],
  },
  {
    id: 'S04', title: 'Rooms by purpose', dependsOn: ['S01'], method: 'API', seeded: true,
    creates: 'C-1, C-2 (consultation); T-1, T-2 (therapy).',
    appRule: 'Appointments reference a room id. Room type is what the room-purpose rule will use (README §5-16: not enforced yet).',
    verify: 'GET /rooms lists the four rooms, each with the wanted room_type.',
    unlocks: ['TC_COP_SET_004', 'TC_COP_ADM_004', 'TC_COP_RCP_005', 'TC_COP_RCP_008', 'TC_COP_CNF_003'],
  },
  {
    id: 'S05', title: 'Staff (no login)', dependsOn: ['S01'], method: 'API', seeded: true,
    creates: 'Admin, receptionist, doctors D1 and D2, therapists T1 (f), T2 (m), T3 (f), pharmacist, nurse.',
    appRule: 'Gender is required (the Ayurveda rule matches therapist to patient gender). staff_type decides the role (doctor, physiotherapist and dentist map to Doctor). requires_login=false makes a database row only: no Auth user, no email.',
    verify: 'GET /staff lists the nine members, each with the wanted staff_type.',
    unlocks: ['TC_COP_SET_003', 'TC_COP_RCP_004', 'TC_COP_RCP_006', 'TC_COP_CNF_001', 'TC_COP_CNF_002'],
  },
  {
    id: 'S06', title: 'Treatment category', dependsOn: ['S01'], method: 'API', seeded: true,
    creates: 'Nothing. Reads the active categories and picks therapy (Ayurveda) or general (General clinic).',
    appRule: 'tenant_treatments.category_code is a foreign key to the category table, so a treatment cannot be created with a code that is not active (treatments_router.py).',
    verify: 'GET /clinic/treatment-categories contains the chosen code.',
    unlocks: ['TC_COP_SET_005'],
  },
  {
    id: 'S07', title: 'Treatments', dependsOn: ['S06'], method: 'API (UI bulk upload possible)', seeded: true,
    creates: 'Abhyanga (60 min, 1500), Shirodhara (45 min, 1800).',
    appRule: 'Needs the category code from S06 and the treatment.update permission (the owner has it). A therapy appointment references the treatment id.',
    verify: 'Each treatment is found by name in GET /treatments.',
    unlocks: ['TC_COP_SET_005', 'TC_COP_RCP_006', 'TC_COP_RCP_007', 'TC_COP_DOC_014'],
  },
  {
    id: 'S08', title: 'Inventory stock', dependsOn: ['S01'], method: 'API (UI bulk upload possible)', seeded: true,
    creates: 'Sesame oil 1000 ml; herbal powder 0 g; tablet X 10 strips (reorder point 20).',
    appRule: 'Independent of treatments, but must exist before a usable can point at it. The zero and below-reorder items drive the low-stock and insufficient-stock cases.',
    verify: 'GET /inventory lists the three items (found by name).',
    unlocks: ['TC_COP_SET_006', 'TC_COP_ADM_012'],
  },
  {
    id: 'S09', title: 'Therapy usables (consumables)', dependsOn: ['S07', 'S08'], method: 'API', seeded: true,
    creates: 'Abhyanga uses sesame oil, 50 ml per session.',
    appRule: 'A usable links one treatment to one stock item (therapy-usables needs treatment_id, inventory_item_id, quantity and unit). Session completion reads it to know what to deduct.',
    verify: 'The usable is found in GET /therapy-usables for its treatment.',
    unlocks: ['TC_COP_SET_005', 'TC_COP_THR_007', 'TC_COP_THR_008', 'TC_COP_THR_009', 'TC_COP_JRN_011'],
  },
  {
    id: 'S10', title: 'Patients', dependsOn: ['S01'], method: 'API (UI bulk upload possible)', seeded: true,
    creates: 'P-Male, P-Female, P-Female2, P-Female3, P-Minor.',
    appRule: 'Phone and gender are required by the server. Booking refuses a patient who already has an appointment at that time BEFORE it checks therapist or room, so each conflict case needs its own patient or the wrong rule would be tested. Date of birth gives the age.',
    verify: 'GET /clients lists the five patients (found by name).',
    unlocks: ['TC_COP_SET_007', 'TC_COP_RCP_004', 'TC_COP_CNF_001', 'TC_COP_CNF_002', 'TC_COP_CNF_003'],
  },
  {
    id: 'S11', title: 'Workspace preparation', dependsOn: ['S03', 'S04', 'S05', 'S07'], method: 'API', seeded: true,
    creates: 'The clinic workspace is prepared (the app starts this from the setup wizard\'s final review).',
    appRule: 'Ready-to-start has two providers: journey setup progress (satisfied by S03-S07, which the app tracks automatically) and workspace preparation (a BLOCKER until it has run). The trial cannot start before the clinic is ready.',
    verify: 'POST /onboarding/{tenant}/workspace-preparation, then GET until state is PERSONALIZATION_AVAILABLE.',
    unlocks: ['TC_COP_SET_002'],
  },
  {
    id: 'S12', title: 'Commercial trial activated', dependsOn: ['S11'], method: 'API', seeded: true,
    creates: 'An ACTIVE commercial trial with a future expiry.',
    appRule: 'Operational actions (booking an appointment and the like) are refused with COMMERCIAL_ENTITLEMENT_REQUIRED until the clinic has an active trial or paid subscription (commercial_entitlement_service.py). Setting up rooms, staff, stock and patients is not gated, which is why S03-S10 worked first.',
    verify: 'GET /onboarding/{tenant}/commercial-trial shows state ACTIVE with expires_at in the future.',
    unlocks: ['TC_COP_RCP_004', 'TC_COP_RCP_006', 'TC_COP_CNF_001', 'TC_COP_CNF_002', 'TC_COP_CNF_003'],
  },
  {
    id: 'S13', title: 'Role logins', dependsOn: ['S05'], method: 'API + approval', seeded: false,
    creates: 'Logins for admin, receptionist, doctor, therapist. Sends activation emails and is rate limited: needs the owner\'s approval, then seed.ts --with-logins.',
    appRule: 'Clinical authoring (episode, case sheet, prescription, treatment sheet) is Doctor-only, so the doctor cases need a real doctor session. The owner cannot do them.',
    verify: 'GET /staff?has_login=true lists the members.',
    unlocks: ['TC_COP_ADM_017', 'TC_COP_RCP_001', 'TC_COP_DOC_001', 'TC_COP_THR_001'],
  },
  {
    id: 'S14', title: 'Appointments', dependsOn: ['S03', 'S04', 'S05', 'S07', 'S10', 'S12'], method: 'Test cases (UI)', seeded: false,
    creates: 'Doctor consultation, single therapy, 7-day series. Created by 03_Receptionist and 08_Conflicts.',
    appRule: 'Needs a patient, a doctor or therapist, a room and (for therapy) a treatment, inside operating hours, and an active commercial trial (S12).',
    verify: 'Each test asserts its own booking.',
    unlocks: ['TC_COP_RCP_004', 'TC_COP_RCP_006', 'TC_COP_RCP_010'],
  },
  {
    id: 'S15', title: 'Episode, case sheet, prescription', dependsOn: ['S10', 'S13', 'S14'], method: 'Test cases (UI)', seeded: false,
    creates: 'One episode, one case sheet, a signed prescription. Created by 04_Doctor.',
    appRule: 'Episode needs a patient and a doctor session. The case sheet belongs to the episode (one per episode, README §5-1).',
    verify: 'Each test asserts its own document.',
    unlocks: ['TC_COP_DOC_005', 'TC_COP_DOC_007', 'TC_COP_DOC_010'],
  },
  {
    id: 'S16', title: 'Treatment sheet and order', dependsOn: ['S07', 'S15'], method: 'Test cases (UI)', seeded: false,
    creates: '7-day treatment sheet, ordered. Created by 04_Doctor, scheduled by 03_Receptionist.',
    appRule: 'A treatment sheet hangs on the episode and uses treatments from S07. Ordering puts it in the front-desk scheduling worklist.',
    verify: 'Each test asserts its own state.',
    unlocks: ['TC_COP_DOC_014', 'TC_COP_RCP_016', 'TC_COP_RCP_017', 'TC_COP_JRN_005'],
  },
  {
    id: 'S17', title: 'Session completion, billing, stock', dependsOn: ['S09', 'S14', 'S16'], method: 'Test cases (UI)', seeded: false,
    creates: 'Completed session, invoice, payment, stock movement. Created by 05_Therapist and 03_Receptionist.',
    appRule: 'Consumables come from the usable (S09). Stock should fall only after the bill is created and paid (README §5-15).',
    verify: 'Each test asserts its own result.',
    unlocks: ['TC_COP_THR_007', 'TC_COP_THR_009', 'TC_COP_JRN_012'],
  },
];

/** Dependency order. Throws on an unknown dependency or a cycle, so a wrong plan cannot be run. */
export function orderPlan(plan: SeedStep[] = PLAN): SeedStep[] {
  const byId = new Map(plan.map(s => [s.id, s]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const out: SeedStep[] = [];
  const visit = (id: string, path: string[]) => {
    const s = byId.get(id);
    if (!s) throw new Error(`seed plan: unknown step ${id} (needed by ${path[path.length - 1]})`);
    if (done.has(id)) return;
    if (visiting.has(id)) throw new Error(`seed plan: cycle ${[...path, id].join(' -> ')}`);
    visiting.add(id);
    s.dependsOn.forEach(d => visit(d, [...path, id]));
    visiting.delete(id);
    done.add(id);
    out.push(s);
  };
  plan.forEach(s => visit(s.id, []));
  return out;
}
