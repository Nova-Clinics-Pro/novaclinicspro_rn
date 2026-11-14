/**
 * The wire contract of the staff API, kept at the data-layer boundary.
 *
 * The staff form and screens say `qualifications` (a string) and `specialization` (a string); the backend's fields are
 * `qualification` (a string) and `specializations` (an object such as `{ "primary": "Ayurveda" }`). The names did not
 * match, so a degree and a specialization typed into the form were silently dropped by the server and never saved:
 * every doctor's degree was empty, and so could not be printed. These mappers translate in both directions so the
 * presentation layer keeps its names and the API receives and returns the backend's.
 */

type Json = Record<string, unknown>;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** Form/DTO fields -> the backend's names. Fields that are not present are left out (a PATCH must not clear them). */
export const toStaffApiPayload = <T extends object>(payload: T): Record<string, unknown> => {
  const { qualifications, specialization, ...rest } = payload as T & { qualifications?: unknown; specialization?: unknown };
  const out: Json = { ...rest };
  if ('qualifications' in (payload as Json)) out.qualification = text(qualifications) ?? null;
  if ('specialization' in (payload as Json)) {
    const primary = text(specialization);
    out.specializations = primary ? { primary } : null;
  }
  return out;
};

/** The backend's staff record -> the names the screens use. */
export const fromStaffApiRecord = <T>(record: T): T => {
  if (!record || typeof record !== 'object') return record;
  const raw = record as Json;
  const specializations = raw.specializations as Json | null | undefined;
  const primary =
    specializations && typeof specializations === 'object'
      ? text(specializations.primary) ?? text(specializations.specialization) ?? text(specializations.main)
      : undefined;
  return {
    ...raw,
    qualifications: text(raw.qualification) ?? null,
    specialization: primary ?? null,
  } as T;
};

/** A paginated staff response (`{ items: [...] }`) or a bare array. */
export const fromStaffApiList = <T>(data: T): T => {
  if (Array.isArray(data)) return data.map(fromStaffApiRecord) as unknown as T;
  if (data && typeof data === 'object' && Array.isArray((data as Json).items)) {
    return { ...(data as Json), items: ((data as Json).items as unknown[]).map(fromStaffApiRecord) } as T;
  }
  return data;
};
