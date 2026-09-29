import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const frontend = (path: string) =>
  readFileSync(resolve(__dirname, '../../', path), 'utf8');

describe('treatment category contract', () => {
  it('preserves category_code through every treatment DTO direction', () => {
    const dto = frontend('features/treatments/data/models/treatments.dtos.ts');
    expect(dto.match(/category_code/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('uses the authoritative category query and submits the selected canonical code', () => {
    const form = frontend('features/treatments/presentation/components/TreatmentForm.tsx');
    expect(form).toContain('useTreatmentCategoriesQuery');
    expect(form).toContain('category_code: formData.categoryCode');
    expect(form).toContain('data.category_code ?? null');
    expect(form).not.toContain("categoryCode: 'therapy'");
    expect(form).not.toMatch(/clinicType|clinic_type/);
  });

  it('uses the catalogue-owned default for a new treatment and preserves the saved edit category', () => {
    const form = frontend('features/treatments/presentation/components/TreatmentForm.tsx');
    expect(form).toContain("treatments.form.category.requiredLabel");
    expect(form).toContain('category.is_active && category.is_default');
    expect(form).toContain('data.category_code ?? null');
    expect(form).not.toContain("categoryCode: 'general'");
    expect(form).not.toContain("t('common.noCategory')");
  });

  it('keeps treatment mutation freshness backend-authoritative', () => {
    const repository = frontend('features/treatments/data/repositories/treatments.repository.impl.ts');
    expect(repository).toContain('invalidateCanonicalOnboardingState(queryClient, tenantId)');
    expect(repository).not.toMatch(/set.*[Cc]omplet/);
  });

  it('localizes the canonical general category without a missing-token fallback', () => {
    const en = JSON.parse(frontend('core/localization/translations/en-US.json'));
    const hi = JSON.parse(frontend('core/localization/translations/hi-IN.json'));
    const form = frontend('features/treatments/presentation/components/TreatmentForm.tsx');

    expect(en.treatment_category.general).toBe('General');
    expect(hi.treatment_category.general).toBe('सामान्य');
    expect(form).toContain('t(category.display_key)');
  });
});
