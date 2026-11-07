import { readFileSync } from 'fs';
import { resolve } from 'path';

const targetPresentationFiles = [
  'features/rbac/presentation/hooks/useApiErrorHandler.ts',
  'features/operatingHours/presentation/pages/OperatingHoursScreen.tsx',
  'features/casesheets/presentation/pages/CasesheetDetailScreen.tsx',
  'features/casesheets/presentation/pages/CasesheetEditScreen.tsx',
  'features/casesheets/presentation/pages/CasesheetStandaloneScreen.tsx',
  'features/casesheets/presentation/pages/CasesheetsListScreen.tsx',
  'features/prescriptions/presentation/pages/PrescriptionDetailScreen.tsx',
  'features/prescriptions/presentation/pages/PrescriptionEditScreen.tsx',
  'features/prescriptions/presentation/pages/PrescriptionsListScreen.tsx',
  'features/treatmentSheets/presentation/pages/detail/TreatmentSheetDetailContent.tsx',
];

describe('B1 transport error normalization residuals', () => {
  it.each(targetPresentationFiles)('%s does not infer HTTP protocol from error text', (file) => {
    const source = readFileSync(resolve(__dirname, '../../..', file), 'utf8');
    expect(source).not.toMatch(/\.message\?*\.includes\(['\"](?:401|403)['\"]\)|\.message\.includes\(['\"](?:401|403)['\"]\)/);
    expect(source).not.toMatch(/from ['\"].*core\/api\/axiosClient/);
    expect(source).not.toMatch(/(?:error|err)\?*\.response|isAxiosError|AxiosError/);
  });
});
