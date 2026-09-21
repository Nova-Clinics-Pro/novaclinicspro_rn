/**
 * Wizard store draft persistence tests
 *
 * Verifies persisted wizard draft data cannot leak between tenants or users.
 */

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStorage.keys()))),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => mockStorage.delete(key));
    return Promise.resolve();
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../features/auth/presentation/providers/auth.store';
import { createDraftRevisionEvidence } from '../../features/onboarding/domain/entities/step-revision.entity';
import {
  clearStepDraftAndSync,
  clearWizardDraftStorageForIdentity,
  hydrateWizardDraftFromStorage,
  MAX_DRAFT_SIZE_KB,
  migrateDraft,
  resetWizardDraftStorage,
  selectStepDraft,
  selectStepDraftLastSavedAt,
  syncWizardDraftToStorage,
  useWizardStore,
  WIZARD_DRAFT_SCHEMA_VERSION,
} from '../../features/onboarding/presentation/stores/wizard.store';

const clinicProfile = {
  name: 'Previous Clinic',
  clinic_type: 'ayurveda',
  email: 'previous@example.com',
  phones: ['9999999999'],
  address: {
    street: 'Old Street',
    city: 'Old City',
    state: 'Old State',
    pincode: '111111',
    country: 'India',
  },
};

const setAuthIdentity = (tenantId: string | null, userId = 'user-a') => {
  useAuthStore.setState({
    currentUser: {
      id: userId,
      userId,
      email: `${userId}@example.com`,
      fullName: 'Test User',
      clinicName: 'Test Clinic',
      tenantId,
      roles: ['clinic_owner'],
      permissions: [],
      isOrgAdmin: false,
      isDemoTenant: false,
      applicationStatus: 'onboarding',
      ownedClinics: [],
    },
    selectedClinicId: tenantId,
    isAuthenticated: true,
    isLoading: false,
  });
};

const keyFor = (tenantId: string, userId = 'user-a') =>
  `@novaclinics/${tenantId}/user_${userId}/wizard_draft_v${WIZARD_DRAFT_SCHEMA_VERSION}`;

const userKeyFor = (userId = 'user-a') =>
  `@novaclinics/user_${userId}/wizard_draft_v${WIZARD_DRAFT_SCHEMA_VERSION}`;
const revision = `step-rev-v1:${'a'.repeat(64)}`;
const capabilityRevision = `cap-v1:${'b'.repeat(64)}`;
const draftEvidence = () =>
  createDraftRevisionEvidence({
    organizationId: 'org-a',
    tenantId: 'tenant-a',
    stepCode: 'clinic_profile',
    revision,
    templateVersion: 'template-v1',
    capabilityRevision,
  });

describe('wizard.store draft persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    setAuthIdentity('tenant-a');
    useWizardStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores draft entries with stable createdAt and updated lastSavedAt', () => {
    useWizardStore
      .getState()
      .setStepDraft('clinic_profile', { name: 'First' }, draftEvidence());
    (Date.now as jest.Mock).mockReturnValue(1_700_000_000_500);
    useWizardStore.getState().setStepDraft('clinic_profile', { name: 'Second' });

    const entry = useWizardStore.getState().stepDrafts.clinic_profile;
    expect(entry).toEqual({
      data: { name: 'Second' },
      createdAt: 1_700_000_000_000,
      lastSavedAt: 1_700_000_000_500,
      baseEvidence: draftEvidence(),
    });
    expect(selectStepDraft('clinic_profile')(useWizardStore.getState())).toEqual({ name: 'Second' });
    expect(selectStepDraftLastSavedAt('clinic_profile')(useWizardStore.getState())).toBe(1_700_000_000_500);
  });

  it('does not advance authoritative evidence during local saves', () => {
    useWizardStore
      .getState()
      .setStepDraft('clinic_profile', { name: 'First' }, draftEvidence());
    useWizardStore.getState().setStepDraft('clinic_profile', { name: 'Second' });

    expect(useWizardStore.getState().stepDrafts.clinic_profile.baseEvidence?.revision.value)
      .toBe(revision);
  });

  it('updates base evidence only through the explicit accepted-evidence action', () => {
    useWizardStore.getState().setStepDraft('clinic_profile', { name: 'First' });
    expect(useWizardStore.getState().stepDrafts.clinic_profile.baseEvidence).toBeNull();

    useWizardStore
      .getState()
      .acceptStepAuthoritativeEvidence('clinic_profile', draftEvidence());

    expect(useWizardStore.getState().stepDrafts.clinic_profile.baseEvidence)
      .toEqual(draftEvidence());
  });

  it('round-trips valid drafts through tenant and user scoped storage', async () => {
    useWizardStore.getState().setClinicProfile(clinicProfile);

    await syncWizardDraftToStorage();
    useWizardStore.getState().reset();
    await hydrateWizardDraftFromStorage();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      keyFor('tenant-a'),
      expect.stringContaining(`"version":${WIZARD_DRAFT_SCHEMA_VERSION}`)
    );
    expect(useWizardStore.getState().getStepData('clinic_profile')).toEqual(clinicProfile);
  });

  it('does not hydrate another tenant draft', async () => {
    mockStorage.set(keyFor('tenant-a'), JSON.stringify({
      version: WIZARD_DRAFT_SCHEMA_VERSION,
      tenantId: 'tenant-a',
      userId: 'user-a',
      stepDrafts: {
        clinic_profile: {
          data: clinicProfile,
          createdAt: 1,
          lastSavedAt: 1,
        },
      },
    }));

    setAuthIdentity('tenant-b');
    await hydrateWizardDraftFromStorage();

    expect(useWizardStore.getState().getStepData('clinic_profile')).toBeUndefined();
  });

  it('does not hydrate another user draft for the same tenant', async () => {
    mockStorage.set(keyFor('tenant-a', 'user-a'), JSON.stringify({
      version: WIZARD_DRAFT_SCHEMA_VERSION,
      tenantId: 'tenant-a',
      userId: 'user-a',
      stepDrafts: {
        clinic_profile: {
          data: clinicProfile,
          createdAt: 1,
          lastSavedAt: 1,
        },
      },
    }));

    setAuthIdentity('tenant-a', 'user-b');
    await hydrateWizardDraftFromStorage();

    expect(useWizardStore.getState().getStepData('clinic_profile')).toBeUndefined();
  });

  it('uses an isolated user fallback key when tenant is unavailable', async () => {
    setAuthIdentity(null, 'user-a');
    useWizardStore.getState().setPaymentMethods({ payment_methods: ['cash'] });

    await syncWizardDraftToStorage();

    expect(mockStorage.has(userKeyFor('user-a'))).toBe(true);
  });

  it('migrates legacy v0 wizardData payloads into DraftEntry records', async () => {
    mockStorage.set('wizard-storage', JSON.stringify({
      version: 0,
      state: {
        tenantId: 'tenant-a',
        wizardData: {
          clinic_profile: clinicProfile,
        },
      },
    }));

    await hydrateWizardDraftFromStorage();

    const entry = useWizardStore.getState().stepDrafts.clinic_profile;
    expect(entry.data).toEqual(clinicProfile);
    expect(entry.createdAt).toBe(1_700_000_000_000);
    expect(entry.lastSavedAt).toBe(1_700_000_000_000);
    expect(entry.baseEvidence).toBeNull();
    expect(mockStorage.has('wizard-storage')).toBe(false);
    expect(mockStorage.has(keyFor('tenant-a'))).toBe(true);
  });

  it('migrates legacy split draft metadata payloads', () => {
    const migrated = migrateDraft(0, WIZARD_DRAFT_SCHEMA_VERSION, {
      tenantId: 'tenant-a',
      userId: 'user-a',
      stepDrafts: {
        clinic_profile: clinicProfile,
      },
      draftMetadata: {
        clinic_profile: {
          createdAt: 10,
          lastSavedAt: 20,
        },
      },
    });

    expect(migrated.stepDrafts.clinic_profile).toEqual({
      data: clinicProfile,
      createdAt: 10,
      lastSavedAt: 20,
      baseEvidence: null,
    });
  });

  it('migrates scoped v1 drafts to v2 with explicit unavailable evidence', async () => {
    const v1Key = '@novaclinics/tenant-a/user_user-a/wizard_draft_v1';
    mockStorage.set(v1Key, JSON.stringify({
      version: 1,
      tenantId: 'tenant-a',
      userId: 'user-a',
      stepDrafts: {
        clinic_profile: {
          data: clinicProfile,
          createdAt: 1_700_000_000_000,
          lastSavedAt: 1_700_000_000_000,
        },
      },
    }));

    await hydrateWizardDraftFromStorage();

    expect(useWizardStore.getState().stepDrafts.clinic_profile).toEqual({
      data: clinicProfile,
      createdAt: 1_700_000_000_000,
      lastSavedAt: 1_700_000_000_000,
      baseEvidence: null,
    });
    expect(mockStorage.has(v1Key)).toBe(false);
    expect(mockStorage.has(keyFor('tenant-a'))).toBe(true);
  });

  it('removes corrupt stored drafts without throwing', async () => {
    mockStorage.set(keyFor('tenant-a'), '{not-json');

    await expect(hydrateWizardDraftFromStorage()).resolves.toBeUndefined();

    expect(mockStorage.has(keyFor('tenant-a'))).toBe(false);
    expect(useWizardStore.getState().stepDrafts).toEqual({});
  });

  it('removes incompatible versions without hydrating', async () => {
    mockStorage.set(keyFor('tenant-a'), JSON.stringify({
      version: 99,
      tenantId: 'tenant-a',
      userId: 'user-a',
      stepDrafts: {
        clinic_profile: {
          data: clinicProfile,
          createdAt: 1,
          lastSavedAt: 1,
        },
      },
    }));

    await hydrateWizardDraftFromStorage();

    expect(mockStorage.has(keyFor('tenant-a'))).toBe(false);
    expect(useWizardStore.getState().stepDrafts).toEqual({});
  });

  it('compresses oversized draft payloads', async () => {
    useWizardStore.getState().setStepDraft('clinic_profile', {
      notes: 'a'.repeat((MAX_DRAFT_SIZE_KB + 50) * 1024),
    });

    await syncWizardDraftToStorage();

    const stored = JSON.parse(mockStorage.get(keyFor('tenant-a')) || '{}');
    expect(stored.compressed).toBe(true);
    expect(stored.payload).toEqual(expect.any(String));
  });

  it('clears only matching scoped draft keys on logout cleanup', async () => {
    mockStorage.set(keyFor('tenant-a', 'user-a'), 'tenant-a-user-a');
    mockStorage.set(userKeyFor('user-a'), 'fallback-user-a');
    mockStorage.set(keyFor('tenant-b', 'user-b'), 'tenant-b-user-b');

    await clearWizardDraftStorageForIdentity({ tenantId: 'tenant-a', userId: 'user-a' });

    expect(mockStorage.has(keyFor('tenant-a', 'user-a'))).toBe(false);
    expect(mockStorage.has(userKeyFor('user-a'))).toBe(false);
    expect(mockStorage.has(keyFor('tenant-b', 'user-b'))).toBe(true);
  });

  it('resetWizardDraftStorage clears memory and current scoped storage', async () => {
    useWizardStore.getState().setClinicProfile(clinicProfile);
    await syncWizardDraftToStorage();

    await resetWizardDraftStorage();

    expect(useWizardStore.getState().stepDrafts).toEqual({});
    expect(mockStorage.has(keyFor('tenant-a'))).toBe(false);
  });

  it('clearStepDraftAndSync clears only the requested step draft', async () => {
    useWizardStore.getState().setStepDraft('payment_setup', { payment_methods: ['cash'] });
    useWizardStore.getState().setStepDraft('financials_and_tax', {
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });

    await clearStepDraftAndSync('payment_setup');

    expect(useWizardStore.getState().getStepData('payment_setup')).toBeUndefined();
    expect(useWizardStore.getState().getStepData('financials_and_tax')).toEqual({
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });

    const stored = JSON.parse(mockStorage.get(keyFor('tenant-a')) || '{}');
    expect(stored.stepDrafts.payment_setup).toBeUndefined();
    expect(stored.stepDrafts.financials_and_tax.data).toEqual({
      tax_enabled: true,
      tax_rate: 18,
      invoice_prefix: 'INV',
    });
  });

  it('does not silently replace an existing draft revision during local edits', () => {
    const firstEvidence = createDraftRevisionEvidence({
      organizationId: 'org-a',
      tenantId: 'tenant-a',
      stepCode: 'clinic_profile',
      revision: `step-rev-v1:${'a'.repeat(64)}`,
      templateVersion: 'template-v1',
      capabilityRevision: `cap-v1:${'c'.repeat(64)}`,
    });
    const newerEvidence = createDraftRevisionEvidence({
      organizationId: 'org-a',
      tenantId: 'tenant-a',
      stepCode: 'clinic_profile',
      revision: `step-rev-v1:${'b'.repeat(64)}`,
      templateVersion: 'template-v1',
      capabilityRevision: `cap-v1:${'c'.repeat(64)}`,
    });

    useWizardStore
      .getState()
      .setStepDraft('clinic_profile', { name: 'First' }, firstEvidence);
    useWizardStore
      .getState()
      .setStepDraft('clinic_profile', { name: 'Edited' }, newerEvidence);

    expect(
      useWizardStore.getState().stepDrafts.clinic_profile.baseEvidence?.revision
        .value
    ).toBe(firstEvidence.revision.value);
  });
});
