/**
 * COP test data, mirroring COP_Test_Cases.xlsx tab 00_Setup_And_Data (SET_003..SET_007).
 * Only synthetic values. Names carry a short key so the seeder can find its own records again (idempotent).
 */

export const ROOMS = [
  { key: 'C-1', name: 'COP C-1 Consultation', room_type: 'consultation', capacity: 2 },
  { key: 'C-2', name: 'COP C-2 Consultation', room_type: 'consultation', capacity: 2 },
  { key: 'T-1', name: 'COP T-1 Therapy', room_type: 'therapy', capacity: 1 },
  { key: 'T-2', name: 'COP T-2 Therapy', room_type: 'therapy', capacity: 1 },
] as const;

/**
 * Staff are created WITHOUT a login by default (requires_login=false). That creates a database row only: no Auth
 * user and no activation email. Pass --with-logins to the seeder to create logins (needs the owner's approval
 * because it sends activation emails and is rate limited).
 */
export const STAFF = [
  { key: 'ADMIN', full_name: 'COP Admin', staff_type: 'admin', gender: 'female', phone: '+919000000101' },
  { key: 'RECEPTION', full_name: 'COP Receptionist', staff_type: 'receptionist', gender: 'female', phone: '+919000000102' },
  { key: 'D1', full_name: 'COP Doctor D1', staff_type: 'doctor', gender: 'male', phone: '+919000000103', consultation_fee: '500', qualification: 'BAMS' },
  { key: 'D2', full_name: 'COP Doctor D2', staff_type: 'doctor', gender: 'female', phone: '+919000000104', consultation_fee: '600', qualification: 'MD (Ayurveda)' },
  { key: 'T1', full_name: 'COP Therapist T1', staff_type: 'therapist', gender: 'female', phone: '+919000000105', hourly_rate: '300' },
  { key: 'T2', full_name: 'COP Therapist T2', staff_type: 'therapist', gender: 'male', phone: '+919000000106', hourly_rate: '300' },
  { key: 'T3', full_name: 'COP Therapist T3', staff_type: 'therapist', gender: 'female', phone: '+919000000107', hourly_rate: '300' },
  { key: 'PHARM', full_name: 'COP Pharmacist', staff_type: 'pharmacist', gender: 'male', phone: '+919000000108' },
  { key: 'NURSE', full_name: 'COP Nurse', staff_type: 'nurse', gender: 'female', phone: '+919000000109' },
] as const;

/** category_code is not set here: step S06 reads the active categories and picks therapy (Ayurveda) or general. */
export const TREATMENTS = [
  { code: 'COPABH', name: 'COP Abhyanga', duration_minutes: 60, price: '1500', base_price: '1500' },
  { code: 'COPSHI', name: 'COP Shirodhara', duration_minutes: 45, price: '1800', base_price: '1800' },
] as const;

/** Consumables per session (SET_005): Abhyanga uses 50 ml of sesame oil. */
export const USABLES = [
  { treatment: 'COPABH', inventory: 'COP Sesame oil', material_name: 'COP Sesame oil', standard_quantity: 50, unit: 'ml', ml_per_unit: 1, category: 'oil' },
] as const;

export const INVENTORY = [
  { name: 'COP Sesame oil', unit: 'ml', current_stock: '1000', reorder_point: 100, price: '0.5' },
  { name: 'COP Herbal powder (zero stock)', unit: 'g', current_stock: '0', reorder_point: 50, price: '2' },
  { name: 'COP Tablet X (below reorder point)', unit: 'strip', current_stock: '10', reorder_point: 20, price: '40' },
] as const;

/**
 * Booking refuses a patient who already has an appointment at that time BEFORE it checks therapist or room, so each
 * conflict case uses its own patient (P-Female2 for the therapist clash, P-Female3 for the room clash).
 */
export const PATIENTS = [
  { key: 'P-Male', full_name: 'COP Patient Male', gender: 'male', phone: '+919100000201', date_of_birth: '1985-06-15', email: 'cop-p-male@nova-uat.example.com' },
  { key: 'P-Female', full_name: 'COP Patient Female', gender: 'female', phone: '+919100000202', date_of_birth: '1990-01-20' },
  { key: 'P-Female2', full_name: 'COP Patient Female Two', gender: 'female', phone: '+919100000204', date_of_birth: '1992-09-05' },
  { key: 'P-Female3', full_name: 'COP Patient Female Three', gender: 'female', phone: '+919100000205', date_of_birth: '1988-12-12' },
  { key: 'P-Minor', full_name: 'COP Patient Minor', gender: 'male', phone: '+919100000203', date_of_birth: '2015-03-10' },
] as const;

/**
 * Operating hours used by CNF_006..CNF_008: 09:00-18:00, break 13:00-14:00, Monday to Saturday open, Sunday closed.
 * day_of_week follows the app and the backend: 0 = Monday ... 6 = Sunday (NOT the JavaScript Date.getDay() order).
 */
export const OPERATING_HOURS = [0, 1, 2, 3, 4, 5].map(d => ({ day_of_week: d, is_open: true, open_time: '09:00:00', close_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00' }))
  .concat([{ day_of_week: 6, is_open: false, open_time: '', close_time: '', break_start: '', break_end: '' }]);
