import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const babel = require('@babel/core');
const configFile = path.join(__dirname, '../../babel.config.js');
const source = "console.log('patient', name); console.info('i'); console.debug('d'); console.warn('w'); console.error('e'); export const x = 1;";
const build = (envName: string): string => babel.transformSync(source, { configFile, envName, filename: 'sample.ts', cwd: path.join(__dirname, '../..') }).code;

describe('production build logging', () => {
  it('removes console.log, info and debug from a production build but keeps warn and error', () => {
    const code = build('production');
    expect(code).not.toMatch(/console\.(log|info|debug)/);
    expect(code).toMatch(/console\.warn/);
    expect(code).toMatch(/console\.error/);
  });

  it('keeps every console call in development', () => {
    expect(build('development')).toMatch(/console\.log/);
  });
});
