/**
 * Who may AUTHOR clinical documents, from the user's effective permissions.
 *
 * Case sheets, prescriptions and treatment sheets are clinical decisions: the backend grants their creation to the
 * Doctor role only (not the owner, not the admin). The screens must not offer "Add" to anyone else, whatever the
 * route or workspace mode says: a role-name or URL-parameter check would let the owner reach a form the server refuses.
 * Viewing is separate (`*.read`) and unaffected.
 */
export interface ClinicalAuthoringAccess {
  canCreateCasesheet: boolean;
  canCreatePrescription: boolean;
  canCreateTreatmentSheet: boolean;
}

export const clinicalAuthoringAccess = (permissions: readonly string[] | null | undefined): ClinicalAuthoringAccess => {
  const granted = new Set(permissions ?? []);
  return {
    canCreateCasesheet: granted.has('casesheet.create'),
    canCreatePrescription: granted.has('prescription.create'),
    canCreateTreatmentSheet: granted.has('treatment_sheet.create'),
  };
};
