/**
 * Next-Action Registry (T-FE-B.2, FR-REC-2, FR-COS-2)
 *
 * Centralized action-code -> presentation mapping. This is the ONLY
 * place an `ActionCode` string is switched on for navigation purposes —
 * `NextActionBar.tsx` must not spread a parallel switch across itself
 * and the page.
 *
 * This registry may contain ONLY presentation concerns (translation key,
 * accessibility label, an existing route builder). It must NOT determine
 * which action is recommended, whether a stage is complete, whether
 * treatment is applicable, or whether an action is clinically safe —
 * those are `resolve_clinical_workflow`'s (T-BE-B.1) job alone. This
 * file only maps a code the backend already decided into where an
 * EXISTING route already lives.
 *
 * Engineering Truth (verified by reading `clinical_workflow_resolver.py`
 * and the frontend route tree directly, not assumed):
 * - COS workflow actions stay on the canonical Episode workspace route.
 *   The optional step is presentation-only: it selects the composed module
 *   to reveal and never determines backend workflow state or eligibility.
 * - `resolve_blocker` and `review_episode_disposition` ARE real values
 *   the backend resolver emits (verified: `ActionCode.RESOLVE_BLOCKER`
 *   and `ActionCode.REVIEW_EPISODE_DISPOSITION` are both assigned in
 *   `_recommend()`), but NO existing frontend route or screen exists for
 *   either (verified: no "disposition" match anywhere in `features/` or
 *   `app/`, and blocker-resolution is inherently contextual, not a
 *   single screen). Per this task's own rule ("do not invent a route"),
 *   both have `route: null` here and `NextActionBar` renders them as a
 *   non-navigable explanatory state — a reported gap, not a fabrication.
 */
import {
  CosWorkspaceStep,
  episodeWorkspaceRoute,
} from '../../../doctorDashboard/application/consultationRoutes';

export interface NextActionContext {
  episodeId: string;
  appointmentId: string;
  clientId: string;
}

const WORKSPACE_STEP_ROUTE = (ctx: NextActionContext, step: CosWorkspaceStep) =>
  episodeWorkspaceRoute(ctx.episodeId, ctx.appointmentId, ctx.clientId, 'doctor', step);

export interface NextActionRegistryEntry {
  /** Translation key under visitCommandCenter.nextActionBar.action.* */
  translationKey: string;
  /** Existing route builder, or null when no frontend route exists yet
   * for this backend-emitted action code (a reported gap, not a stop
   * condition — see this file's own header). */
  buildRoute: ((ctx: NextActionContext) => string) | null;
}

export const NEXT_ACTION_REGISTRY: Record<string, NextActionRegistryEntry> = {
  record_assessment: {
    translationKey: 'recordAssessment',
    buildRoute: (ctx) => WORKSPACE_STEP_ROUTE(ctx, 'assessment'),
  },
  record_prescription: {
    translationKey: 'recordPrescription',
    buildRoute: (ctx) => WORKSPACE_STEP_ROUTE(ctx, 'prescription'),
  },
  record_treatment_recommendation: {
    translationKey: 'recordTreatmentRecommendation',
    buildRoute: (ctx) => WORKSPACE_STEP_ROUTE(ctx, 'treatment_recommendation'),
  },
  resolve_blocker: {
    translationKey: 'resolveBlocker',
    buildRoute: null,
  },
  complete_visit: {
    translationKey: 'completeVisit',
    buildRoute: (ctx) => WORKSPACE_STEP_ROUTE(ctx, 'completion'),
  },
  review_episode_disposition: {
    translationKey: 'reviewEpisodeDisposition',
    buildRoute: null,
  },
};

/**
 * T-FE-D.1 (W18 — "blocked stage shows reason + fix affordance", never a
 * dead end). A codes-only mirror of the backend's own `_STAGE_ACTION`
 * dict (`clinical_workflow_resolver.py`, verified: exactly these 4
 * entries) so `WorkflowPills` can look up "which existing action fixes
 * this blocked stage" and reuse `NEXT_ACTION_REGISTRY`'s route builder
 * above -- no new route, no new registry, no business logic. Stages with
 * no entry here (`consultation`, `treatment_plan`, `billing`) have no
 * discrete fix action in the backend either -- verified, not a
 * frontend omission.
 */
export const STAGE_TO_ACTION: Record<string, string> = {
  assessment: 'record_assessment',
  prescription: 'record_prescription',
  treatment_recommendation: 'record_treatment_recommendation',
  visit_completion: 'complete_visit',
};
