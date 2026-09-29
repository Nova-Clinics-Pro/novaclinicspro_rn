import { useLocalSearchParams } from 'expo-router';

import { WorkspacePreparationScreen } from '../../features/onboarding/presentation/pages/WorkspacePreparationScreen';

export default function WorkspacePreparationRoute() {
  const params = useLocalSearchParams<{ tenantId?: string; organizationId?: string }>();
  return (
    <WorkspacePreparationScreen
      tenantId={params.tenantId ?? ''}
      organizationId={params.organizationId ?? null}
    />
  );
}
