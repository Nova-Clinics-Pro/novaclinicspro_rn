import { buildClinicalPrintHtml } from '../../core/clinicalPrint/html';
import { buildPrescriptionPrintHtml } from '../../core/clinicalPrint/adapters';
import { changeLanguage } from '../../core/localization/i18n';
import { printPalette } from '../../core/theme/printPalette';
import { sizes } from '../../core/theme/sizes';
import type { ClinicalPrintDocument } from '../../core/clinicalPrint/types';

const doc: ClinicalPrintDocument = {
  type: 'Prescription',
  title: 'Prescription - Asha',
  clinic: { name: 'Sri Clinic', tagline: 'Healing', phone: '+91 99999 00000', email: 'c@example.com', address: '1 Main Road' },
  doctor: { name: 'Dr Rao', qualification: 'BAMS', registrationNo: 'REG1' },
  client: { name: 'Asha', age: 41, gender: 'Female', phone: '9100000201' },
  documentDate: '2047-08-12T10:00:00Z',
  status: 'SIGNED',
  sections: [{ title: 'Notes', body: 'Rest' }],
};

afterEach(async () => { await changeLanguage('en-US'); });

describe('printed document HTML', () => {
  it('on plain paper prints the clinic header and footer', () => {
    const html = buildClinicalPrintHtml(doc, { paper: 'plain' });
    expect(html).toContain('class="letterhead"');
    expect(html).toContain('Sri Clinic');
    expect(html).toContain('class="footer"');
    expect(html).toContain('Generated on');
    expect(html).not.toContain('letterhead-space');
  });

  it('on pre-printed letterhead paper leaves the header area free and prints only the document', () => {
    const html = buildClinicalPrintHtml(doc, { paper: 'letterhead' });
    expect(html).not.toContain('class="letterhead"');
    expect(html).not.toContain('class="footer"');
    expect(html).not.toContain('Sri Clinic');
    expect(html).toContain(`height: ${sizes.printLetterheadSpaceMm}mm`);
    expect(html.indexOf('letterhead-space')).toBeLessThan(html.indexOf('Asha', html.indexOf('<body>')));   // the free space comes before the document
    expect(html).toContain('Dr Rao'); expect(html).toContain('BAMS');   // the document itself is unchanged
  });

  it('defaults to plain paper', () => {
    expect(buildClinicalPrintHtml(doc)).toContain('class="letterhead"');
  });

  it('takes its accent colour from the clinic theme and its ink from the central print palette', () => {
    const html = buildClinicalPrintHtml(doc, { paper: 'plain', accent: '#123456' });
    expect(html).toContain('#123456');
    expect(html).toContain(printPalette.ink);
    expect(html).not.toContain('#2563eb');   // the old hard-coded blue letterhead
  });

  it('prints its labels in the app language, with the page declaring it', async () => {
    await changeLanguage('hi-IN');
    const html = buildClinicalPrintHtml(doc, { paper: 'plain' });
    expect(html).toContain('<html lang="hi">');
    expect(html).toContain('रोगी');                 // Patient
    expect(html).toContain('तैयार किया गया');       // Generated on
    expect(html).toContain('प्रिस्क्रिप्शन');       // the document type
    expect(html).not.toContain('Generated on');
    expect(html).not.toContain('>Patient<');
  });

  it('English stays English and says so', () => {
    const html = buildClinicalPrintHtml(doc, { paper: 'plain' });
    expect(html).toContain('<html lang="en">'); expect(html).toContain('Patient'); expect(html).toContain('Regn No');
  });

  it('escapes what it prints', () => {
    const html = buildClinicalPrintHtml({ ...doc, client: { name: '<b>x</b>' } });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(html).not.toContain('<b>x</b>');
  });
});

describe('prescription print', () => {
  const payload = { patient_name: 'Asha', branding: { clinic_name: 'Sri Clinic', doctor_name: 'Dr Rao', doctor_qualification: 'BAMS' }, prescription_data: { medications: [{ name: 'Tab X', dosage: '1', frequency: 'bd', duration: '3 days' }], dietary_advice: 'Light food' }, next_visit_days: 7 };

  it('follows the paper choice', () => {
    expect(buildPrescriptionPrintHtml(payload, { paper: 'letterhead' })).not.toContain('Sri Clinic');
    expect(buildPrescriptionPrintHtml(payload, { paper: 'plain' })).toContain('Sri Clinic');
  });

  it('labels the table and sections in the app language', async () => {
    await changeLanguage('hi-IN');
    const html = buildPrescriptionPrintHtml(payload, { paper: 'plain' });
    for (const hindi of ['दवाएं', 'दवा', 'खुराक', 'आवृत्ति', 'अवधि', 'आहार सलाह', '7 दिन में अनुवर्ती']) expect(html).toContain(hindi);
    expect(html).not.toContain('Medications'); expect(html).not.toContain('Dietary Advice'); expect(html).not.toContain('Follow-up in');
  });

  it('English still reads as before', () => {
    const html = buildPrescriptionPrintHtml(payload, { paper: 'plain' });
    for (const text of ['Medications', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Dietary Advice', 'Follow-up in 7 days', 'Prescription - Asha']) expect(html).toContain(text);
  });
});
