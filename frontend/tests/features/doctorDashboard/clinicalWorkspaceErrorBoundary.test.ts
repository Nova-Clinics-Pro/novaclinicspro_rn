import fs from 'node:fs';
import path from 'node:path';

import { toClinicalWorkspaceError } from '../../../features/episodes/application/clinicalWorkspaceError';

jest.mock('../../../core/api/axiosClient', () => ({ normalizeError: jest.fn() }));

import { normalizeError } from '../../../core/api/axiosClient';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../../', relativePath), 'utf8');
const mockNormalizeError = normalizeError as jest.Mock;

const modules = [
  'features/episodes/presentation/components/ConsultationSections/CaseSheetModule.tsx',
  'features/episodes/presentation/components/ConsultationSections/ClinicalServicesModule.tsx',
  'features/episodes/presentation/components/ConsultationSections/PrescriptionModule.tsx',
  'features/episodes/presentation/components/ConsultationSections/TreatmentPlanModule.tsx',
  'features/episodes/presentation/components/ConsultationSections/TreatmentRecommendationModule.tsx',
];

describe('Clinical Workspace error boundary', () => {
  it('keeps all five targeted presentation modules free of raw transport-envelope parsing', () => {
    for (const modulePath of modules) {
      const source = read(modulePath);
      expect(source).toContain('toClinicalWorkspaceError');
      expect(source).not.toMatch(/error\?\.response|err\?\.response|error\.response|err\.response|AxiosError|isAxiosError/);
      expect(source).not.toMatch(/\.response\?\.(status|data)|\.response\.(status|data)/);
    }
  });

  it.each([
    [400, 'VALIDATION_FAILED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
  ])('maps HTTP %s into the stable %s contract below presentation', (status, code) => {
    mockNormalizeError.mockReturnValue({ status, message: 'backend detail' });
    expect(toClinicalWorkspaceError(new Error('backend detail'), 'Safe fallback')).toEqual({
      code,
      message: 'Safe fallback',
    });
  });

  it('never exposes an arbitrary backend message', () => {
    mockNormalizeError.mockReturnValue({ status: 500, message: 'internal server detail' });
    expect(toClinicalWorkspaceError(new Error('internal server detail'), 'Safe fallback')).toEqual({
      code: 'SAVE_FAILED',
      message: 'Safe fallback',
    });
  });
});
