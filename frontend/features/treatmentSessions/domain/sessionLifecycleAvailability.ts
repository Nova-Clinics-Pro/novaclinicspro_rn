/**
 * Start / Complete actions on the legacy clinic-admin treatment-session screens are hidden.
 *
 * They call PATCH /clinic/{tenant}/treatment-sessions/{id}/start and /complete, which the backend does not
 * provide (it has only create/read/update/delete, and its session model has no status: just `is_active` and
 * `session_notes`). Showing the buttons would only produce 404s. Turn this on only after the backend defines a
 * session lifecycle (or the screens move to the therapist-session surface).
 */
export const TREATMENT_SESSION_LIFECYCLE_ACTIONS_AVAILABLE = false;
