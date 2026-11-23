import { buildReportPrintHtml } from '../../core/clinicalPrint/reportHtml';
import { sizes } from '../../core/theme/sizes';

const report = {
  clinicName: 'Nova <Ayurveda> Clinic',
  title: 'Daily collection',
  subtitle: '1 Nov 2026 – 30 Nov 2026',
  generatedLabel: 'Generated on 23 Nov 2026',
  totalLabel: 'Total',
  language: 'en',
  columns: ['Date', 'Total'],
  rows: [['2026-11-02', '1,700.50'], ['2026-11-03', '<b>300</b>']],
  totals: ['Total', '2,000.50'],
};

describe('printing a clinic report', () => {
  it('plain paper prints the clinic name, the title, the range, the table, the totals and when it was made', () => {
    const html = buildReportPrintHtml(report, { paper: 'plain' });
    expect(html).toContain('Daily collection');
    expect(html).toContain('1 Nov 2026 – 30 Nov 2026');
    expect(html).toContain('<th>Date</th>');
    expect(html).toContain('2,000.50');
    expect(html).toContain('Generated on 23 Nov 2026');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Nova &lt;Ayurveda&gt; Clinic');            // text from people is escaped
    expect(html).toContain('&lt;b&gt;300&lt;/b&gt;');
    expect(html).not.toContain('<b>300</b>');
  });

  it('letterhead paper leaves the printed header space blank instead of printing the clinic name', () => {
    const html = buildReportPrintHtml(report, { paper: 'letterhead' });
    expect(html).toContain(`height: ${sizes.printLetterheadSpaceMm}mm`);
    expect(html).not.toContain('Nova &lt;Ayurveda&gt; Clinic');
    expect(html).toContain('Daily collection');
  });

  it('a report with no totals prints no totals row', () => {
    const html = buildReportPrintHtml({ ...report, totals: undefined }, { paper: 'plain' });
    expect(html).not.toContain('class="totals"');
  });

  it('the language is the one it was asked for (so Hindi text uses the Devanagari font stack)', () => {
    expect(buildReportPrintHtml({ ...report, language: 'hi' }, { paper: 'plain' })).toContain('<html lang="hi">');
  });
});
