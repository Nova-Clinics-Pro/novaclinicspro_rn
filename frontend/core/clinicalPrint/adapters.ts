import { buildClinicalPrintHtml } from './html';
import { ClinicalPrintClinic, ClinicalPrintDocument, ClinicalPrintParty, ClinicalPrintSection } from './types';

const parsePayload = (result: any): any => {
  if (typeof result === 'string') return { html: result };
  if (result?.content_type === 'text/html') return { html: result.content };
  if (result?.content) {
    try {
      return typeof result.content === 'string' ? JSON.parse(result.content) : result.content;
    } catch {
      return { html: String(result.content) };
    }
  }
  return result || {};
};

const formatObject = (value: unknown): string => {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return value.map(formatObject).filter(Boolean).join('\n');
  if (typeof value !== 'object') return String(value);
  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item != null && item !== '')
    .map(([key, item]) => `${key.replace(/_/g, ' ')}: ${formatObject(item)}`)
    .join('\n');
};

const snapshotClinic = (header: any, footer: any): ClinicalPrintClinic => ({
  name: header?.clinic_name,
  tagline: header?.tagline,
  logoUrl: header?.logo_url,
  address: footer?.address,
  phone: footer?.phone,
  email: footer?.email,
  website: footer?.website,
  legalText: footer?.legal_text,
  registrationNo: footer?.registration_no,
});

/**
 * The doctor on a signed document, from its frozen footer snapshot. The backend writes `{ doctor: { full_name,
 * qualification, registration_number, ... } }`; the `recorded_by_*` fields are the older flat shape. Both are read, so the
 * name and degree print whichever shape the document was signed with.
 */
export const snapshotDoctor = (footer: any): ClinicalPrintParty => {
  const doctor = footer?.doctor ?? {};
  return {
    name: footer?.recorded_by_name ?? doctor.full_name,
    qualification: footer?.recorded_by_qualification ?? doctor.qualification,
    specialization: footer?.recorded_by_specialization ?? doctor.specialization,
    registrationNo: footer?.recorded_by_registration_no ?? doctor.registration_number,
  };
};

const snapshotClient = (client: any): ClinicalPrintParty => ({
  name: client?.full_name || client?.name,
  age: client?.age,
  gender: client?.gender,
  phone: client?.phone,
  email: client?.email,
});

export const buildPrescriptionPrintHtml = (result: any): string => {
  const data = parsePayload(result);
  if (data.html) return data.html;
  const branding = data.branding || {};
  const medications = data.prescription_data?.medications || [];
  const sections: ClinicalPrintSection[] = [
    {
      title: 'Medications',
      table: {
        headers: ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Instructions'],
        rows: medications.map((med: any, index: number) => [
          index + 1,
          med.name,
          med.dosage,
          med.frequency,
          med.duration,
          med.instructions || med.route,
        ]),
      },
    },
    data.prescription_data?.dietary_advice && { title: 'Dietary Advice', body: data.prescription_data.dietary_advice },
    data.prescription_data?.lifestyle_advice && { title: 'Lifestyle Advice', body: data.prescription_data.lifestyle_advice },
    data.prescription_data?.follow_up_instructions && { title: 'Follow-up Instructions', body: data.prescription_data.follow_up_instructions },
    data.notes && { title: 'Notes', body: data.notes },
    data.next_visit_days && { title: 'Follow-up', body: `Follow-up in ${data.next_visit_days} days` },
  ].filter(Boolean) as ClinicalPrintSection[];

  return buildClinicalPrintHtml({
    type: 'Prescription',
    title: `Prescription - ${data.patient_name || 'Patient'}`,
    clinic: {
      name: branding.clinic_name,
      address: branding.clinic_address,
      phone: branding.clinic_phone,
      email: branding.clinic_email,
      logoUrl: branding.clinic_logo_url,
    },
    doctor: {
      name: branding.doctor_name,
      qualification: branding.doctor_qualification,
      registrationNo: branding.doctor_registration_number,
    },
    client: {
      name: data.patient_name,
      age: data.patient_age,
      gender: data.patient_gender,
      phone: data.patient_phone,
    },
    documentDate: data.issued_date,
    sections,
  });
};

export const buildCasesheetPrintHtml = (result: any): string => {
  const data = parsePayload(result);
  if (data.html) return data.html;
  const casesheet = data.casesheet || data;
  const json = casesheet.data_json || {};
  const sections: ClinicalPrintSection[] = [
    casesheet.chief_complaint && { title: 'Chief Complaint', body: casesheet.chief_complaint },
    json.subjective && { title: 'Subjective', body: json.subjective },
    json.objective && { title: 'Objective', body: json.objective },
    json.assessment && { title: 'Assessment', body: json.assessment },
    json.plan && { title: 'Plan', body: json.plan },
    casesheet.provisional_diagnosis && { title: 'Provisional Diagnosis', body: casesheet.provisional_diagnosis },
    casesheet.final_diagnosis && { title: 'Final Diagnosis', body: casesheet.final_diagnosis },
    ...(json.extensions || []).map((ext: any) => ({
      title: ext.template_name || 'Extension',
      body: formatObject(ext.data || {}),
    })),
  ].filter(Boolean) as ClinicalPrintSection[];

  return buildClinicalPrintHtml({
    type: 'Case Sheet',
    title: `Case Sheet - ${data.client?.full_name || data.client?.name || 'Patient'}`,
    clinic: snapshotClinic(data.header_snapshot, data.footer_snapshot),
    doctor: snapshotDoctor(data.footer_snapshot),
    client: snapshotClient(data.client),
    documentDate: casesheet.recorded_at || casesheet.created_at,
    status: casesheet.status,
    sections,
  });
};

export const buildTreatmentSheetPrintHtml = (result: any): string => {
  const data = parsePayload(result);
  if (data.html) return data.html;
  const sheet = data.treatment_sheet || data;
  const rows = sheet.rows || [];
  const sections: ClinicalPrintSection[] = [
    {
      title: 'Treatment Plan',
      body: [
        sheet.duration_days ? `Duration: ${sheet.duration_days} days` : null,
        sheet.agreed_package_cost ? `Package Cost: ₹${sheet.agreed_package_cost}` : null,
        sheet.start_date ? `Start Date: ${sheet.start_date}` : null,
      ].filter(Boolean).join('\n'),
    },
    {
      title: 'Treatment Days',
      table: {
        headers: ['Day', 'Date', 'Treatment', 'Medicines', 'Instructions', 'Status'],
        rows: rows.map((row: any) => [
          row.day_number,
          row.session_date,
          row.treatment_description || row.treatment_name,
          row.medicines_given || row.medicines_text,
          row.instructions || row.instructions_text,
          row.status,
        ]),
      },
    },
  ];

  return buildClinicalPrintHtml({
    type: 'Treatment Sheet',
    title: `Treatment Sheet - ${data.client?.full_name || data.client?.name || 'Patient'}`,
    clinic: snapshotClinic(data.header_snapshot, data.footer_snapshot),
    doctor: snapshotDoctor(data.footer_snapshot),
    client: snapshotClient(data.client),
    documentDate: sheet.recorded_at || sheet.created_at || sheet.start_date,
    status: sheet.status,
    sections,
  });
};
