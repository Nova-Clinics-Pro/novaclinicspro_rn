import fs from 'node:fs';
import path from 'node:path';
import { AxiosError } from 'axios';

import { normalizeTreatmentOperationError } from '../../../features/treatmentSheets/data/datasources/treatmentOperationError';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../../', relativePath), 'utf8');

const targetPresentation = [
  'features/episodes/presentation/components/TreatmentPlansTab.tsx',
  'features/treatmentSheets/presentation/components/ScheduleRowModal.tsx',
  'features/treatmentSheets/presentation/pages/BulkSchedulePlanScreen.tsx',
  'features/treatmentSheets/presentation/pages/TreatmentSheetDetailScreen.tsx',
  'features/treatmentSheets/presentation/pages/detail/useTreatmentSheetRows.ts',
];

describe('Treatment error boundary', () => {
  it('keeps all five targeted Treatment presentation surfaces free of raw transport-envelope parsing', () => {
    for (const surfacePath of targetPresentation) {
      const source = read(surfacePath);
      expect(source).toContain('treatmentErrorPresentation');
      expect(source).not.toMatch(/error\?\.response|err\?\.response|error\.response|err\.response|AxiosError|isAxiosError/);
      expect(source).not.toMatch(/\.response\?\.(status|data)|\.response\.(status|data)/);
    }
  });

  it.each([
    [409, 'VERSION_CONFLICT'],
    [403, 'PERMISSION_DENIED'],
    [422, 'VALIDATION_FAILED'],
    [404, 'NOT_FOUND'],
  ])('maps HTTP %s to the stable %s Treatment contract', (status, kind) => {
    const error = new AxiosError('backend detail', undefined, undefined, undefined, { status, data: {} } as any);
    expect(normalizeTreatmentOperationError(error, 'Safe fallback')).toMatchObject({ kind });
  });

  it('never passes an arbitrary backend message to presentation', () => {
    const error = new AxiosError('backend detail', undefined, undefined, undefined, {
      status: 500,
      data: { detail: 'sensitive backend detail' },
    } as any);
    expect(normalizeTreatmentOperationError(error, 'Safe fallback')).toMatchObject({
      kind: 'SAVE_FAILED',
      message: 'Safe fallback',
    });
  });
});
