# Umana Operations Platform — Migration Strategy

## Document Purpose

This document defines the complete strategy for migrating the Umana Operations Platform from its current Google Apps Script / Google Sheets architecture to the next-generation TypeScript/Node.js platform. The migration is designed to be incremental, risk-managed, and reversible at each phase. Operational continuity during migration is a non-negotiable constraint.

**Migration system owner**: preproducao@umana.ag  
**Technical lead**: TBD  
**Target migration completion**: Rolling; no hard deadline, governed by phase go/no-go criteria  
**Last updated**: 2026-06-13

---

## Guiding Principles

1. **Never break production.** The current system must remain fully operational at all times during migration. No phase may disable or degrade existing functionality before the replacement is confirmed working.

2. **Incremental and reversible.** Each phase has a defined rollback plan. A failed phase must be reversible without data loss.

3. **Shadow before switch.** New code runs in read-only or shadow mode (no external side effects) before it is trusted with production actions.

4. **Identity before functionality.** Phase 0 (identity and ownership correction) must be completed before any other phase that depends on preproducao@umana.ag as an operational identity.

5. **Test coverage gates entry.** No phase beyond Phase 3 may begin without test coverage for the domain logic being replaced.

6. **Audit from day one.** The audit trail is implemented before any write operations are delegated to the new system.

---

## Phase 0: Identity and Ownership Correction

**Goal**: Eliminate `daniel.valin@thanks.ag` as a production operational dependency. Establish `preproducao@umana.ag` as the master operational identity for all system components.

**This phase is a prerequisite for all subsequent phases.**

### Current Ownership Inventory

| Component | Current Owner | Dependency Type | Impact if Unavailable |
|-----------|--------------|----------------|----------------------|
| AgenteUmanaFastQuotes (GAS) | daniel.valin@thanks.ag | Script owner / trigger installer | All automation stops |
| Dashboard FastQuotes Ops (Web App) | daniel.valin@thanks.ag | Web App deployment owner | Dashboard inaccessible |
| DashboardCompliance (Web App) | daniel.valin@thanks.ag | Web App deployment owner | Compliance UI inaccessible |
| Gmail sending | daniel.valin@thanks.ag | OAuth identity for GmailApp | No outbound FastQuote emails |
| BaseDados spreadsheet | daniel.valin@thanks.ag | Spreadsheet owner | Others lose write access |
| REDUX/PROJETOS spreadsheet | Umana team / daniel.valin@thanks.ag | Editor / form linked | Job intake may break |
| Drive folder hierarchy | daniel.valin@thanks.ag | Folder owner | Cannot write proposals/docs |
| PropertiesService | daniel.valin@thanks.ag | Script property store owner | Config unreadable by new script |
| Anthropic API key | Personal account linked to daniel.valin | API billing / credential | No AI features |
| Infosimples API key | Account associated with daniel.valin | API credential | No CND queries |

### Target State

All components above must be transferred to or recreated under `preproducao@umana.ag`:

- GAS scripts re-owned or re-created under preproducao@umana.ag with all properties migrated.
- Web Apps redeployed under preproducao@umana.ag.
- BaseDados and REDUX/PROJETOS ownership transferred to preproducao@umana.ag (or a Google Group).
- Drive folder hierarchy ownership transferred to preproducao@umana.ag.
- Anthropic API account created under umana.ag organization billing; API key replaced.
- Infosimples account confirmed under umana.ag organization billing; key migrated.

### Phase 0 Steps

1. Create and verify `preproducao@umana.ag` as a licensed Google Workspace user.
2. Add `preproducao@umana.ag` as Owner of BaseDados and REDUX/PROJETOS spreadsheets.
3. Add `preproducao@umana.ag` as Owner of all Drive folders in the job hierarchy.
4. Transfer or recreate GAS scripts under `preproducao@umana.ag`. Migrate all ScriptProperties.
5. Redeploy Dashboard FastQuotes Ops and DashboardCompliance under `preproducao@umana.ag`.
6. Reinstall all time-based triggers under `preproducao@umana.ag`.
7. Register new Anthropic API key under umana.ag organization account; update PropertiesService.
8. Confirm Infosimples account under umana.ag organization; update PropertiesService.
9. Remove `daniel.valin@thanks.ag` as required for any operational step.
10. Document verification: perform a complete test of all workflows using only `preproducao@umana.ag`.

### Phase 0 Rollback

Phase 0 rollback is not applicable in the traditional sense — this phase does not change application behavior, only ownership. If a step fails, revert that specific transfer and retry. The system remains operational throughout.

### Phase 0 Go/No-Go Criteria

- [ ] All time-based triggers installed and firing under preproducao@umana.ag
- [ ] Dashboard FastQuotes Ops accessible and functional under new deployment
- [ ] DashboardCompliance accessible and functional under new deployment
- [ ] A test FastQuote email can be sent from preproducao@umana.ag Gmail identity
- [ ] BaseDados and REDUX/PROJETOS accessible with full read/write under preproducao@umana.ag
- [ ] All API keys updated and functional in the redeployed scripts
- [ ] daniel.valin@thanks.ag access can be revoked without breaking any workflow (tested in staging if possible)

---

## Phase 1: Documentation and Domain Model

**Goal**: Create complete documentation of the current system, domain model, state machines, and architectural direction. Establish the shared vocabulary and contracts that all subsequent phases will build on.

**Status**: In progress (this document is part of Phase 1 deliverables).

### Phase 1 Deliverables

- `/docs/architecture/CURRENT_SYSTEM_SUMMARY.md` — current system architecture and risks
- `/docs/domain/GLOSSARY.md` — all domain terms defined
- `/docs/domain/DOMAIN_MODEL.md` — complete entity model with invariants
- `/docs/state-machines/FASTQUOTES_STATE_MACHINE.md` — all state machine specifications
- `/docs/migration/MIGRATION_STRATEGY.md` — this document
- `/docs/adr/ADR-0001-ARCHITECTURE-DIRECTION.md` — architecture decision record
- `/docs/governance/IDENTITY_AND_OWNERSHIP.md` — identity governance document

### Phase 1 Go/No-Go Criteria

- [ ] All documentation files created and reviewed by at least one domain expert
- [ ] Domain model reviewed and invariants validated against current system behavior
- [ ] State machines reviewed and confirmed to match actual current system states
- [ ] ADR accepted and signed off by technical lead

---

## Phase 2: Read-Only Adapters (Shadow Reads)

**Goal**: Build adapter interfaces for all external systems (Sheets, Gmail, Drive, Infosimples, Claude API) with implementations that read from the current systems. No writes occur. Validate that the new code can read and parse all real data correctly.

### Deliverables

- `src/adapters/` directory with adapter interfaces for each integration
- `src/adapters/sheets/` — Google Sheets read adapter for REDUX, BaseDados
- `src/adapters/gmail/` — Gmail monitoring read adapter
- `src/adapters/drive/` — Drive folder structure reader
- `src/adapters/infosimples/` — Infosimples API client (read-only mode)
- `src/adapters/claude/` — Claude API client
- Full Vitest test coverage for all adapter parsing logic using recorded fixture data
- Data validation scripts that run adapters against production data and report discrepancies

### Read-Only Constraint

All adapters in Phase 2 must be wired to a `DRY_RUN = true` flag that prevents any write operations. Any code path that would write must log the intended write and return a success-simulated response.

### Phase 2 Go/No-Go Criteria

- [ ] All adapters implemented with test coverage >= 80%
- [ ] Read adapter for BaseDados successfully parses all supplier records without error
- [ ] Read adapter for REDUX correctly reads all active job records
- [ ] Gmail monitoring adapter correctly identifies and parses inbound supplier replies on test data
- [ ] Infosimples adapter correctly interprets all response codes including 611
- [ ] No write operations occur during Phase 2 (verified by adapter-level write guards)

---

## Phase 3: Shadow Mode (Parallel Processing Without Side Effects)

**Goal**: Run the new platform's domain logic in parallel with the existing system. The new code processes real inputs and produces real outputs internally, but does NOT write to any external system. Compare outputs against what the legacy system produces.

### Shadow Mode Design

In shadow mode, every operation the new platform would perform is:
1. Executed in full through the domain logic
2. Written to the new platform's own database (PostgreSQL)
3. The corresponding external action (email send, Sheets write, Drive write) is replaced with a log entry
4. Results are compared against the legacy system's actual actions

This allows validation that:
- Domain logic produces the same decisions as the legacy system
- State machines handle the same inputs with the same outputs
- Email generation via Claude API produces comparable quality output
- CND interpretation matches legacy behavior

### Divergence Tracking

Any divergence between shadow-mode output and legacy system output must be logged as a `ShadowDivergenceEvent` with full context. Divergences are reviewed in daily standups during this phase.

### Phase 3 Go/No-Go Criteria

- [ ] Shadow mode running for minimum 10 business days
- [ ] Zero divergences in CND code interpretation (especially code 611)
- [ ] FastQuote email generation quality rated acceptable by operators on >= 90% of shadow runs
- [ ] No data written to external systems during shadow mode (verified by write guard audit log)
- [ ] New platform database contains accurate mirror of all production entities

---

## Phase 4: Assisted Operations (Previews and Diagnostics)

**Goal**: The new platform begins producing operator-facing outputs: email previews, diagnostic reports, compliance status summaries. Operators can see and use these outputs but all actual writes still happen in the legacy system.

### Assisted Operations Features

- FastQuote email preview in new Dashboard (replaces/supplements GAS Web App preview)
- Compliance status report generation from new platform data
- Billing diagnostic reports surfacing data quality issues
- Job status dashboard showing consolidated view

### Validation

Operators actively use the new platform's previews and reports alongside the legacy system. Any discrepancy between what the new platform shows and what the legacy system shows must be investigated and resolved before Phase 5.

### Phase 4 Go/No-Go Criteria

- [ ] New Dashboard deployed to preproducao@umana.ag environment
- [ ] Operators using new Dashboard previews daily for minimum 5 business days
- [ ] Zero critical discrepancies between new and legacy compliance status displays
- [ ] Operator satisfaction with preview quality confirmed by team lead

---

## Phase 5: Controlled Writeback (Test Sheets First)

**Goal**: The new platform begins writing to external systems, but to test/staging copies of the sheets, not the production sheets. Gmail sends are still blocked. Drive writes go to a test folder.

### Controlled Writeback Scope

- Write FastQuote status updates to a test copy of BaseDados
- Write supplier compliance status updates to a test copy of BaseDados
- Write to a test Drive folder instead of production folders
- Gmail sends remain blocked (DRYRUN flag for email remains on)

### Validation

Operators review all test sheet writes and confirm they match what the legacy system would have written. Any discrepancy is a blocker for Phase 6.

### Phase 5 Go/No-Go Criteria

- [ ] Test spreadsheet writes produce correct data for all entity types
- [ ] CNPJ values preserved as strings with leading zeros in all writes (critical invariant)
- [ ] Test Drive folder structure matches production folder structure exactly
- [ ] Zero data corruption events in test writes over minimum 5 business days
- [ ] Rollback from test writes confirmed feasible (test sheets can be reverted)

---

## Phase 6: Replace Selected Workflows

**Goal**: Migrate specific workflows from legacy to new platform, one at a time, ordered by risk from lowest to highest.

### Migration Order (Low Risk → High Risk)

Each sub-phase targets one workflow. Only one sub-phase may be active at a time. Each sub-phase runs for minimum 5 business days before go/no-go for the next.

#### 6.1: FastQuotes Generation (AI email generation only)

- New platform generates FastQuote emails via Claude API
- Results displayed in new Dashboard for approval
- Legacy system still handles all dispatching
- Risk: LOW (no external writes; operators can reject and fall back to legacy generation)

#### 6.2: Email Preview and Approval UI

- New Dashboard becomes the primary preview/approval UI
- Legacy Web App remains available as fallback
- Risk: LOW (no change to actual send behavior)

#### 6.3: FastQuotes Email Sending

- New platform dispatches approved FastQuote emails via Gmail API
- Legacy system still monitors for replies
- Each send must still use idempotency keys to prevent duplicates
- Risk: MEDIUM (external side effects on email; potential for duplicate sends if not carefully coordinated)

#### 6.4: FastQuotes Reply Monitoring

- New platform monitors Gmail for supplier replies
- Legacy system's monitoring trigger disabled AFTER new monitoring confirmed working
- Risk: MEDIUM (if monitoring misses a reply, operator action is delayed)

#### 6.5: Compliance (CND Queries and Revalidation)

- New platform executes Infosimples CND queries and manages revalidation campaigns
- Legacy DashboardCompliance remains accessible as read-only fallback
- Risk: MEDIUM-HIGH (compliance status affects payment decisions; errors have financial consequences)

#### 6.6: Billing Workflow

- New platform manages billing line lifecycle, NF tracking, and retention calculations
- Legacy billing tooling remains accessible as fallback
- Risk: HIGH (financial data; errors can cause incorrect payments or missed retentions)

### Phase 6 Go/No-Go Criteria Per Sub-Phase

- [ ] Previous sub-phase running cleanly for >= 5 business days
- [ ] Zero data corruption events in new platform writes
- [ ] Legacy fallback confirmed working
- [ ] Operations team sign-off on replacement quality

---

## Phase 7: Retire Legacy Pieces

**Goal**: Decommission legacy GAS components as each corresponding new platform workflow is confirmed stable.

### Retirement Order

1. Retire AgenteUmanaFastQuotes library GAS functions replaced in Phase 6
2. Retire Dashboard FastQuotes Ops GAS Web App (after Phase 6.4 confirmed)
3. Retire DashboardCompliance GAS Web App (after Phase 6.5 confirmed)
4. Retire remaining GAS triggers
5. Convert BaseDados from Google Sheets to PostgreSQL as sole source of truth
6. Convert REDUX/PROJETOS from Google Sheets to PostgreSQL (maintain read-only Sheets view for operator familiarity)
7. Archive legacy GAS scripts (do not delete; archive for reference)

### Retirement is NOT a hard cutover

Legacy components are moved to "archived but accessible" state, not deleted. They may be reactivated if a critical regression is discovered in the new system. Full retirement (deletion) occurs only after 90 days of stable operation without any legacy fallback events.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google account dependency not resolved before Phase 3 | Medium | Critical — entire migration blocked | Phase 0 is mandatory prerequisite; no Phase 2+ work begins until Phase 0 complete |
| CNPJ numeric conversion corrupts supplier data during migration | High | High — all CND queries and supplier lookups break | Explicit data validation scripts before any migration; test with all 14-digit CNPJs; enforce string type at ORM level |
| Infosimples code 611 mis-mapped in new platform | Low | Critical — suppliers incorrectly blocked from payment | Dedicated unit tests for code 611; integration test with real API response fixtures; separate flag in CndStatus enum |
| Duplicate FastQuote emails sent during Phase 6.3 transition | Medium | High — supplier relationship damage, inbox spam | Idempotency keys required; send coordination protocol between legacy and new; at most one system dispatching at any time |
| Gmail monitoring gap during Phase 6.4 handoff | Medium | Medium — delayed response processing | Overlap period: both legacy and new monitoring run simultaneously; deduplication by gmailMessageId |
| Data model divergence discovered mid-migration | Medium | Medium — requires documentation and code updates | Shadow mode comparison catches divergences before writes begin |
| Operator resistance to new Dashboard | Medium | Medium — parallel systems required longer than planned | Involve operators in UX review from Phase 4 onward; minimize retraining required |
| GAS script trigger failure during overlap period | Medium | Medium — legacy monitoring stops | Phase 0 ensures triggers installed under stable account; new monitoring overlaps before legacy is retired |
| Claude API model change affects email quality | Low | Low-Medium — email content quality degrades | Pin model version in AIGenerationRun; review AI output quality before each Phase 6 sub-phase |
| PostgreSQL migration data loss | Low | Critical | Full backup before each write migration step; row-count validation post-migration; test on copy before production |

---

## Rollback Strategy Per Phase

| Phase | Rollback Mechanism | Rollback Time | Data Loss Risk |
|-------|--------------------|---------------|----------------|
| Phase 0 | Revert ownership transfers; re-install triggers under original account | Hours | None |
| Phase 1 | Delete documentation files (no system impact) | Minutes | None |
| Phase 2 | Disable read adapters; no impact on production | Minutes | None |
| Phase 3 | Disable shadow mode flag; new platform stops processing | Minutes | Shadow data only (non-production) |
| Phase 4 | Disable new Dashboard; operators return to legacy Web App | Minutes | None |
| Phase 5 | Discard test sheet writes; reconnect to production sheets | Minutes | Test data only |
| Phase 6.1 | Disable new AI generation; legacy generation re-enabled | Minutes | None |
| Phase 6.2 | Revert to legacy Dashboard | Minutes | None |
| Phase 6.3 | Disable new send path; re-enable legacy send trigger | Minutes | In-flight emails already sent (idempotency prevents duplicates) |
| Phase 6.4 | Re-enable legacy monitoring trigger; disable new monitoring | Minutes | Any replies processed during gap are re-detected when legacy trigger resumes |
| Phase 6.5 | Re-enable legacy CND processes; mark new platform compliance data as unreliable | Hours | CND status in new platform may be stale; resync from legacy |
| Phase 6.6 | Re-enable legacy billing; mark new platform billing data as unreliable | Hours | Billing data requires manual reconciliation |
| Phase 7 | Restore archived GAS scripts from archive | Hours-Days | Depends on how much state was written only to PostgreSQL |

---

## Migration Ownership

| Role | Responsibility | Account |
|------|---------------|---------|
| Migration system owner | All operational decisions, go/no-go sign-off | preproducao@umana.ag |
| Technical lead | Architecture, code review, deployment | TBD |
| Operations lead | Operator training, UI acceptance, business process validation | Umana production team lead |
| Compliance lead | CND logic validation, revalidation campaign sign-off | Umana compliance team |

All migration-related changes to the production environment must be approved by the migration system owner (preproducao@umana.ag) before execution.
