# Current System Summary — Umana Operations Platform

## Overview

Umana is the event production arm of Grupo Thanks, a Brazilian corporate events company. Umana specializes in full-service event production: from initial briefing and supplier quotation through compliance verification, contract management, logistics coordination, and final billing. Clients range from large corporations holding national sales conventions to boutique product launches and executive dinners. The company operates with a lean production team, meaning that operational tooling must multiply staff capacity rather than require dedicated technical operators.

The current operational system was built organically in Google Workspace — primarily Google Apps Script and Google Sheets — and has grown to support the full supplier quotation lifecycle (FastQuotes), internal project planning (MasterInterna), supplier compliance checking (DashboardCompliance), and billing coordination (FastBilling). While the system works today, it carries significant architectural debt that creates fragility, dependency on specific individuals, and barriers to scaling or auditing.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        UMANA OPERATIONS PLATFORM (Current)                      │
└─────────────────────────────────────────────────────────────────────────────────┘

  External Intake                  Core Orchestration               User Interfaces
  ───────────────                  ──────────────────               ───────────────

  ┌─────────────────┐              ┌───────────────────────────┐    ┌──────────────────────────┐
  │  REDUX/PROJETOS │──── JOB ────▶│  AgenteUmanaFastQuotes    │◀──▶│  Dashboard FastQuotes Ops│
  │  (Google Sheets)│   intake     │  (Apps Script Library)    │    │  (Web App / UI)          │
  │                 │              │                           │    └──────────────────────────┘
  │  • Form intake  │              │  • FastQuotes generation  │
  │  • Job mgmt     │              │  • Email dispatch         │    ┌──────────────────────────┐
  │  • PROJETOS tab │              │  • Quote monitoring       │◀──▶│  DashboardCompliance     │
  └─────────────────┘              │  • Proposal extraction    │    │  (Web App / UI)          │
                                   │  • AI orchestration       │    └──────────────────────────┘
  ┌─────────────────┐              │  • Compliance triggers    │
  │   BaseDados     │◀────────────▶│  • Billing coordination   │
  │  (Google Sheets)│              └───────────────────────────┘
  │                 │                          │
  │  • Suppliers    │                          │ integrations
  │  • Contacts     │              ┌───────────┼───────────────┐
  │  • Compliance   │              ▼           ▼               ▼
  └─────────────────┘         ┌────────┐  ┌────────┐  ┌──────────────┐
                               │ Gmail  │  │ Drive  │  │  Claude API  │
                               │        │  │        │  │  (Anthropic) │
                               │ • Send │  │ • Docs │  │              │
                               │ • Read │  │ • PDFs │  │ • Proposal   │
                               │ • Mon. │  │ • Fldrs│  │   extraction │
                               └────────┘  └────────┘  │ • FQ gen.   │
                                                        │ • Briefing  │
                               ┌────────────────────┐  │   parsing   │
                               │    Infosimples     │  └──────────────┘
                               │                    │
                               │  • CNPJ lookup     │
                               │  • CND checks      │
                               │  • Receita Federal │
                               └────────────────────┘

  Configuration Layer
  ───────────────────
  ┌──────────────────────────────────────────────────────────────────┐
  │  PropertiesService  (GAS ScriptProperties / UserProperties)      │
  │  • API keys  • Spreadsheet IDs  • Folder IDs  • Feature flags    │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory

| Component | Type | Technology | Owner | Critical Functions | Risks |
|-----------|------|------------|-------|-------------------|-------|
| **REDUX/PROJETOS** | Data source / intake | Google Sheets (manual + Forms) | Umana production team | Job intake, project catalog, JOB_ID source of truth, links to MasterInterna and Drive folders | Single spreadsheet; manual data entry errors; no schema validation; anyone with edit access can corrupt data |
| **AgenteUmanaFastQuotes** | Library / orchestrator | Google Apps Script (clasp, ES5-compatible) | daniel.valin@thanks.ag | FastQuote email generation, AI prompt construction, email dispatch, Gmail monitoring, quote response parsing, compliance trigger, billing coordination | Runs as daniel.valin@thanks.ag; no unit tests; trigger failures are silent; quota limits on Gmail API; no idempotency; hardcoded spreadsheet IDs in multiple places |
| **Dashboard FastQuotes Ops** | Web App (UI) | Google Apps Script Web App (HTML + vanilla JS served from GAS) | daniel.valin@thanks.ag | Operational UI for FastQuote review, email preview, send/cancel actions, status display, batch management | Deployed as "Execute as: Me" meaning all actions run as daniel.valin@thanks.ag; no access control beyond Share settings; session/state managed in URL params |
| **MasterInterna** | Document template | Google Sheets template (per-project copy) | Umana production team | Project timeline, internal task tracking, budget breakdown per project | Each project gets a manual copy; no programmatic sync; drift between projects; manual linking to PROJETOS |
| **BaseDados** | Master data store | Google Sheets (multi-tab) | daniel.valin@thanks.ag | FORNECEDORES_MASTER (supplier registry), FORNECEDOR_CONTATOS (contact details), compliance history, CND status cache | Single spreadsheet as database; no referential integrity; concurrent edit conflicts; CNPJ can be stored as number (formatting loss); owned by personal account |
| **DashboardCompliance** | Web App (UI) | Google Apps Script Web App | daniel.valin@thanks.ag | Compliance campaign management, CND status display, revalidation dispatch, Infosimples result rendering | Same execution account risk as FastQuotes dashboard; compliance data stored in same fragile spreadsheet |
| **Gmail** | External service | Gmail API (via GAS UrlFetchApp + GmailApp) | daniel.valin@gmail.com / daniel.valin@thanks.ag | Email dispatch to suppliers, monitoring replies, marking threads, extracting attachments | Relies on specific Gmail label structure; read marking tied to processing success (fragile); reply threading depends on correct Message-ID tracking |
| **Drive** | External service | Google Drive API (via GAS DriveApp) | daniel.valin@thanks.ag | Proposal PDF storage, FICHA CADASTRAL storage, contract folder structure, MasterInterna copies | Folder IDs hardcoded in PropertiesService; ownership tied to personal account; no folder structure enforcement |
| **Claude API (Anthropic)** | External AI service | Anthropic Claude API (HTTP via UrlFetchApp) | Anthropic account linked to daniel.valin | Proposal content extraction from PDF attachments, FastQuote email body generation, briefing parsing | API key stored in ScriptProperties; no fallback if API is unavailable; prompt versioning is ad-hoc; token costs unmonitored |
| **Infosimples** | External data service | Infosimples REST API (HTTP via UrlFetchApp) | Infosimples account | CNPJ registry lookup, CND status check from Receita Federal, INSS, FGTS, Trabalhista | API key in ScriptProperties; code 611 (sem CND online) must NOT be treated as debt — logic depends on correct interpretation; rate limits not managed |
| **PropertiesService** | Configuration store | GAS ScriptProperties + UserProperties | daniel.valin@thanks.ag (script owner) | API keys, spreadsheet IDs, folder IDs, feature flags, email templates | No versioning; no audit trail for changes; secrets readable by anyone with script edit access; tightly coupled to deployment identity |

---

## Known Architectural Risks

### 1. Single Spreadsheet as Database

Google Sheets was designed for human use, not as an application database. The current system uses multiple Sheets files as primary data stores with no schema enforcement, no foreign key relationships, no transactions, and no query planner. Concurrent edits from multiple users (or from triggers running simultaneously) can produce silent corruption. The 10 million cell limit is a hard ceiling with no graceful degradation path.

**Specific risks:**
- CNPJ values stored as numbers lose leading zeros (e.g., `08123456000195` becomes `8123456000195`), breaking all downstream lookups.
- Row deletions leave dangling references in other sheets.
- Column insertions break hardcoded column-index reads throughout the Apps Script codebase.
- No backup/restore mechanism beyond Drive's native version history (which caps at 200 versions for large files).

### 2. Personal Account Ownership (`daniel.valin@thanks.ag`)

The entire operational system executes with the identity of `daniel.valin@thanks.ag`. This creates a single point of failure for the entire Umana production operation:

- If the account is suspended, locked, or if the individual leaves the organization, all automated processes stop immediately.
- Apps Script trigger ownership, Web App deployment, Drive folder ownership, API credentials, and Gmail sending all share this single identity.
- The account carries personal liability for all API usage billed through it.
- Org-level Google Workspace policies applied to this account affect all automations.

### 3. No Automated Tests

The AgenteUmanaFastQuotes library contains thousands of lines of business logic with zero automated test coverage. Every change is validated manually, and regressions are discovered in production. The Apps Script runtime makes unit testing nearly impossible without significant tooling investment (clasp + jest + mock injections).

### 4. Fragile Time-Based Triggers

Several critical workflows run on Google Apps Script time-based triggers (e.g., Gmail monitoring every 5 minutes, CND revalidation checks). These triggers:
- Have a combined daily execution quota across the account (6 hours/day for consumer accounts, 6 hours/day for Workspace).
- Do not alert on failure by default (errors go to the script owner's email, which may be unmonitored).
- Cannot be monitored externally (no health check endpoint).
- Can be accidentally deleted by any project editor.
- Are not version-controlled — trigger configuration exists only in the GAS project dashboard.

### 5. Hardcoded IDs Throughout the Codebase

Spreadsheet IDs, folder IDs, named ranges, tab names, and column indices are hardcoded in multiple locations across the Apps Script codebase. A single spreadsheet restructuring (tab rename, column insertion, file copy) can break multiple unrelated workflows silently.

**Known hardcoded dependencies:**
- REDUX/PROJETOS spreadsheet ID
- BaseDados spreadsheet ID
- Drive folder IDs for each category (ORCAMENTOS, CONTRATOS E CARTAS, etc.)
- Gmail label names
- Named ranges in MasterInterna

### 6. No Audit Trail

No record is kept of who triggered which action, when, with what inputs, and with what outcome. When a supplier email is sent incorrectly, or a compliance status is overwritten, there is no log to diagnose the cause. This creates compliance risk (who approved this payment?), operational risk (which batch was sent to which supplier?), and debugging difficulty.

### 7. Mixed Execution Accounts

Some scripts execute as the deploying user (daniel.valin@thanks.ag), some execute as the accessing user (when configured for user-as-executor), and some mix both within the same workflow. This creates inconsistent Gmail thread ownership, Drive file ownership, and API attribution.

### 8. No Idempotency

Email dispatch, CND checks, and billing triggers have no idempotency mechanism. A trigger that runs twice (e.g., due to a timeout-then-retry scenario) will send duplicate emails, create duplicate CND consultations, or generate duplicate billing entries. There are partial guard conditions in some functions, but they are not systematic.

---

## Current Execution Identity Risk Summary

| Dependency Type | Current Account | Risk if Unavailable | Target Account |
|-----------------|-----------------|--------------------|-----------------|
| Apps Script Trigger Ownership | daniel.valin@thanks.ag | All triggers stop | preproducao@umana.ag |
| Web App Deployment Owner | daniel.valin@thanks.ag | Dashboard inaccessible | preproducao@umana.ag |
| Gmail Sending Identity | daniel.valin@thanks.ag | No outbound email | preproducao@umana.ag |
| Drive Folder Ownership | daniel.valin@thanks.ag | Write access lost | preproducao@umana.ag |
| Anthropic API Billing | Personal/thanks.ag account | No AI features | umana.ag org account |
| Infosimples API Key | daniel.valin@thanks.ag | No CNPJ/CND lookups | preproducao@umana.ag |
| BaseDados Spreadsheet Owner | daniel.valin@thanks.ag | Read-only for others | preproducao@umana.ag |
| REDUX/PROJETOS Edit Access | daniel.valin@thanks.ag | Intake broken | preproducao@umana.ag |
| PropertiesService Owner | daniel.valin@thanks.ag | Config inaccessible | preproducao@umana.ag |

**Hard rule:** The system must be fully operational if `daniel.valin@thanks.ag` is unavailable, suspended, or has left the organization. Any component that fails this test is a critical dependency that must be migrated before that component is considered production-safe.
