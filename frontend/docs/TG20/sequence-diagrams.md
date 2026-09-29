# TG20 Sequence Diagrams

Status: **Architecture planning**

## Scope warning

The Phase 2 roadmap defines TG20 as Workspace Preparation and explicitly excludes
Doctor Module, Clinical Workspace, scheduling, inventory, billing, payments, and
clinical workflow changes. The clinically named sequences requested for this
package are therefore documented as **downstream boundary sequences**, not TG20
behavior or implementation authorization.

## 1. TG19 handoff to Workspace Preparation

```mermaid
sequenceDiagram
    participant CE as TG19 Clinic Entry
    participant PF as Platform Foundation
    participant WP as TG20 Preparation API
    participant DB as Supabase PostgreSQL
    participant UI as Preparation UI
    CE->>PF: commit/refresh effective tenant
    PF-->>UI: authoritative tenant context
    UI->>WP: query preparation for effective tenant
    WP->>PF: authorize organization membership + tenant
    WP->>DB: load current preparation run
    DB-->>WP: authoritative projection
    WP-->>UI: Version 1 safe state and next action
```

## 2. Preparation progress and personalization handoff

```mermaid
sequenceDiagram
    participant UI as Preparation UI
    participant API as Preparation API
    participant S as Query Service
    participant DB as Supabase PostgreSQL
    participant PF as Platform Foundation
    participant PE as Progressive Experience
    loop while server permits refresh
        UI->>API: query current state
        API->>S: authorized tenant query
        S->>DB: load current run
        DB-->>UI: pending/preparing projection
    end
    UI->>API: query
    API-->>UI: PERSONALIZATION_AVAILABLE
    UI->>PF: refresh effective-tenant context
    PF-->>UI: matching tenant
    UI->>PE: enter existing personalization journey
```

## 3. Retryable failure

```mermaid
sequenceDiagram
    actor U as Organization Administrator
    participant UI as Preparation UI
    participant API as Retry API
    participant S as Retry Service
    participant ID as Organization Idempotency
    participant P as Provisioning Adapter
    participant AUD as Organization Audit
    participant UOW as Unit of Work
    U->>UI: retry current run
    UI->>API: run ID + Idempotency-Key
    API->>S: authenticated retry command
    S->>ID: begin scoped operation/fingerprint
    S->>S: lock run; verify RETRYABLE_FAILURE
    S->>P: request approved re-execution
    S->>AUD: append safe retry event
    S->>UOW: commit transition + audit
    S-->>UI: authoritative PREPARING/replay projection
```

## 4. Tenant switch during preparation

```mermaid
sequenceDiagram
    participant UI as Preparation Orchestration
    participant Q as React Query
    participant PF as Platform Foundation
    participant API as Preparation API
    UI->>Q: cancel outgoing-tenant queries
    UI->>Q: remove/invalidate outgoing preparation cache
    UI->>PF: select and refresh authorized tenant
    PF-->>UI: authoritative new effective tenant
    UI->>API: query new tenant preparation
    API-->>UI: new tenant/run projection
    Note over UI: Late outgoing responses fail tenant/run generation checks.
```

## Downstream clinical boundary diagrams

Each sequence begins only after TG20 returns
`PERSONALIZATION_AVAILABLE`. TG20 does not own or implement any named clinical
step. The diagrams show permitted context consumption and aggregate ownership.

## 5. Doctor consultation — OUT OF SCOPE

```mermaid
sequenceDiagram
    actor D as Doctor
    participant PF as Platform Foundation
    participant A as Appointments Context
    participant C as Clinical Workspace
    participant P as Patient Registry
    D->>PF: authenticate + resolve effective tenant/RBAC
    PF-->>D: authorized clinical context
    D->>A: open authorized appointment reference
    A-->>C: explicit appointment context
    C->>P: load patient through owned contract
    C-->>D: consultation workspace
    Note over C: Clinical behavior is not designed by TG20.
```

## 6. Case sheet creation — OUT OF SCOPE

```mermaid
sequenceDiagram
    actor C as Clinician
    participant PF as Platform Foundation
    participant CS as Case Sheet Context
    participant E as Episode Context
    participant DB as Supabase PostgreSQL
    C->>PF: authorize tenant + clinical role
    C->>CS: request case sheet command
    CS->>E: validate explicit episode reference
    CS->>DB: persist through owning repository/UoW
    CS-->>C: typed clinical result
    Note over CS: TG20 has no case-sheet dependency or mutation authority.
```

## 7. Prescription — OUT OF SCOPE

```mermaid
sequenceDiagram
    actor D as Authorized Prescriber
    participant PF as Platform Foundation
    participant RX as Prescription Context
    participant CR as Clinical Record
    D->>PF: authorize effective tenant + prescriber role
    D->>RX: prescribe within patient/encounter context
    RX->>CR: validate owned clinical references
    RX-->>D: persisted prescription result
    Note over RX: TG20 neither enables nor evaluates prescribing.
```

## 8. Treatment recommendation — OUT OF SCOPE

```mermaid
sequenceDiagram
    actor T as Therapist or Doctor
    participant PF as Platform Foundation
    participant CR as Clinical Record
    participant TP as Treatment Planning Context
    T->>PF: authorize tenant + clinical role
    T->>CR: read authorized episode/case-sheet context
    T->>TP: create recommendation/plan command
    TP-->>T: typed treatment-plan result
    Note over TP: TG20 does not own treatment eligibility or lifecycle.
```

## 9. Billing — OUT OF SCOPE

```mermaid
sequenceDiagram
    participant OP as Approved Operational/Clinical Event
    participant B as Billing Context
    participant PF as Platform Foundation
    participant DB as Supabase PostgreSQL
    OP-->>B: explicit billable reference/event
    B->>PF: authorize tenant + financial action
    B->>DB: persist invoice through financial repository/UoW
    B-->>OP: financial reference/status only
    Note over B: Billing never mutates clinical truth; TG20 never triggers billing.
```

## 10. Follow-up — OUT OF SCOPE

```mermaid
sequenceDiagram
    participant CR as Clinical Record
    participant A as Appointments Context
    participant N as Notifications Context
    CR-->>A: approved follow-up intent/reference
    A->>A: own scheduling validation and appointment lifecycle
    A-->>N: approved notification event
    Note over A: Follow-up policy/scheduling is outside TG20.
```

## 11. Discharge — OUT OF SCOPE

```mermaid
sequenceDiagram
    actor C as Authorized Clinician
    participant PF as Platform Foundation
    participant E as Episode Context
    participant CR as Clinical Record
    C->>PF: authorize tenant + clinical role
    C->>E: request valid discharge transition
    E->>CR: record clinical outcome/provenance through owned contract
    E-->>C: discharged episode result
    Note over E: TG20 does not define discharge criteria or state transitions.
```

## References

The Product Architecture owns downstream module boundaries. Platform Foundation
owns identity/tenant/security context. The Phase 2 roadmap owns TG20 scope. These
diagrams must not be used as clinical implementation requirements.
