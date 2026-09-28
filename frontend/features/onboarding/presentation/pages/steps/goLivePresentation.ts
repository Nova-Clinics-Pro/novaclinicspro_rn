import type {
  JourneyCorrectiveAction,
  JourneyRequirement,
  JourneyResolvedStep,
} from '../../../domain/entities/journey-visibility.entity';

const actionIdentity = (action: JourneyCorrectiveAction): string =>
  [action.kind, action.target, action.destination, action.requiredParams.join('|')].join(':');

/** The backend may attach one shared action to multiple failed requirements. */
export const uniqueCorrectiveActions = (
  actions: readonly JourneyCorrectiveAction[],
): readonly JourneyCorrectiveAction[] => {
  const seen = new Set<string>();
  return actions.filter(action => {
    const identity = actionIdentity(action);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

export const correctiveActionKey = actionIdentity;

/** Presentation maps the canonical lifecycle directly; it never re-evaluates requirements. */
export const isIncompletePrerequisite = (
  state: JourneyResolvedStep['state'],
): boolean => state !== 'COMPLETE' && state !== 'NOT_APPLICABLE';

export const isGenuinelyBlockedPrerequisite = (
  state: JourneyResolvedStep['state'],
): boolean => state === 'BLOCKED';

export const uniqueBlockers = (
  blockers: readonly JourneyRequirement[],
): readonly JourneyRequirement[] => {
  const seen = new Set<string>();
  return blockers.filter(blocker => {
    if (seen.has(blocker.requirementId)) return false;
    seen.add(blocker.requirementId);
    return true;
  });
};
