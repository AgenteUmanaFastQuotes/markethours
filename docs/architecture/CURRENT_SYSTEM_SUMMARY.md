# Current System Summary — Umana Operations Platform

## Overview

Umana is the event production arm of Grupo Thanks, a Brazilian corporate event production and entertainment group. Umana specializes in full-service production of large-scale corporate events: national sales conventions, award dinners, product launches, executive summits, training programs, team-building activations, and experiential brand events. Clients include major Brazilian and multinational corporations requiring end-to-end event management with high production standards and rigorous financial accountability.

The company operates with a lean production team where operational tooling must multiply staff capacity rather than consume it. Over several years, Umana's operations team built a suite of interconnected Google Workspace tools — primarily Google Sheets, Google Apps Script (GAS), and Google Drive — that together handle the complete event job lifecycle: from initial briefing intake, supplier quote solicitation (FastQuotes), compliance verification via Infosimples (CNDs/CNPJ), through to billing coordination and document archival. This system is mission-critical, running daily for active jobs, and now carries significant architectural debt that creates fragility, creates personal-account dependencies, and blocks scaling or auditing capabilities.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        UMANA OPERATIONS PLATFORM (CURRENT)                      │
│                              Google Workspace / GAS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐    JOB       ┌──────────────────────────────────┐
  │  REDUX/PROJETOS  │─────────────▶│      AgenteUmanaFastQuotes       │
  │  (Google Sheets) │   intake     │  (Apps Script Library / Web App) │
  │                  │              │                                  │
  │  • Form intake   │              │  • FastQuote generation (AI)     │
  │  • Job catalog   │              │  • Email dispatch to suppliers   │
  │  • JOB_ID source │              │  • Gmail reply monitoring        │
  │  • PROJETOS tab  │              │  • Proposal extraction (AI)      │
  │  • Drive links   │              │  • Status state machine          │
  └──────────────────┘              │  • Compliance triggers           │
                                    │  • Billing coordination          │
  ┌──────────────────┐              └──────────┬───────────────────────┘
  │    BaseDados     │◀────────────────────────┤
  │  (Google Sheets) │   read/write            │ bidirectional read/write
  │                  │                         ▼
  │  • FORNECEDORES  │              ┌──────────────────────────────────┐
  │    _MASTER       │              │    Dashboard FastQuotes Ops      │
  │  • FORNECEDOR    │              │  (GAS Web App — operational UI)  │
  │    _CONTATOS     │              │                                  │
  │  • Compliance    │              │  • Batch management              │
  │    status cache  │              │  • Email preview & approval      │
  └──────────────────┘              │  • Status monitoring             │
          │                         │  • Manual overrides              │
          │ CND/CNPJ data           └──────────────────────────────────┘
          ▼
  ┌──────────────────┐              ┌──────────────────────────────────┐
  │ DashboardCompl-  │              │         EXTERNAL SERVICES        │
  │   iance          │              │                                  │
  │  (GAS Web App)   │   ┌──────────┤  Gmail  │ Drive │ Claude  │Info │
  │                  │   │          │ (email) │ (docs)│  API    │simpl│
  │  • CND status    │   │          │         │       │ (Anthr.)│ es  │
  │  • Revalidation  │   │          └─────────────────────────────────┘
  │    campaigns     │   │
  │  • Infosimples   │   │
  │    results       │   │
  └──────────────────┘   │
                         │
  ┌──────────────────────▼──────────────────────────────────────────────┐
  │                    CONFIGURATION LAYER                              │
  │  PropertiesService (GAS ScriptProperties / UserProperties)          │
  │  API keys | Spreadsheet IDs | Folder IDs | Feature flags | Tokens   │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component | Type | Technology | Owner | Critical Functions | Risks |
|-----------|------|------------|-------|--------------------|-------|
| **REDUX/PROJETOS** | Source of truth / data store | Google Sheets (multi-tab workbook with Google Forms integration) | Umana production team (de facto: daniel.valin@thanks.ag) | Job intake via form submission, JOB_ID assignment, project metadata catalog, links to MasterInterna and Drive folders, trigger point for FastQuotes workflow, PROJETOS tab as job registry | Single spreadsheet is sole data store; no schema enforcement; manual data entry errors propagate downstream; concurrent edits cause silent corruption; anyone with edit access can corrupt intake data |
| **AgenteUmanaFastQuotes** | Core orchestration library | Google Apps Script Library (.gs files, ES5-compatible) deployed as script attached to BaseDados or standalone | daniel.valin@thanks.ag | FastQuote email generation via Claude API, Gmail outbound send, Gmail inbound monitoring, quote response parsing and extraction, status state machine management, Drive folder handling, PropertiesService reads, compliance triggers, billing coordination | No automated tests; 6-minute GAS execution wall-clock limit truncates large batches; executes as daniel.valin@thanks.ag; API key in PropertiesService; hardcoded spreadsheet IDs; trigger failures are silent; no idempotency guarantees |
| **Dashboard FastQuotes Ops** | Operational web UI | GAS Web App (HTML/vanilla JS/CSS served via doGet()) | daniel.valin@thanks.ag | Operator interface for triggering FastQuote batches, reviewing AI-generated email previews before send, monitoring per-line status, approving or cancelling sends, viewing batch progress | Deployed under personal account (Execute as: Me); re-deployment requires account access; no staging environment; session state is ephemeral; all UI actions run with daniel.valin@thanks.ag permissions |
| **MasterInterna** | Project planning template | Google Sheets template (manually copied per project) | Umana production team | Internal project timeline, task assignment, budget line tracking, milestone status, team roster per project | Manual copy process leads to template drift; no programmatic sync with PROJETOS; links between PROJETOS and MasterInterna are fragile free-text URLs; no version control on template |
| **BaseDados** | Supplier master data store | Google Sheets (multi-tab workbook) | daniel.valin@thanks.ag | FORNECEDORES_MASTER tab (CNPJ, company name, category, compliance status), FORNECEDOR_CONTATOS tab (contact emails, names, preferential FastQuotes flag), CND consultation history, revalidation campaign data | CNPJ stored as text required but Sheets auto-converts to number (losing leading zeros); no referential integrity between suppliers and contacts; duplicate records; stale contact data; owned by personal account so others have reduced access |
| **DashboardCompliance** | Compliance management web UI | GAS Web App (HTML/vanilla JS/CSS) | daniel.valin@thanks.ag | CND consultation status display per supplier, revalidation campaign creation and dispatch, Infosimples API query orchestration, compliance response processing and status updates | Same deployment and execution account risks as FastQuotes dashboard; compliance data lives in same fragile BaseDados spreadsheet; no automated refresh — operators must trigger manually |
| **Gmail** | Email transport (bidirectional) | Gmail API via GAS GmailApp + UrlFetchApp | daniel.valin@thanks.ag (sending identity) | Outbound FastQuote emails to suppliers (with AI-generated bodies), inbound supplier reply monitoring, email thread tracking via Message-ID, attachment extraction, marking threads read after processing | All email sent from personal account; daily send limits on personal/Workspace Gmail; if account suspended all outbound email stops; reply monitoring depends on exact label and thread structure; marking read tied to processing success (fragile — partial processing leaves emails unread or incorrectly marked) |
| **Drive** | Document storage | Google Drive API via GAS DriveApp | daniel.valin@thanks.ag | Job folder hierarchy creation and management, proposal PDF/attachment storage from suppliers, NF/ND/fatura document archival, FICHA CADASTRAL storage, MasterInterna copy storage | Folder IDs hardcoded in PropertiesService; folder structure depends on naming conventions enforced only by convention not code; ownership tied to personal account; no automated archival or expiry |
| **PropertiesService** | Configuration and secrets store | GAS ScriptProperties + UserProperties | daniel.valin@thanks.ag (script owner) | Anthropic API key storage, spreadsheet IDs, Drive folder IDs, script execution flags, idempotency state flags, email template strings | Secrets bound to script owner's GAS project; no rotation mechanism; no audit trail for property changes; readable by anyone with script editor access; completely lost if script is recreated rather than transferred |
| **Infosimples API** | External CND/CNPJ data provider | REST API (third-party Brazilian data broker) | Umana (billing account linked through daniel.valin) | Federal CND (Receita Federal), INSS CND, FGTS CND, Labor CND (Trabalhista) queries by CNPJ, certificate data retrieval, debt status code interpretation | API credits consumed per query; rate limits not managed; code 611 (sem emissão de certidão online) is NOT a debt accusation and must not be treated as irregular — logic correctness is critical; external dependency with no fallback |
| **Claude API (Anthropic)** | AI generation service | Anthropic Claude API via HTTP (UrlFetchApp) | Personal Anthropic account linked to daniel.valin | FastQuote email body generation, supplier proposal content extraction from PDF attachments/text, briefing summarization, prompt construction for email campaigns | API key stored in ScriptProperties; cost per call not tracked per job or per campaign; model version not pinned (prompt behavior may drift across model updates); no fallback if API unavailable; token usage unmonitored |

---

## Known Architectural Risks

### 1. Single Spreadsheet as Operational Database

Google Sheets was designed for collaborative human data entry, not as an application database. The current system uses REDUX/PROJETOS and BaseDados as its sole persistent data stores with no schema enforcement, no foreign key relationships, no transactions, and no query planner. Concurrent edits from multiple users — or from GAS triggers running simultaneously — can produce silent data corruption with no error surfaced.

Specific failure modes:
- CNPJ values stored without explicit text formatting are silently converted to numbers by Sheets, losing leading zeros. `08123456000195` becomes `8123456000195`, breaking all downstream CNPJ lookups and CND queries.
- Row deletions leave dangling references in other sheets with no integrity check.
- Column insertions break hardcoded column-index reads throughout the Apps Script codebase (e.g., `row[4]` reads wrong data after a column is inserted before column E).
- No backup or restore mechanism beyond Drive's native version history, which caps at 200 versions for large files and does not support point-in-time recovery.

### 2. Personal Account Ownership

The entire operational system executes with the identity of `daniel.valin@thanks.ag`. This single identity owns: Apps Script trigger installation, Web App deployment, Drive folder ownership, API credential storage, and Gmail sending. If this account is suspended, its license removed, the individual leaves the organization, or the account is locked for any reason, the entire Umana production operation halts immediately with no automated failover.

### 3. No Automated Tests

The AgenteUmanaFastQuotes library contains the core business logic of the platform with zero automated test coverage. Every change is validated manually, and regressions are discovered in production. The GAS runtime makes unit testing nearly impossible without significant tooling investment (clasp + jest + mock injection). Business-critical logic such as the InfoSimples code 611 interpretation, email deduplication guards, and FastQuote protected-status checks have no test coverage.

### 4. Fragile Time-Based Triggers

Several critical workflows run on GAS time-based triggers: Gmail reply monitoring, CND revalidation checks, billing status polling. These triggers fail silently — errors are emailed to the script owner (potentially unmonitored), there is no health-check endpoint, they cannot be monitored externally, and they can be accidentally deleted by any project editor. Trigger configuration is not version-controlled and exists only in the GAS project dashboard.

### 5. Hardcoded IDs Throughout

Spreadsheet IDs, Drive folder IDs, tab names, column indices, and named ranges are hardcoded in multiple locations across the Apps Script codebase and in PropertiesService. A single structural change (tab rename, column insertion, spreadsheet recreation) can break multiple unrelated workflows silently with no error surfaced until the next run.

### 6. No Audit Trail

No record is kept of who triggered which action, when, with what inputs, and with what outcome. When a supplier receives an incorrect FastQuote email, or a compliance status is overwritten, or a billing line is processed, there is no immutable log to diagnose cause, assign responsibility, or reconstruct history. This creates compliance risk, operational risk, and debugging difficulty.

### 7. Mixed Execution Accounts

Some scripts execute as the deploying user (daniel.valin@thanks.ag), some as the accessing user, depending on Web App deployment configuration. This inconsistency creates unpredictable Gmail thread ownership, Drive file ownership, and API usage attribution across different entry points.

### 8. No Idempotency

Email dispatch, CND checks, and billing triggers have no systematic idempotency mechanism. A trigger that runs twice due to a timeout-then-retry scenario will send duplicate emails, create duplicate CND consultations, or generate duplicate billing entries. Partial guard conditions exist in some functions but are not transactional and can be left in inconsistent states by GAS execution timeouts.

### 9. GAS 6-Minute Execution Wall

All GAS script executions are subject to a 6-minute hard wall-clock timeout. Large FastQuote batches (20+ suppliers), bulk CND consultations, and multi-step billing workflows routinely exceed this limit. Partial execution leaves the system in an inconsistent state — some records updated, some not — with no automated detection or remediation of the partial run.

### 10. No Environment Separation

There is no development, staging, or sandbox environment. All development and testing is performed against the production spreadsheet with live supplier data. Any code change or experiment carries direct risk to live operational data and running supplier communications.

---

## Current Execution Identity Risk Detail

| Dependency Type | Current Account | Failure Mode if Unavailable | Priority to Migrate | Target Account |
|-----------------|-----------------|----------------------------|--------------------|-|
| Apps Script trigger ownership | daniel.valin@thanks.ag | All scheduled workflows stop (monitoring, CND, billing polling) | CRITICAL | preproducao@umana.ag |
| Web App deployment owner | daniel.valin@thanks.ag | Dashboard FastQuotes Ops inaccessible | CRITICAL | preproducao@umana.ag |
| Gmail sending identity | daniel.valin@thanks.ag | No outbound FastQuote or compliance emails | CRITICAL | preproducao@umana.ag |
| Drive folder ownership | daniel.valin@thanks.ag | Proposals and documents cannot be written | HIGH | preproducao@umana.ag |
| Anthropic API credentials | Personal account / thanks.ag | No AI-powered generation or extraction | HIGH | umana.ag org account |
| Infosimples API key | Stored in daniel.valin's ScriptProperties | No CNPJ or CND lookups | HIGH | preproducao@umana.ag |
| BaseDados spreadsheet owner | daniel.valin@thanks.ag | Others lose write access to supplier master | HIGH | preproducao@umana.ag |
| REDUX/PROJETOS edit access | daniel.valin@thanks.ag | Job intake and status updates broken | HIGH | preproducao@umana.ag |
| PropertiesService config owner | daniel.valin@thanks.ag | All configuration inaccessible or overwritten | CRITICAL | preproducao@umana.ag |

**Governing rule**: The system must be fully operable if `daniel.valin@thanks.ag` is unavailable for any reason. Any component that fails this test is a critical risk item that must be resolved before that component is considered production-stable.
