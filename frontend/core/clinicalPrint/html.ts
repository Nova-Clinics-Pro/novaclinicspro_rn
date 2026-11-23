import { getDateLocale } from '../localization/dateLocale';
import { getCurrentLocale, t } from '../localization/i18n';
import { printPalette } from '../theme/printPalette';
import { sizes } from '../theme/sizes';
import type { PrintPaper } from './printOptions';
import { ClinicalDocumentType, ClinicalPrintDocument, ClinicalPrintSection } from './types';

export interface PrintHtmlOptions {
  /** Plain paper prints the clinic's header and footer; letterhead paper already carries them, so only the document is printed. */
  paper?: PrintPaper;
  /** The clinic theme's accent colour (headings, table header). */
  accent?: string;
}

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const label = (key: string, params?: Record<string, string | number>): string => t(`print.labels.${key}`, params);

const DOCUMENT_TYPE_LABELS: Record<ClinicalDocumentType, string> = {
  Prescription: 'prescription',
  'Case Sheet': 'caseSheet',
  'Treatment Sheet': 'treatmentSheet',
};

const formatAddress = (address: unknown): string => {
  if (typeof address === 'string') return address;
  if (!address || typeof address !== 'object') return '';
  const item = address as Record<string, unknown>;
  return [item.street, item.city, item.state, item.country, item.pincode]
    .filter(Boolean)
    .map(String)
    .join(', ');
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
};

const renderSection = (section: ClinicalPrintSection) => `
  <section class="section">
    <h2>${escapeHtml(section.title)}</h2>
    ${section.body ? `<div class="section-body">${escapeHtml(section.body)}</div>` : ''}
    ${section.table ? `
      <table>
        <thead><tr>${section.table.headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>
          ${section.table.rows.map(row => `
            <tr>${row.map(cell => `<td>${escapeHtml(cell || '-')}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  </section>
`;

const styles = (accent: string) => `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Devanagari', sans-serif; color: ${printPalette.ink}; background: ${printPalette.paper}; line-height: 1.55; }
    .page { max-width: 900px; margin: 0 auto; }
    .letterhead { text-align: center; border-bottom: 3px solid ${accent}; padding-bottom: 18px; margin-bottom: 22px; }
    .logo { max-width: 82px; max-height: 82px; object-fit: contain; margin-bottom: 8px; }
    .clinic-name { font-size: 24px; font-weight: 800; color: ${accent}; }
    .tagline { color: ${printPalette.mutedInk}; font-size: 13px; }
    .doc-title { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: ${printPalette.headingInk}; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: ${printPalette.panel}; border: 1px solid ${printPalette.rule}; border-radius: 10px; padding: 14px; margin-bottom: 22px; }
    .panel-title { font-size: 14px; font-weight: 800; color: ${accent}; margin-bottom: 6px; }
    .line { font-size: 13px; margin-bottom: 4px; }
    .label { font-weight: 700; color: ${printPalette.labelInk}; }
    .doctor-degree { text-align: right; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section h2 { font-size: 16px; color: ${accent}; border-bottom: 1px solid ${printPalette.rule}; padding-bottom: 5px; margin: 0 0 10px; }
    .section-body { white-space: pre-wrap; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: ${accent}; color: ${printPalette.onAccent}; padding: 9px 8px; text-align: left; }
    td { border-bottom: 1px solid ${printPalette.rule}; padding: 8px; vertical-align: top; }
    .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid ${printPalette.ruleStrong}; text-align: center; color: ${printPalette.mutedInk}; font-size: 12px; }
    @media print { body { padding: 0; } .page { max-width: 100%; } }
`;

export const buildClinicalPrintHtml = (doc: ClinicalPrintDocument, options: PrintHtmlOptions = {}): string => {
  const { paper = 'plain', accent = printPalette.defaultAccent } = options;
  const clinicAddress = formatAddress(doc.clinic.address);
  const generatedDate = new Date().toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const language = getCurrentLocale().split('-')[0];
  const plainPaper = paper === 'plain';

  const header = plainPaper
    ? `<header class="letterhead">
      ${doc.clinic.logoUrl ? `<img class="logo" src="${escapeHtml(doc.clinic.logoUrl)}" alt="${escapeHtml(label('clinicLogoAlt'))}">` : ''}
      ${doc.clinic.name ? `<div class="clinic-name">${escapeHtml(doc.clinic.name)}</div>` : ''}
      ${doc.clinic.tagline ? `<div class="tagline">${escapeHtml(doc.clinic.tagline)}</div>` : ''}
    </header>`
    : `<div class="letterhead-space" style="height: ${sizes.printLetterheadSpaceMm}mm"></div>`;

  const footer = plainPaper
    ? `<footer class="footer">
      ${clinicAddress ? `<div>${escapeHtml(clinicAddress)}</div>` : ''}
      ${doc.clinic.phone ? `<div>${escapeHtml(label('phone'))}: ${escapeHtml(doc.clinic.phone)}</div>` : ''}
      ${doc.clinic.email ? `<div>${escapeHtml(label('email'))}: ${escapeHtml(doc.clinic.email)}</div>` : ''}
      ${doc.clinic.website ? `<div>${escapeHtml(doc.clinic.website)}</div>` : ''}
      ${doc.clinic.legalText ? `<div>${escapeHtml(doc.clinic.legalText)}</div>` : ''}
      ${doc.clinic.registrationNo ? `<div>${escapeHtml(label('clinicRegistration'))}: ${escapeHtml(doc.clinic.registrationNo)}</div>` : ''}
      <div>${escapeHtml(label('generatedOn'))} ${escapeHtml(generatedDate)}</div>
    </footer>`
    : '';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)}</title>
  <style>${styles(accent)}</style>
</head>
<body>
  <main class="page">
    ${header}
    <h1 class="doc-title">${escapeHtml(label(DOCUMENT_TYPE_LABELS[doc.type]))}</h1>
    <section class="meta-grid">
      <div>
        <div class="panel-title">${escapeHtml(label('patient'))}</div>
        <div class="line"><span class="label">${escapeHtml(label('name'))}:</span> ${escapeHtml(doc.client.name || label('notAvailable'))}</div>
        ${doc.client.age ? `<div class="line"><span class="label">${escapeHtml(label('age'))}:</span> ${escapeHtml(doc.client.age)}</div>` : ''}
        ${doc.client.gender ? `<div class="line"><span class="label">${escapeHtml(label('gender'))}:</span> ${escapeHtml(doc.client.gender)}</div>` : ''}
        ${doc.client.phone ? `<div class="line"><span class="label">${escapeHtml(label('phone'))}:</span> ${escapeHtml(doc.client.phone)}</div>` : ''}
      </div>
      <div>
        <div class="panel-title">${escapeHtml(label('doctor'))}</div>
        <div class="line"><span class="label">${escapeHtml(label('name'))}:</span> ${escapeHtml(doc.doctor.name || label('notAvailable'))}</div>
        ${doc.doctor.qualification ? `<div class="line doctor-degree">${escapeHtml(doc.doctor.qualification)}</div>` : ''}
        ${doc.doctor.specialization ? `<div class="line">${escapeHtml(doc.doctor.specialization)}</div>` : ''}
        ${doc.doctor.registrationNo ? `<div class="line"><span class="label">${escapeHtml(label('doctorRegistration'))}:</span> ${escapeHtml(doc.doctor.registrationNo)}</div>` : ''}
        ${doc.documentDate ? `<div class="line"><span class="label">${escapeHtml(label('date'))}:</span> ${escapeHtml(formatDate(doc.documentDate))}</div>` : ''}
        ${doc.status ? `<div class="line"><span class="label">${escapeHtml(label('status'))}:</span> ${escapeHtml(doc.status)}</div>` : ''}
      </div>
    </section>
    ${doc.sections.map(renderSection).join('')}
    ${footer}
  </main>
</body>
</html>`;
};
