import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('axios cancellation boundary', () => {
  it('returns intentional cancellation before API-error observability/logging', () => {
    const source = readFileSync(resolve(__dirname, '../../../core/api/axiosClient.ts'), 'utf8');
    const cancellation = source.indexOf("error.code === 'ERR_CANCELED'");
    const errorLog = source.indexOf("console.log('❌ API error:'");
    expect(cancellation).toBeGreaterThan(-1);
    expect(errorLog).toBeGreaterThan(cancellation);
  });
});
