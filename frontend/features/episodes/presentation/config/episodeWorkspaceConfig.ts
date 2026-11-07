/**
 * Episode Workspace Role Configuration
 *
 * Open/Closed Principle: add new roles by extending this map,
 * not by branching inside components.
 *
 * Each config controls:
 *  - canEditNotes: whether Visit Notes tab is editable
 *  - canSchedule: whether admin scheduling CTAs are shown
 *  - canWriteRx: whether "New Prescription" CTA is shown
 *  - canCreateTreatmentSheet: whether doctor can create a new treatment sheet
 */

export type WorkspaceMode = 'doctor' | 'admin';

export interface EpisodeWorkspaceRoleConfig {
  canEditNotes: boolean;
  canSchedule: boolean;
  canWriteRx: boolean;
  canCreateTreatmentSheet: boolean;
}

export const episodeWorkspaceConfigByRole: Record<WorkspaceMode, EpisodeWorkspaceRoleConfig> = {
  doctor: {
    canEditNotes: true,
    canSchedule: false,
    canWriteRx: true,
    canCreateTreatmentSheet: true,
  },
  admin: {
    canEditNotes: false,
    canSchedule: true,
    canWriteRx: false,
    canCreateTreatmentSheet: false,
  },
};

/**
 * R7 T-FE-E.6 COS presentation only.  This deliberately lives beside the
 * legacy two-mode map without changing it: roles select no clinical action.
 * Permissions, effective capabilities, and workflow facts remain authority.
 */
export type CosPresentationRole = 'doctor' | 'assistant_doctor' | 'admin' | 'front_desk' | 'therapist';
export interface CosRolePresentationConfig { readonly labelKey: string; readonly emphasis: 'clinical' | 'operations' | 'therapy'; }

export const cosPresentationConfigByRole: Record<CosPresentationRole, CosRolePresentationConfig> = {
  doctor: { labelKey: 'doctor', emphasis: 'clinical' },
  assistant_doctor: { labelKey: 'assistantDoctor', emphasis: 'clinical' },
  admin: { labelKey: 'admin', emphasis: 'operations' },
  front_desk: { labelKey: 'frontDesk', emphasis: 'operations' },
  therapist: { labelKey: 'therapist', emphasis: 'therapy' },
};

const ROLE_ALIASES: Record<string, CosPresentationRole> = {
  doctor: 'doctor', assistant_doctor: 'assistant_doctor', 'assistant doctor': 'assistant_doctor',
  admin: 'admin', clinic_admin: 'admin', 'clinic admin': 'admin',
  front_desk: 'front_desk', 'front desk': 'front_desk', receptionist: 'front_desk', therapist: 'therapist',
};

/** Unknown/custom roles intentionally get neutral presentation, never denied authority. */
export const resolveCosPresentationConfig = (roles: string[] | undefined): { roles: CosPresentationRole[]; config: CosRolePresentationConfig | null } => {
  const resolved = [...new Set((roles ?? []).map((role) => ROLE_ALIASES[role.toLowerCase().replace(/-/g, '_')]).filter(Boolean))] as CosPresentationRole[];
  return { roles: resolved, config: resolved.length === 1 ? cosPresentationConfigByRole[resolved[0]] : null };
};
