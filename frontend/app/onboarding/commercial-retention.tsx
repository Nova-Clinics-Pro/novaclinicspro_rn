import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useCompleteSetupMutation } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { CommercialRetentionScreen } from '../../features/onboarding/presentation/pages/CommercialRetentionScreen';
import { resetWizardDraftStorage } from '../../features/onboarding/presentation/stores/wizard.store';

export default function CommercialRetentionRoute() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const { tenantId } = useLocalSearchParams<{ tenantId?: string }>();
  const completion = useCompleteSetupMutation(tenantId ?? '');

  const completeAfterCommercialEligibility = async () => {
    if (!tenantId || completion.isPending) return;
    await completion.mutateAsync();
    await resetWizardDraftStorage();
    await refreshSession();
    router.replace('/');
  };

  return (
    <CommercialRetentionScreen
      tenantId={tenantId ?? ''}
      onCommercialEligibilityConfirmed={completeAfterCommercialEligibility}
    />
  );
}
