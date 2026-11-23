import { printPalette } from '../theme/printPalette';
import { sizes } from '../theme/sizes';
import { escapeHtml } from './html';
import type { PrintPaper } from './printOptions';

export interface ReportPrintDocument {
  clinicName: string;
  title: string;
  /** The date range, already formatted for the reader. */
  subtitle: string;
  generatedLabel: string;
  totalLabel: string;
  /** Language code for the page (`en`, `hi`). */
  language: string;
  columns: string[];
  rows: Array<Array<string | number | null | undefined>>;
  /** One cell per column; the first is the totals label. */
  totals?: Array<string | number | null | undefined>;
}

const styles = (accent: string) => `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans Devanagari', sans-serif; color: ${printPalette.ink}; background: ${printPalette.paper}; line-height: 1.5; }
  .page { max-width: 1000px; margin: 0 auto; }
  .letterhead { text-align: center; border-bottom: 3px solid ${accent}; padding-bottom: 14px; margin-bottom: 18px; }
  .clinic-name { font-size: 22px; font-weight: 800; color: ${accent}; }
  .doc-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; color: ${printPalette.headingInk}; }
  .subtitle { color: ${printPalette.mutedInk}; font-size: 13px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: ${accent}; color: ${printPalette.onAccent}; padding: 8px; text-align: left; }
  td { border-bottom: 1px solid ${printPalette.rule}; padding: 7px 8px; vertical-align: top; }
  tr.totals td { font-weight: 800; border-top: 2px solid ${printPalette.ruleStrong}; background: ${printPalette.panel}; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid ${printPalette.ruleStrong}; text-align: center; color: ${printPalette.mutedInk}; font-size: 12px; }
  @media print { body { padding: 0; } .page { max-width: 100%; } }
`;

const cell = (value: unknown): string => `<td>${escapeHtml(value ?? '')}</td>`;

/** A clinic report as a printable page: plain paper prints the clinic's own header, letterhead paper leaves that space blank. */
export const buildReportPrintHtml = (
  report: ReportPrintDocument,
  options: { paper?: PrintPaper; accent?: string } = {},
): string => {
  const { paper = 'plain', accent = printPalette.defaultAccent } = options;
  const header =
    paper === 'plain'
      ? `<header class="letterhead"><div class="clinic-name">${escapeHtml(report.clinicName)}</div></header>`
      : `<div class="letterhead-space" style="height: ${sizes.printLetterheadSpaceMm}mm"></div>`;
  const totals = report.totals ? `<tr class="totals">${report.totals.map(cell).join('')}</tr>` : '';
  return `<!DOCTYPE html>
<html lang="${escapeHtml(report.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>${styles(accent)}</style>
</head>
<body>
  <main class="page">
    ${header}
    <h1 class="doc-title">${escapeHtml(report.title)}</h1>
    <div class="subtitle">${escapeHtml(report.subtitle)}</div>
    <table>
      <thead><tr>${report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
      <tbody>
        ${report.rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('\n        ')}
        ${totals}
      </tbody>
    </table>
    <footer class="footer">${escapeHtml(report.generatedLabel)}</footer>
  </main>
</body>
</html>`;
};
