import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(tsx?)$/.test(entry.name) ? [full] : [];
  });

describe('date inputs', () => {
  it('no screen uses a plain text box for a date: dates use DateField, which has a working calendar on web and phones', () => {
    const offenders = ['features', 'app', 'core']
      .flatMap(dir => sourceFiles(path.join(ROOT, dir)))
      .filter(file => !file.endsWith('DateField.tsx'))
      .filter(file => /placeholder=["']YYYY-MM-DD["']/.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
