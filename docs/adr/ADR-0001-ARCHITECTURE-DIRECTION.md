# ADR-0001: Next-Generation Umana Operations Platform Architecture Direction

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-13 |
| **Deciders** | Umana Technical Lead, preproducao@umana.ag (system owner) |
| **Supersedes** | N/A (first ADR for this platform) |
| **Relates to** | MIGRATION_STRATEGY.md Phase 1+ |

---

## Context

The current Umana Operations Platform is built entirely on Google Apps Script (GAS) and Google Sheets. While this platform has served the organization effectively, it carries a set of structural limitations that are increasingly painful as operational scale grows:

**Untestability**: GAS runs in a sandboxed Google runtime that cannot be executed outside of Google's cloud. There is no way to run unit tests, integration tests, or regression tests against the codebase. All validation is manual and production-risk-bearing. The current codebase has zero automated test coverage.

**Execution fragility**: GAS executions are capped at 6 minutes per invocation. Long-running workflows (large FastQuote batches, bulk CND consultations) are routinely truncated mid-execution, leaving the system in inconsistent states that require manual detection and correction.

**No queue infrastructure**: There is no job queue in the current system. Parallel operations (e.g., sending 30 FastQuote emails) are executed synchronously in a single GAS execution. Queue-like behavior is simulated with Sheets flags, which are not transactional and have no retry, backoff, or dead-letter capabilities.

**Personal account dependency**: The entire platform — triggers, Web App deployments, Drive folder ownership, Gmail sending identity, API credentials — is owned by or depends on `daniel.valin@thanks.ag`, a personal work account. This creates an unacceptable single point of failure. See IDENTITY_AND_OWNERSHIP.md for full risk analysis.

**No audit trail**: There is no immutable record of who did what, when, and why. This is a compliance risk, an operational debugging risk, and an organizational accountability gap.

**No type safety or schema enforcement**: GAS is written in ES5 JavaScript with no TypeScript, no ORM, and no schema. Data is read from Sheets as untyped arrays. Runtime type errors (e.g., CNPJ being treated as a number) manifest as production bugs rather than compile-time or schema-level failures.

**No environment separation**: There is no dev/staging/prod environment separation. All development happens against production data.

**Mixed execution context**: Some scripts run as the deploying user, some as the accessing user. This creates unpredictable behavior for Gmail, Drive, and Sheets access depending on entry point.

The organization needs a platform that is: testable, auditable, type-safe, queue-backed, identity-independent, and incrementally replaceable.

---

## Decision

We will build the next-generation Umana Operations Platform using the following technology stack:

### Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript (strict mode) | Type safety catches domain errors at compile time; team familiarity; rich ecosystem |
| Runtime | Node.js (LTS) | Mature, well-supported, excellent Google API libraries |
| Framework | Fastify or Express (TBD at implementation) | HTTP API for Dashboard and webhook integrations |
| Database | PostgreSQL | ACID transactions; JSON column support for flexible fields; row-level security; robust; open source |
| ORM | Prisma | Type-safe schema management; migration tooling; excellent TypeScript integration; readable schema DSL |
| Queue | BullMQ (Redis-backed) | Reliable job queue with retries, backoff, dead-letter, concurrency controls, and priority; widely used in Node.js ecosystem |
| Testing | Vitest | Fast, TypeScript-native test runner; compatible with modern ESM; excellent coverage reporting |
| External integrations | Adapter pattern | All Google Workspace and third-party integrations are behind interfaces, never called directly from domain logic |

### Architecture Pattern: Adapter / Ports-and-Adapters

All interactions with external systems (Gmail, Google Drive, Google Sheets, Infosimples, Claude API) must go through a defined adapter interface. The domain logic (state machines, entity operations, business rules) must have zero direct dependencies on any external service client.

```
┌────────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                               │
│   (TypeScript classes/functions with zero external dependencies)   │
│   FastQuoteService | ComplianceService | BillingService            │
│   State machines   | Entity invariants | Business rules            │
└────────────────┬───────────────────────────────────────────────────┘
                 │ uses interfaces only
                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                     ADAPTER INTERFACES (Ports)                     │
│   IEmailAdapter | IDriveAdapter | ISheetAdapter                   │
│   IComplianceDataAdapter | IAIAdapter                              │
└────────────────┬───────────────────────────────────────────────────┘
                 │ implemented by
                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                    CONCRETE ADAPTERS                               │
│  GmailAdapter | GoogleDriveAdapter | GoogleSheetsLegacyAdapter     │
│  InfosimplesAdapter | AnthropicClaudeAdapter                       │
│  MockEmailAdapter (for tests) | InMemoryDriveAdapter (for tests)   │
└────────────────────────────────────────────────────────────────────┘
```

This pattern allows:
- Domain logic to be tested with mock adapters (no actual Gmail or Drive calls in tests).
- Adapters to be swapped (e.g., replace GmailAdapter with SendGridAdapter) without touching domain logic.
- Shadow mode operation (swap concrete adapter for a no-op shadow adapter).

### Queue Architecture

All operations with external side effects (email sends, CND queries, Drive writes) must be executed as BullMQ background jobs, not inline in request handlers:

```
HTTP Request / Trigger
       │
       ▼
Application Layer (validates request, creates domain records)
       │
       ▼
BullMQ Queue (enqueues job with payload)
       │
       ▼
BullMQ Worker (executes in background with retry logic)
       │
       ▼
Adapter → External Service
       │
       ▼
Result written to PostgreSQL + AuditEvent created
```

This eliminates the 6-minute GAS timeout as a constraint and provides retry, backoff, and dead-letter capabilities for all external operations.

### Audit Trail

All state transitions and system actions are recorded in the `audit_events` table as immutable, append-only records. Audit events are written within the same database transaction as the state change they record. If the audit write fails, the transaction rolls back and the state change does not occur.

### Data Storage

PostgreSQL is the sole persistent data store for the new platform. Google Sheets is accessed in read-only mode during migration phases and eventually deprecated as a data store (it may be maintained as a read-only reporting view for operator familiarity).

---

## Consequences

### Positive Consequences

**Testability**: Domain logic is fully testable with Vitest. Mock adapters replace external services in tests. The team can achieve high test coverage before any code touches production. Regressions are caught by CI, not by production incidents.

**Auditability**: Every state transition, email send, CND query, and user action is recorded in the audit log. Compliance questions ("who approved this payment?", "when was this email sent?") are answered by querying the audit table.

**Type safety**: TypeScript strict mode and Prisma's generated types mean that CNPJ-as-number errors, missing field errors, and invalid state transitions are caught at compile time rather than in production.

**Scalable queue infrastructure**: BullMQ supports concurrent workers, priority queues, rate limiting, and dead-letter queues. Large FastQuote batches can be processed concurrently without hitting execution time limits. Failed jobs are retried automatically with configurable backoff.

**No Google Workspace runtime dependency for domain logic**: Domain logic runs in a standard Node.js process. The 6-minute execution limit, GAS quota system, and Google runtime constraints are completely eliminated.

**Identity independence**: The new platform runs as a service with its own service account credentials, not as a personal user account. The `daniel.valin@thanks.ag` dependency is eliminated.

**Environment separation**: Development, staging, and production environments are fully separated at the infrastructure level.

### Negative Consequences and Risks

**Migration complexity**: Running two systems in parallel (the current GAS system and the new Node.js platform) during migration requires careful coordination to prevent duplicate actions (duplicate emails, duplicate CND queries). The migration strategy's shadow mode and idempotency key design address this, but the overlap period adds operational complexity.

**Parallel systems period**: Operators must work with two systems simultaneously during the migration phases. This requires training and creates a support burden. The migration UI strategy (Phase 4 Assisted Operations) is designed to minimize disruption.

**Team learning curve**: The team must learn TypeScript, Prisma, BullMQ, and the adapter pattern. This is a one-time investment that pays dividends in long-term maintainability. TypeScript proficiency is already present in the organization.

**Infrastructure operation**: The new platform requires a hosted Node.js runtime, PostgreSQL instance, and Redis instance. This is a more complex infrastructure footprint than GAS (which has zero infrastructure to manage). Managed hosting (e.g., Railway, Render, or GCP Cloud Run) can reduce this burden.

**Legacy data migration**: All supplier data, job data, and compliance history must be migrated from Google Sheets to PostgreSQL. Migration scripts must handle the known data quality issues (CNPJ as number, duplicate records, missing contacts).

---

## Alternatives Considered

### Alternative 1: Keep GAS but Add Tests (Rejected)

**Approach**: Invest in a GAS testing harness using clasp + jest + GAS mock libraries to achieve test coverage of the existing codebase.

**Why rejected**:
- GAS mock libraries are incomplete and poorly maintained.
- The fundamental architectural problems (personal account dependency, execution limits, no queue, no audit trail, no transactions) are not addressed by adding tests.
- The test infrastructure complexity for GAS rivals building a new system.
- The 6-minute execution limit remains a hard constraint regardless of test coverage.
- Personal account dependency remains unresolved.

### Alternative 2: Python Backend (Rejected in favor of TypeScript)

**Approach**: Build the new backend in Python, which has excellent Google API libraries and is widely used for automation.

**Why rejected**:
- Team familiarity and preference is TypeScript/JavaScript.
- The Dashboard/UI frontend is already JavaScript-based.
- A TypeScript full-stack reduces context-switching between languages.
- Python is a viable alternative but offers no specific advantage here over TypeScript.

### Alternative 3: Direct Database Access Without ORM (Rejected)

**Approach**: Use PostgreSQL directly with `pg` driver and raw SQL, without an ORM layer.

**Why rejected**:
- Prisma's generated types directly address the type-safety gap between the database schema and TypeScript code.
- Prisma migrations are superior to hand-managed SQL migration files for this use case.
- Raw SQL would require handwriting all CNPJ-as-string validation, which Prisma handles at the schema level.
- ORM adoption for this migration phase is justified by the speed-of-development and type-safety benefits. Raw SQL can always be used for specific performance-critical queries via Prisma's `$queryRaw`.

### Alternative 4: Serverless Functions Only (Rejected for core backend)

**Approach**: Implement the new platform entirely as serverless functions (GCP Cloud Functions, AWS Lambda, or Vercel).

**Why rejected**:
- BullMQ requires a persistent Redis connection and a long-running worker process; this is incompatible with purely serverless architecture.
- Cold starts add latency to time-sensitive operations like email dispatch.
- A hybrid approach (serverless for HTTP, containerized workers for queue processing) adds complexity without proportionate benefit.
- A single, containerized Node.js application is simpler to operate and debug.

---

## Stack Rationale Summary

| Technology | Why This Specific Choice |
|-----------|--------------------------|
| TypeScript | Compile-time type safety catches domain errors; string vs. number CNPJ bugs are impossible with proper typing; team preference |
| Node.js | Mature Google API libraries (`googleapis`); same language as frontend; no context switching; large ecosystem |
| PostgreSQL | ACID guarantees essential for audit log immutability and idempotency key reliability; JSON columns for flexible payload storage; row-level security for multi-user access control |
| Prisma | Generated TypeScript types from schema; migration management; readable schema DSL; prevents ORM-level type drift |
| BullMQ | Proven in Node.js ecosystem for high-reliability job queuing; retry/backoff/dead-letter built-in; Redis backend adds horizontal scaling; active maintenance |
| Vitest | Fastest TypeScript-native test runner available; compatible with ESM; excellent mock/spy capabilities; compatible with the adapter pattern |
| Adapter pattern | Makes domain logic testable without Google/Anthropic/Infosimples dependencies; enables shadow mode; enables system-level swap without domain changes |

---

## Review and Amendment

This ADR is subject to review if:
- A major security issue is discovered with a chosen technology.
- A chosen technology is deprecated or enters long-term maintenance mode.
- A new technology emerges that fundamentally changes the tradeoff analysis.
- The team composition changes significantly (e.g., Python becomes the team's dominant language).

Amendments to this ADR require a new ADR that references and supersedes this one. This ADR document must not be retroactively edited after acceptance.
