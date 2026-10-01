import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../../app/doctor.tsx'), 'utf8');

describe('Doctor permission-error recovery', () => {
  it('preserves back navigation when history exists and falls back to root otherwise', () => {
    const block = source.slice(source.indexOf('if (isPermissionError)'), source.indexOf('} else if (isAuthError)'));
    expect(block).toContain('router.canGoBack()');
    expect(block).toContain('router.back()');
    expect(block).toContain("router.replace('/')");
  });
});
