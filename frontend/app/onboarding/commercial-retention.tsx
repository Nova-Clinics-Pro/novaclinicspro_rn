import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '../../features/auth/presentation/hooks/useAuth';
import { useCompleteSetupMutation } from '../../features/onboarding/data/repositories/onboarding.repository.impl';
import { CommercialRetentionScreen } from '../../features/onboarding/presentation/pages/CommercialRetentionScreen';
import { resetWizardDraftStorage } from '../../features/onboarding/presentation/stores/wizard.store';

export default function CommercialRetentionRoute() {
  const router = useRouter();
  const { currentUser, refreshSession } = useAuth();
  const { tenantId } = useLocalSearchParams<{ tenantId?: string }>();
  const completion = useCompleteSetupMutation(tenantId ?? '');

  const completeAfterCommercialEligibility = async () => {
    if (!tenantId || completion.isPending) {
      throw new Error('Onboarding completion is not available.');
    }
    await completion.mutateAsync();
    await resetWizardDraftStorage();
    const refreshedUser = await refreshSession();
    if (refreshedUser.applicationStatus !== 'active') {
      throw new Error('Authoritative application context is not active.');
    }
  };

  return (
    <CommercialRetentionScreen
      tenantId={tenantId ?? ''}
      applicationStatus={currentUser?.applicationStatus}
      onCommercialEligibilityConfirmed={completeAfterCommercialEligibility}
      onCommercialConfirmationAcknowledged={() => router.replace('/')}
    />
  );
}
