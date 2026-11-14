import fs from 'fs';
import path from 'path';

import { printFrame } from '../../core/clinicalPrint/webPrint';

describe('printFrame', () => {
  it('prints the iframe document and brings it to the front', () => {
    const calls: string[] = [];
    const frame = { contentWindow: { focus: () => calls.push('focus'), print: () => calls.push('print') } };
    expect(printFrame(frame)).toBe(true);
    expect(calls).toEqual(['focus', 'print']);
  });

  it('reports false, and prints nothing, when there is no frame or it has no window yet', () => {
    expect(printFrame(null)).toBe(false);
    expect(printFrame(undefined)).toBe(false);
    expect(printFrame({ contentWindow: null })).toBe(false);
  });
});

describe('the web print preview', () => {
  const dir = path.resolve(__dirname, '../../core/clinicalPrint');

  it('has its own web implementation that does not use react-native-webview (unsupported on the web)', () => {
    const web = fs.readFileSync(path.join(dir, 'ClinicalPrintPreviewModal.web.tsx'), 'utf8');
    expect(web).not.toMatch(/from 'react-native-webview'|require\('react-native-webview'\)/);
    expect(web).toMatch(/createElement\('iframe'/);
    expect(web).toMatch(/printFrame\(/);
    // the native one still uses the WebView, so phones keep working
    expect(fs.readFileSync(path.join(dir, 'ClinicalPrintPreviewModal.tsx'), 'utf8')).toMatch(/react-native-webview/);
  });
});
