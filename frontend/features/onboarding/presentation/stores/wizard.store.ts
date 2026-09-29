/**
 * Wizard Store
 * Manages local onboarding draft state before API submission.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { create, type StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useAuthStore } from '../../../auth/presentation/providers/auth.store';
import {
  DraftRevisionEvidence,
  createDraftRevisionEvidence,
} from '../../domain/entities/step-revision.entity';

const { produce } = require('immer') as {
  produce: (recipe: (draft: any) => void) => unknown;
};

export const WIZARD_DRAFT_SCHEMA_VERSION = 2;
export const MAX_DRAFT_SIZE_KB = 500;
export const DRAFT_EXPIRY_DAYS = 30;

const LEGACY_WIZARD_STORAGE_KEY = 'wizard-storage';
const DRAFT_EXPIRY_MS = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

interface ClinicProfileData {
  name: string;
  clinic_type: string;
  email: string;
  phones: string[];
  website_address?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  clinic_registration?: string;
  clinic_pan?: string;
  clinic_gst?: string;
  clinic_logo?: string;
}

interface OperatingHoursData {
  schedule: Array<{
    day: string;
    is_open: boolean;
    open_time?: string;
    close_time?: string;
  }>;
}

interface RoomsData {
  rooms: Array<{
    name: string;
    room_type: string;
    capacity: number;
  }>;
}

interface StaffData {
  staff_members: Array<{
    name: string;
    role: string;
    specialization?: string;
    phone: string;
    email: string;
  }>;
}

interface PaymentData {
  payment_methods: string[];
}

interface BillingData {
  tax_enabled: boolean;
  tax_rate: number;
  invoice_prefix: string;
}

interface WizardData {
  clinic_profile?: ClinicProfileData;
  operating_hours?: OperatingHoursData;
  rooms_and_therapy_beds?: RoomsData;
  staff_and_roles?: StaffData;
  payment_setup?: PaymentData;
  financials_and_tax?: BillingData;
}

export interface DraftEntry {
  data: unknown;
  createdAt: number;
  lastSavedAt: number;
  baseEvidence: DraftRevisionEvidence | null;
}

export interface DraftPayload {
  version: number;
  tenantId: string | null;
  userId: string | null;
  stepDrafts: Record<string, DraftEntry>;
}

interface CompressedDraftPayload {
  version: number;
  tenantId: string | null;
  userId: string | null;
  compressed: true;
  payload: string;
}

interface DraftIdentity {
  tenantId: string | null;
  userId: string | null;
  storageKey: string | null;
  legacyV1StorageKey: string | null;
}

interface WizardState {
  version: number;
  stepDrafts: Record<string, DraftEntry>;
  tenantId: string | null;
  currentStepIndex: number;
  isDirty: boolean;

  setTenantId: (tenantId: string) => void;
  setCurrentStepIndex: (index: number) => void;

  setStepDraft: (
    stepCode: string,
    data: unknown,
    baseEvidence?: DraftRevisionEvidence
  ) => void;
  acceptStepAuthoritativeEvidence: (
    stepCode: string,
    baseEvidence: DraftRevisionEvidence
  ) => void;
  clearStepDraft: (stepCode: string) => void;
  reset: () => void;
  restoreStepDrafts: (stepDrafts: Record<string, DraftEntry>) => void;

  setClinicProfile: (
    data: Partial<ClinicProfileData>,
    baseEvidence?: DraftRevisionEvidence
  ) => void;
  setOperatingHours: (
    data: OperatingHoursData,
    baseEvidence?: DraftRevisionEvidence
  ) => void;
  setRooms: (data: RoomsData, baseEvidence?: DraftRevisionEvidence) => void;
  setStaff: (data: StaffData, baseEvidence?: DraftRevisionEvidence) => void;
  setPaymentMethods: (
    data: PaymentData,
    baseEvidence?: DraftRevisionEvidence
  ) => void;
  setBilling: (data: BillingData, baseEvidence?: DraftRevisionEvidence) => void;

  getStepData: (stepCode: string) => any;
  resetWizard: () => void;
  clearStepData: (stepCode: string) => void;
  markClean: () => void;
}

export class DraftMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DraftMigrationError';
  }
}

const initialState = {
  version: WIZARD_DRAFT_SCHEMA_VERSION,
  stepDrafts: {} as Record<string, DraftEntry>,
  tenantId: null as string | null,
  currentStepIndex: 0,
  isDirty: false,
};

const withImmer = <TState,>(
  initializer: (set: any, get: () => TState) => TState
): StateCreator<TState, [], []> => (set, get, store) =>
  initializer(((updater: TState | Partial<TState> | ((state: TState) => void), replace?: false) => {
    const nextState = typeof updater === 'function'
      ? produce(updater as (state: TState) => void)
      : updater;

    return set(nextState as TState | Partial<TState>, replace);
  }) as typeof set, get);

const getWizardDataFromDrafts = (stepDrafts: Record<string, DraftEntry>): WizardData => {
  const wizardData: WizardData = {};

  Object.entries(stepDrafts).forEach(([stepCode, entry]) => {
    wizardData[stepCode as keyof WizardData] = entry.data as never;
  });

  return wizardData;
};

const getDraftIdentity = (): DraftIdentity => {
  const authState = useAuthStore.getState();
  const currentUser = authState.currentUser;
  const tenantId = authState.selectedClinicId || currentUser?.tenantId || null;
  const userId = currentUser?.userId || currentUser?.id || null;

  if (tenantId && userId) {
    return {
      tenantId,
      userId,
      storageKey: `@novaclinics/${tenantId}/user_${userId}/wizard_draft_v${WIZARD_DRAFT_SCHEMA_VERSION}`,
      legacyV1StorageKey: `@novaclinics/${tenantId}/user_${userId}/wizard_draft_v1`,
    };
  }

  if (userId) {
    console.warn('[WizardStore] tenantId unavailable; using user-scoped draft key');
    return {
      tenantId: null,
      userId,
      storageKey: `@novaclinics/user_${userId}/wizard_draft_v${WIZARD_DRAFT_SCHEMA_VERSION}`,
      legacyV1StorageKey: `@novaclinics/user_${userId}/wizard_draft_v1`,
    };
  }

  console.warn('[WizardStore] Cannot persist wizard draft without user identity');
  return {
    tenantId: null,
    userId: null,
    storageKey: null,
    legacyV1StorageKey: null,
  };
};

const getByteLength = (value: string): number => unescape(encodeURIComponent(value)).length;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDraftEntry = (value: unknown): value is DraftEntry => {
  if (!isRecord(value)) return false;
  return (
    'data' in value &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    typeof value.lastSavedAt === 'number' &&
    Number.isFinite(value.lastSavedAt) &&
    ('baseEvidence' in value)
  );
};

const normalizeDraftBaseEvidence = (
  value: unknown,
  stepCode: string
): DraftRevisionEvidence | null => {
  if (value === null) return null;
  if (!isRecord(value) || !isRecord(value.revision) || !isRecord(value.projectionIdentity)) {
    throw new DraftMigrationError(`Invalid draft revision evidence for ${stepCode}`);
  }
  const evidence = createDraftRevisionEvidence({
    organizationId: value.organizationId,
    tenantId: value.tenantId,
    stepCode: value.stepCode,
    revision: value.revision.value,
    templateVersion: value.projectionIdentity.templateVersion,
    capabilityRevision: value.projectionIdentity.capabilityRevision,
  });
  if (evidence.stepCode !== stepCode) {
    throw new DraftMigrationError(`Draft revision step mismatch for ${stepCode}`);
  }
  return evidence;
};

const normalizeStepDrafts = (value: unknown): Record<string, DraftEntry> => {
  if (!isRecord(value)) {
    throw new DraftMigrationError('Draft payload stepDrafts must be an object');
  }

  return Object.entries(value).reduce<Record<string, DraftEntry>>((acc, [stepCode, entry]) => {
    if (!isDraftEntry(entry)) {
      throw new DraftMigrationError(`Invalid draft entry for ${stepCode}`);
    }

    acc[stepCode] = {
      data: entry.data,
      createdAt: entry.createdAt,
      lastSavedAt: entry.lastSavedAt,
      baseEvidence: normalizeDraftBaseEvidence(entry.baseEvidence, stepCode),
    };
    return acc;
  }, {});
};

const getExpiredDraftMetadata = (stepDrafts: Record<string, DraftEntry>, now = Date.now()) => {
  const expiredStepCodes: string[] = [];
  let oldestDraftAgeMs = 0;

  Object.entries(stepDrafts).forEach(([stepCode, entry]) => {
    const ageMs = now - entry.lastSavedAt;
    if (ageMs > DRAFT_EXPIRY_MS) {
      expiredStepCodes.push(stepCode);
      oldestDraftAgeMs = Math.max(oldestDraftAgeMs, ageMs);
    }
  });

  return { expiredStepCodes, oldestDraftAgeMs };
};

const emitWizardDraftEvent = (_eventName: string, _metadata: Record<string, unknown>) => {
  // Draft persistence is deliberately non-user-facing. A future telemetry
  // adapter can consume this single boundary without turning expected account
  // switching or recoverable storage failures into a React Native LogBox.
};

const validateIdentity = (payload: DraftPayload, identity: DraftIdentity): boolean =>
  payload.tenantId === identity.tenantId && payload.userId === identity.userId;

const parseStoredDraft = (storedValue: string): DraftPayload => {
  const parsed = JSON.parse(storedValue);
  const payload = parsed?.compressed === true
    ? JSON.parse(decompressFromUTF16((parsed as CompressedDraftPayload).payload) || '')
    : parsed;

  if (!isRecord(payload)) {
    throw new DraftMigrationError('Draft payload must be an object');
  }

  const version = typeof payload.version === 'number' ? payload.version : 0;
  if (version !== WIZARD_DRAFT_SCHEMA_VERSION) {
    return migrateDraft(version, WIZARD_DRAFT_SCHEMA_VERSION, payload);
  }

  return {
    version,
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : null,
    userId: typeof payload.userId === 'string' ? payload.userId : null,
    stepDrafts: normalizeStepDrafts(payload.stepDrafts),
  };
};

// Migration map:
// v0/v1 -> v2: preserve local data/timestamps and mark server evidence unavailable.
export function migrateDraft(fromVersion: number, toVersion: number, payload: unknown): DraftPayload {
  if (
    ![0, 1].includes(fromVersion) ||
    toVersion !== WIZARD_DRAFT_SCHEMA_VERSION ||
    !isRecord(payload)
  ) {
    throw new DraftMigrationError(`Unsupported draft migration ${fromVersion} -> ${toVersion}`);
  }

  const now = Date.now();
  const state = isRecord(payload.state) ? payload.state : payload;
  const rawDrafts = isRecord(state.stepDrafts)
    ? state.stepDrafts
    : isRecord(state.wizardData)
      ? state.wizardData
      : {};
  const rawMetadata = isRecord(state.draftMetadata) ? state.draftMetadata : {};

  const stepDrafts = Object.entries(rawDrafts).reduce<Record<string, DraftEntry>>((acc, [stepCode, rawEntry]) => {
    if (rawEntry === undefined) return acc;

    const metadata = isRecord(rawMetadata[stepCode]) ? rawMetadata[stepCode] : {};
    const v1Entry = fromVersion === 1 && isRecord(rawEntry) ? rawEntry : null;
    const data = v1Entry && 'data' in v1Entry ? v1Entry.data : rawEntry;
    const lastSavedAt =
      v1Entry && typeof v1Entry.lastSavedAt === 'number'
        ? v1Entry.lastSavedAt
        : typeof metadata.lastSavedAt === 'number'
          ? metadata.lastSavedAt
          : now;
    const createdAt =
      v1Entry && typeof v1Entry.createdAt === 'number'
        ? v1Entry.createdAt
        : typeof metadata.createdAt === 'number'
          ? metadata.createdAt
          : lastSavedAt;

    acc[stepCode] = { data, createdAt, lastSavedAt, baseEvidence: null };
    return acc;
  }, {});

  return {
    version: WIZARD_DRAFT_SCHEMA_VERSION,
    tenantId: typeof state.tenantId === 'string' ? state.tenantId : null,
    userId: typeof state.userId === 'string' ? state.userId : null,
    stepDrafts,
  };
}

export const selectStepDraft = (stepCode: string) => (state: WizardState) =>
  state.stepDrafts[stepCode]?.data;

export const selectStepDraftLastSavedAt = (stepCode: string) => (state: WizardState) =>
  state.stepDrafts[stepCode]?.lastSavedAt ?? null;

export const useWizardStore = create<WizardState>()(
  subscribeWithSelector(
    withImmer((set, get) => ({
      ...initialState,

      setTenantId: (tenantId) =>
        set((state: WizardState) => {
          if (state.tenantId === tenantId) {
            state.tenantId = tenantId;
            return;
          }

          state.version = WIZARD_DRAFT_SCHEMA_VERSION;
          state.stepDrafts = {};
          state.tenantId = tenantId;
          state.currentStepIndex = 0;
          state.isDirty = false;
        }),

      setCurrentStepIndex: (index) =>
        set((state: WizardState) => {
          state.currentStepIndex = index;
        }),

      setStepDraft: (stepCode, data, baseEvidence) =>
        set((state: WizardState) => {
          const now = Date.now();
          const existing = state.stepDrafts[stepCode];
          if (baseEvidence && baseEvidence.stepCode !== stepCode) {
            throw new DraftMigrationError('Draft evidence step identity does not match');
          }
          state.stepDrafts[stepCode] = {
            data,
            createdAt: existing?.createdAt ?? now,
            lastSavedAt: now,
            baseEvidence: existing
              ? existing.baseEvidence
              : baseEvidence ?? null,
          };
          state.isDirty = true;
        }),

      acceptStepAuthoritativeEvidence: (stepCode, baseEvidence) =>
        set((state: WizardState) => {
          const existing = state.stepDrafts[stepCode];
          if (!existing || baseEvidence.stepCode !== stepCode) {
            throw new DraftMigrationError('Cannot bind evidence to a missing or different draft');
          }
          state.stepDrafts[stepCode] = {
            ...existing,
            baseEvidence,
          };
          state.isDirty = true;
        }),

      clearStepDraft: (stepCode) =>
        set((state: WizardState) => {
          delete state.stepDrafts[stepCode];
          state.isDirty = true;
        }),

      reset: () =>
        set((state: WizardState) => {
          state.version = WIZARD_DRAFT_SCHEMA_VERSION;
          state.stepDrafts = {};
          state.tenantId = null;
          state.currentStepIndex = 0;
          state.isDirty = false;
        }),

      restoreStepDrafts: (stepDrafts) =>
        set((state: WizardState) => {
          state.version = WIZARD_DRAFT_SCHEMA_VERSION;
          state.stepDrafts = stepDrafts;
          state.isDirty = false;
        }),

      setClinicProfile: (data, baseEvidence) => {
        const existing = get().stepDrafts.clinic_profile?.data as Partial<ClinicProfileData> | undefined;
        get().setStepDraft('clinic_profile', {
          ...existing,
          ...data,
        }, baseEvidence);
      },

      setOperatingHours: (data, baseEvidence) =>
        get().setStepDraft('operating_hours', data, baseEvidence),

      setRooms: (data, baseEvidence) =>
        get().setStepDraft('rooms_and_therapy_beds', data, baseEvidence),

      setStaff: (data, baseEvidence) =>
        get().setStepDraft('staff_and_roles', data, baseEvidence),

      setPaymentMethods: (data, baseEvidence) =>
        get().setStepDraft('payment_setup', data, baseEvidence),

      setBilling: (data, baseEvidence) =>
        get().setStepDraft('financials_and_tax', data, baseEvidence),

      getStepData: (stepCode) => get().stepDrafts[stepCode]?.data,

      clearStepData: (stepCode) => get().clearStepDraft(stepCode),

      resetWizard: () => get().reset(),

      markClean: () =>
        set((state: WizardState) => {
          state.isDirty = false;
        }),
    }))
  )
);

export const useWizardDraftStore = useWizardStore;

export const getWizardDataSnapshot = () => getWizardDataFromDrafts(useWizardStore.getState().stepDrafts);

export async function syncWizardDraftToStorage(): Promise<void> {
  const identity = getDraftIdentity();
  if (!identity.storageKey) return;

  const state = useWizardStore.getState();
  const payload: DraftPayload = {
    version: WIZARD_DRAFT_SCHEMA_VERSION,
    tenantId: identity.tenantId,
    userId: identity.userId,
    stepDrafts: state.stepDrafts,
  };

  try {
    const serialized = JSON.stringify(payload);
    const sizeKB = getByteLength(serialized) / 1024;

    if (sizeKB <= MAX_DRAFT_SIZE_KB) {
      await AsyncStorage.setItem(identity.storageKey, serialized);
      useWizardStore.getState().markClean();
      return;
    }

    const compressed = compressToUTF16(serialized);
    const compressedPayload: CompressedDraftPayload = {
      version: WIZARD_DRAFT_SCHEMA_VERSION,
      tenantId: identity.tenantId,
      userId: identity.userId,
      compressed: true,
      payload: compressed,
    };
    const compressedSerialized = JSON.stringify(compressedPayload);
    const compressedSizeKB = getByteLength(compressedSerialized) / 1024;

    if (compressedSizeKB > MAX_DRAFT_SIZE_KB) {
      emitWizardDraftEvent('onboarding_storage_sync_failed', {
        reason: 'draft_size_exceeded_after_compression',
        sizeKB: compressedSizeKB,
      });
      return;
    }

    await AsyncStorage.setItem(identity.storageKey, compressedSerialized);
    useWizardStore.getState().markClean();
  } catch (error) {
    emitWizardDraftEvent('onboarding_storage_sync_failed', {
      reason: 'storage_write_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function hydrateWizardDraftFromStorage(): Promise<void> {
  const identity = getDraftIdentity();
  if (!identity.storageKey) {
    useWizardStore.getState().reset();
    return;
  }

  const hydrateFromValue = async (
    storedValue: string,
    storageKey: string,
    removeOnFailure: boolean,
    allowLegacyUserFallback: boolean
  ) => {
    try {
      const payload = parseStoredDraft(storedValue);
      if (allowLegacyUserFallback && payload.userId === null && identity.userId) {
        payload.userId = identity.userId;
      }
      if (!validateIdentity(payload, identity)) {
        // A foreign draft is expected after account or tenant switching. Reject it
        // without escalating normal defensive control flow into a LogBox warning.
        useWizardStore.getState().restoreStepDrafts({});
        if (removeOnFailure) {
          await AsyncStorage.removeItem(storageKey);
        }
        return false;
      }

      const { expiredStepCodes, oldestDraftAgeMs } = getExpiredDraftMetadata(payload.stepDrafts);
      const activeStepDrafts = Object.entries(payload.stepDrafts).reduce<Record<string, DraftEntry>>(
        (acc, [stepCode, entry]) => {
          if (!expiredStepCodes.includes(stepCode)) {
            acc[stepCode] = entry;
          }
          return acc;
        },
        {}
      );

      if (expiredStepCodes.length > 0) {
        emitWizardDraftEvent('onboarding_draft_expired', {
          tenantId: identity.tenantId,
          expiredStepCodes,
          oldestDraftAgeMs,
        });
      }

      useWizardStore.getState().restoreStepDrafts(activeStepDrafts);

      if (expiredStepCodes.length > 0) {
        if (Object.keys(activeStepDrafts).length === 0) {
          await resetWizardDraftStorage();
        } else {
          await syncWizardDraftToStorage();
        }
      }

      return true;
    } catch (error) {
      console.error('[WizardStore] Failed to hydrate wizard draft:', error);
      useWizardStore.getState().reset();
      if (removeOnFailure) {
        await AsyncStorage.removeItem(storageKey);
      }
      return false;
    }
  };

  const scopedValue = await AsyncStorage.getItem(identity.storageKey);
  if (scopedValue) {
    await hydrateFromValue(scopedValue, identity.storageKey, true, false);
    return;
  }

  if (identity.legacyV1StorageKey) {
    const legacyV1Value = await AsyncStorage.getItem(identity.legacyV1StorageKey);
    if (legacyV1Value) {
      const hydratedV1 = await hydrateFromValue(
        legacyV1Value,
        identity.legacyV1StorageKey,
        false,
        false
      );
      if (hydratedV1) {
        await syncWizardDraftToStorage();
        await AsyncStorage.removeItem(identity.legacyV1StorageKey);
      }
      return;
    }
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_WIZARD_STORAGE_KEY);
  if (legacyValue) {
    const hydratedLegacy = await hydrateFromValue(legacyValue, LEGACY_WIZARD_STORAGE_KEY, true, true);
    if (hydratedLegacy) {
      await syncWizardDraftToStorage();
      await AsyncStorage.removeItem(LEGACY_WIZARD_STORAGE_KEY);
    }
    return;
  }

  useWizardStore.getState().restoreStepDrafts({});
}

export async function resetWizardDraftStorage(): Promise<void> {
  const identity = getDraftIdentity();
  useWizardStore.getState().reset();
  if (identity.storageKey) {
    await AsyncStorage.removeItem(identity.storageKey);
  }
}

export async function clearStepDraftAndSync(stepCode: string): Promise<void> {
  useWizardStore.getState().clearStepDraft(stepCode);
  await syncWizardDraftToStorage();
}

export async function clearWizardDraftStorageForIdentity(identity: {
  tenantId?: string | null;
  userId?: string | null;
}): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const tenantId = identity.tenantId ?? null;
  const userId = identity.userId ?? null;
  const prefixes = [
    tenantId && userId ? `@novaclinics/${tenantId}/user_${userId}/` : null,
    userId ? `@novaclinics/user_${userId}/` : null,
  ].filter((prefix): prefix is string => Boolean(prefix));

  const matchingKeys = keys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
  if (matchingKeys.length > 0) {
    await AsyncStorage.multiRemove(matchingKeys);
  }
}
