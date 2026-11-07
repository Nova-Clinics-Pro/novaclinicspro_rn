import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const source = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8');

it('platform domain has no data/transport dependencies', () => {
  for (const path of ['features/tenants/domain/entities/platformTenant.ts','features/tenants/domain/repositories/platformTenant.repository.ts']) {
    const s = source(path);
    expect(s).not.toMatch(/from ['"][^'"]*(?:data\/|axios|supabase|react-query)/);
  }
});
it('screens use approved query hooks and shared controls, not transport or local logout', () => {
  for (const path of ['features/tenants/presentation/pages/PlatformTenantsScreen.tsx','features/tenants/presentation/components/PlatformTenantManage.tsx','features/tenants/presentation/components/PlatformAdminShell.tsx']) {
    const s = source(path);
    expect(s).not.toMatch(/axios|\bfetch\(|datasources|\/api\/v1|\.signOut\(|window\.confirm|Alert\.alert/);
    expect(s).not.toMatch(/#[\da-fA-F]{3,8}\b|rgba?\(/);
    expect(s).not.toMatch(/fontSize\s*:\s*\d|padding\s*:\s*\d|borderRadius\s*:\s*\d/);
  }
  const screen = source('features/tenants/presentation/pages/PlatformTenantsScreen.tsx');
  expect(screen).not.toMatch(/\bButton[, }]|router\.(?:push|back)\(/);
  expect(screen).toContain('PlatformAdminShell');
  const shell = source('features/tenants/presentation/components/PlatformAdminShell.tsx');
  expect(shell).toContain('useLogoutConfirmation');
  expect(shell).toContain('DashboardHeader');
  expect(shell).toContain('useBackNavigation');
});
it('repository implements a domain contract and maps DTOs below presentation', () => {
  const repository = source('features/tenants/data/repositories/platformTenants.repository.ts');
  expect(repository).toContain('IPlatformTenantRepository');
  expect(repository).toContain('mapPlatformTenant');
  expect(repository).toContain('platformTenantKeys');
  const datasource = source('features/tenants/data/datasources/platformTenants.api.ts');
  expect(datasource).toContain('PlatformTenantDto');
  expect(datasource).not.toContain("domain/entities/platformTenant';\n\nexport const");
});
it('new shared UI references central theme values instead of local palettes', () => {
  for (const path of ['core/components/ui/ThemedCard.tsx','core/components/ui/ThemedSelect.tsx','core/components/ui/ThemedNotice.tsx','core/components/ui/StatusBadge.tsx','core/components/ui/ThemedButton.tsx','core/components/ui/ThemedInput.tsx','core/components/ui/ThemedText.tsx','core/components/ui/DataTable.tsx','core/components/DashboardHeader.tsx','core/components/ConfirmationDialog.tsx']) {
    const s = source(path);
    expect(s).toContain('useClinicTheme');
    expect(s).not.toMatch(/#[\da-fA-F]{3,8}\b|rgba?\(/);
    expect(s).not.toMatch(/fontSize\s*:\s*\d|padding\s*:\s*\d|borderRadius\s*:\s*\d/);
  }
});

it('administrative presentation adapters cannot execute commands or access transport', () => {
  const adapter = source('features/tenants/application/platformTenantPresentation.ts');
  expect(adapter).not.toMatch(/axios|\bfetch\(|datasources|\/api\/v1|supabase|grant_extension/);
  expect(adapter).not.toContain('administrationAvailability');
  const manage = source('features/tenants/presentation/components/PlatformTenantManage.tsx');
  expect(manage).not.toMatch(/useMutation|administrationAvailability|\.post\(|axios|commercialPlatform/);
  expect(manage).toContain('usePlatformTrialCommands');
  expect(manage).toContain("label={t('platformAdmin.prepareExtension')}");
  expect(manage).toContain("label={t('platformAdmin.viewSubscription')}");
  expect(manage).toContain('manage-card-administration');
});
