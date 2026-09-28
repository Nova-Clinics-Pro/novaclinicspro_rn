import {
  correctiveActionKey,
  isGenuinelyBlockedPrerequisite,
  isIncompletePrerequisite,
  uniqueBlockers,
  uniqueCorrectiveActions,
} from '../../features/onboarding/presentation/pages/steps/goLivePresentation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import enUS from '../../core/localization/translations/en-US.json';
import hiIN from '../../core/localization/translations/hi-IN.json';

const action = {
  kind: 'NAVIGATE' as const,
  target: 'edit_clinic_profile',
  destination: 'clinic.profile',
  requiredParams: ['tenant_id', 'step_id'],
  labelToken: 'onboarding.actions.edit_clinic_profile.label',
  availability: 'AVAILABLE' as const,
  fallbackToken: 'onboarding.actions.unavailable',
};

const requirement = {
  requirementId: 'validation.clinic_profile.required_fields',
  satisfied: false,
  currentValue: false,
  requiredValue: true,
  titleToken: 'onboarding.requirements.clinic_profile.title',
  helpToken: 'onboarding.requirements.clinic_profile.help',
  blockerToken: 'onboarding.requirements.clinic_profile.blocker',
  correctiveAction: action,
};

describe('GoLive presentation deduplication', () => {
  it('renders a shared corrective action only once with a stable key', () => {
    expect(uniqueCorrectiveActions([action, { ...action }])).toEqual([action]);
    expect(correctiveActionKey(action)).toBe('NAVIGATE:edit_clinic_profile:clinic.profile:tenant_id|step_id');
  });

  it('renders each failed requirement only once', () => {
    expect(uniqueBlockers([requirement, { ...requirement }])).toEqual([requirement]);
  });

  it('preserves canonical incomplete and genuine-blocker semantics', () => {
    expect(isIncompletePrerequisite('NOT_STARTED')).toBe(true);
    expect(isIncompletePrerequisite('IN_PROGRESS')).toBe(true);
    expect(isIncompletePrerequisite('BLOCKED')).toBe(true);
    expect(isIncompletePrerequisite('COMPLETE')).toBe(false);
    expect(isGenuinelyBlockedPrerequisite('NOT_STARTED')).toBe(false);
    expect(isGenuinelyBlockedPrerequisite('IN_PROGRESS')).toBe(false);
    expect(isGenuinelyBlockedPrerequisite('BLOCKED')).toBe(true);
  });

  it('presents missing workspace preparation as one final readiness handoff, not a wizard step', () => {
    const source = readFileSync(resolve(__dirname, '../../features/onboarding/presentation/pages/steps/GoLiveScreen.tsx'), 'utf8');
    expect(source).toContain('finalReadiness.title');
    expect(source).toContain('finalReadiness.message');
    expect(source).toContain('readiness.data?.authorizesHandoff');
    expect(source).toContain('CommercialRetentionScreen');
    expect(source).toContain('useEnsureWorkspacePreparationMutation');
    expect(source).toContain("targetId === 'onboarding.workspace_preparation'");
    expect(source).toContain('attemptedPreparationScope');
    expect(source).toContain('preparation.mutateAsync()');
    expect(source).not.toContain('router.push(\'/onboarding/workspace-preparation');
    expect(source).not.toContain('Your clinic requires more preparation');
  });

  it('resolves final-readiness copy from the mounted GoLive namespace in every active locale', () => {
    expect(
      enUS.onboarding.progressiveExperience.readyToStart.presentation.finalReadiness,
    ).toEqual({
      title: 'Clinic setup complete',
      message: 'Your clinic setup is complete. We’re finishing the final readiness check before you start your trial.',
    });
    expect(
      hiIN.onboarding.progressiveExperience.readyToStart.presentation.finalReadiness,
    ).toEqual({
      title: 'क्लिनिक सेटअप पूरा हो गया है',
      message: 'आपका क्लिनिक सेटअप पूरा हो गया है। ट्रायल शुरू करने से पहले हम अंतिम तैयारी जांच पूरी कर रहे हैं।',
    });
  });
});
