import { clinicalAuthoringAccess } from '../../features/episodes/domain/clinicalAuthoringAccess';

describe('clinicalAuthoringAccess', () => {
  it('a doctor (holds the create permissions) may author', () => {
    expect(clinicalAuthoringAccess(['casesheet.create', 'prescription.create', 'treatment_sheet.create'])).toEqual({
      canCreateCasesheet: true,
      canCreatePrescription: true,
      canCreateTreatmentSheet: true,
    });
  });

  it('an owner or admin (view-only on clinical documents) may not, whatever their role is called', () => {
    const none = { canCreateCasesheet: false, canCreatePrescription: false, canCreateTreatmentSheet: false };
    expect(clinicalAuthoringAccess(['casesheet.read', 'prescription.read', 'treatment_sheet.read', 'appointment.update'])).toEqual(none);
    expect(clinicalAuthoringAccess([])).toEqual(none);
    expect(clinicalAuthoringAccess(undefined)).toEqual(none);
  });
});
