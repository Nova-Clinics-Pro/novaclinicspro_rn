import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    '../../../features/therapistDashboard/presentation/components/TreatmentSessionCompleteModal.tsx'
  ),
  'utf8'
);

describe('TreatmentSessionCompleteModal Inventory architecture', () => {
  it('uses the canonical Inventory list query for autocomplete', () => {
    expect(source).toMatch(/useInventoryItemsListQuery/);
    expect(source).toMatch(/search: debouncedQuery, limit: 8, is_active: true/);
  });

  it('does not own Inventory transport', () => {
    expect(source).not.toMatch(/listInventoryItemsApi/);
    expect(source).not.toMatch(/inventory\.api/);
    expect(source).not.toMatch(/axiosClient|\/api\/v1\//);
  });
});
