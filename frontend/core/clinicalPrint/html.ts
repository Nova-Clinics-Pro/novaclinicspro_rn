import { ClinicalPrintDocument, ClinicalPrintSection } from './types';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

export const buildClinicalPrintHtml = (doc: ClinicalPrintDocument): string => {
  const clinicAddress = formatAddress(doc.clinic.address);
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: #ffffff; line-height: 1.55; }
    .page { max-width: 900px; margin: 0 auto; }
    .letterhead { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 18px; margin-bottom: 22px; }
    .logo { max-width: 82px; max-height: 82px; object-fit: contain; margin-bottom: 8px; }
    .clinic-name { font-size: 24px; font-weight: 800; color: #1d4ed8; }
    .tagline { color: #6b7280; font-size: 13px; }
    .doc-title { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: #111827; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 22px; }
    .panel-title { font-size: 14px; font-weight: 800; color: #1d4ed8; margin-bottom: 6px; }
    .line { font-size: 13px; margin-bottom: 4px; }
    .label { font-weight: 700; color: #4b5563; }
    .doctor-degree { text-align: right; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section h2 { font-size: 16px; color: #1d4ed8; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin: 0 0 10px; }
    .section-body { white-space: pre-wrap; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #2563eb; color: #ffffff; padding: 9px 8px; text-align: left; }
    td { border-bottom: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
    .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #d1d5db; text-align: center; color: #6b7280; font-size: 12px; }
    @media print { body { padding: 0; } .page { max-width: 100%; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="letterhead">
      ${doc.clinic.logoUrl ? `<img class="logo" src="${escapeHtml(doc.clinic.logoUrl)}" alt="Clinic logo">` : ''}
      ${doc.clinic.name ? `<div class="clinic-name">${escapeHtml(doc.clinic.name)}</div>` : ''}
      ${doc.clinic.tagline ? `<div class="tagline">${escapeHtml(doc.clinic.tagline)}</div>` : ''}
    </header>
    <h1 class="doc-title">${escapeHtml(doc.type)}</h1>
    <section class="meta-grid">
      <div>
        <div class="panel-title">Patient</div>
        <div class="line"><span class="label">Name:</span> ${escapeHtml(doc.client.name || 'N/A')}</div>
        ${doc.client.age ? `<div class="line"><span class="label">Age:</span> ${escapeHtml(doc.client.age)}</div>` : ''}
        ${doc.client.gender ? `<div class="line"><span class="label">Gender:</span> ${escapeHtml(doc.client.gender)}</div>` : ''}
        ${doc.client.phone ? `<div class="line"><span class="label">Phone:</span> ${escapeHtml(doc.client.phone)}</div>` : ''}
      </div>
      <div>
        <div class="panel-title">Doctor</div>
        <div class="line"><span class="label">Name:</span> ${escapeHtml(doc.doctor.name || 'N/A')}</div>
        ${doc.doctor.qualification ? `<div class="line doctor-degree">${escapeHtml(doc.doctor.qualification)}</div>` : ''}
        ${doc.doctor.specialization ? `<div class="line">${escapeHtml(doc.doctor.specialization)}</div>` : ''}
        ${doc.doctor.registrationNo ? `<div class="line"><span class="label">Regn No:</span> ${escapeHtml(doc.doctor.registrationNo)}</div>` : ''}
        ${doc.documentDate ? `<div class="line"><span class="label">Date:</span> ${escapeHtml(formatDate(doc.documentDate))}</div>` : ''}
        ${doc.status ? `<div class="line"><span class="label">Status:</span> ${escapeHtml(doc.status)}</div>` : ''}
      </div>
    </section>
    ${doc.sections.map(renderSection).join('')}
    <footer class="footer">
      ${clinicAddress ? `<div>${escapeHtml(clinicAddress)}</div>` : ''}
      ${doc.clinic.phone ? `<div>Phone: ${escapeHtml(doc.clinic.phone)}</div>` : ''}
      ${doc.clinic.email ? `<div>Email: ${escapeHtml(doc.clinic.email)}</div>` : ''}
      ${doc.clinic.website ? `<div>${escapeHtml(doc.clinic.website)}</div>` : ''}
      ${doc.clinic.legalText ? `<div>${escapeHtml(doc.clinic.legalText)}</div>` : ''}
      ${doc.clinic.registrationNo ? `<div>Reg. No: ${escapeHtml(doc.clinic.registrationNo)}</div>` : ''}
      <div>Generated on ${escapeHtml(generatedDate)}</div>
    </footer>
  </main>
</body>
</html>`;
};
