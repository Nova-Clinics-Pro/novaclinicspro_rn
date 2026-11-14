import { buildClinicalPrintHtml } from '../../core/clinicalPrint/html';
import { buildPrescriptionPrintHtml, snapshotDoctor } from '../../core/clinicalPrint/adapters';
import { fromStaffApiList, fromStaffApiRecord, toStaffApiPayload } from '../../features/staff/data/mappers/staffContract';

const doc = (doctor: Record<string, unknown>) =>
  ({
    type: 'Prescription',
    title: 'Prescription',
    clinic: { name: 'Clinic' },
    client: { name: 'P-1' },
    doctor,
    sections: [],
  }) as never;

describe('the doctor block on printed documents', () => {
  it('prints the degree on the line after the name, right-aligned', () => {
    const html = buildClinicalPrintHtml(doc({ name: 'L Haresh', qualification: 'BAMS, MD (Ayurveda)' }));
    expect(html).toMatch(/\.doctor-degree \{ text-align: right; \}/);
    const name = html.indexOf('L Haresh');
    const degree = html.indexOf('<div class="line doctor-degree">BAMS, MD (Ayurveda)</div>');
    expect(name).toBeGreaterThan(-1);
    expect(degree).toBeGreaterThan(name);
  });

  it('prints no degree line when the doctor has none, and escapes the value', () => {
    expect(buildClinicalPrintHtml(doc({ name: 'L Haresh' }))).not.toContain('<div class="line doctor-degree">');
    expect(buildClinicalPrintHtml(doc({ name: 'X', qualification: 'B<A>MS' }))).toContain('B&lt;A&gt;MS');
  });

  it('the prescription print carries the backend branding degree', () => {
    const html = buildPrescriptionPrintHtml({
      id: '1',
      patient_name: 'P-1',
      prescription_data: {},
      issued_date: '2026-11-14',
      branding: { clinic_name: 'C', doctor_name: 'L Haresh', doctor_qualification: 'BAMS' },
    });
    expect(html).toContain('<div class="line doctor-degree">BAMS</div>');
  });

  it('reads the doctor from the backend footer snapshot as well as the older flat shape', () => {
    expect(snapshotDoctor({ doctor: { full_name: 'L Haresh', qualification: 'BAMS', registration_number: 'R1' } })).toMatchObject({
      name: 'L Haresh',
      qualification: 'BAMS',
      registrationNo: 'R1',
    });
    expect(snapshotDoctor({ recorded_by_name: 'Old', recorded_by_qualification: 'MD' })).toMatchObject({ name: 'Old', qualification: 'MD' });
    expect(snapshotDoctor(null)).toEqual({ name: undefined, qualification: undefined, specialization: undefined, registrationNo: undefined });
  });
});

describe('the staff contract: a degree typed in the form is actually sent and shown again', () => {
  it('sends qualifications as the backend\'s qualification and specialization as specializations.primary', () => {
    expect(toStaffApiPayload({ full_name: 'A', qualifications: ' BAMS ', specialization: 'Panchakarma' })).toEqual({
      full_name: 'A',
      qualification: 'BAMS',
      specializations: { primary: 'Panchakarma' },
    });
    // cleared fields are sent as null (so a PATCH can clear them); absent fields are not sent at all
    expect(toStaffApiPayload({ qualifications: '', specialization: null })).toEqual({ qualification: null, specializations: null });
    expect(toStaffApiPayload({ full_name: 'A' })).toEqual({ full_name: 'A' });
  });

  it('shows the backend record\'s qualification and specializations in the form\'s fields', () => {
    expect(fromStaffApiRecord({ id: '1', qualification: 'BAMS', specializations: { primary: 'Ayurveda' } })).toMatchObject({
      qualifications: 'BAMS',
      specialization: 'Ayurveda',
    });
    expect(fromStaffApiRecord({ id: '1', qualification: null, specializations: null })).toMatchObject({ qualifications: null, specialization: null });
  });

  it('maps paginated and bare list responses', () => {
    expect(fromStaffApiList({ items: [{ qualification: 'MD' }], total: 1 })).toMatchObject({ items: [{ qualifications: 'MD' }], total: 1 });
    expect(fromStaffApiList([{ qualification: 'MD' }])).toMatchObject([{ qualifications: 'MD' }]);
  });
});
