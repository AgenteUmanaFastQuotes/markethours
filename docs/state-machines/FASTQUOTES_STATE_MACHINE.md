# Umana Operations Platform — State Machine Specifications

This document provides complete state machine specifications for all lifecycle-managed entities in the Umana Operations Platform. Each state machine defines: valid states, allowed transitions, triggering actors, side effects, audit events generated, and failure handling.

State machines are the authoritative contract for status field behavior. Any code that writes to a status field must go through the state machine logic and must not set status values directly.

---

## 1. FastQuote Line State Machine

The FastQuote Line is the primary operational unit of the FastQuotes workflow. Each line represents one supplier quote request within a batch.

### 1.1 State Diagram

```
                         ┌─────────────────────────────┐
                         │           RASCUNHO           │
                         │  (Draft — awaiting review)   │
                         └──────────────┬──────────────┘
                                        │ Operator approves
                                        │ (set AGUARDANDO ENVIO)
                                        ▼
                         ┌─────────────────────────────┐
                         │       AGUARDANDO ENVIO       │
                         │  (Queued — awaiting dispatch)│
                         └──────────────┬──────────────┘
                                        │ Email dispatcher picks up
                                        │ & confirms send
                                        ▼
                         ┌─────────────────────────────┐◀─────────────────────┐
                         │           ENVIADO            │                      │
                         │     (Sent — monitoring)      │                      │
                         └──┬───────────┬──────────────┘                      │
                            │           │           │                           │
                 Supplier   │           │ Operator  │ Response                │
                 phones in  │           │ marks     │ received from           │
                 via other  │           │ resend    │ email monitoring        │
                 channel    │           │           │                          │
                            ▼           ▼           ▼                          │
              ┌─────────────────┐ ┌──────────────────┐                        │
              │   EM CONTATO    │ │ REENVIAR COTAÇÃO  │────────────────────────┘
              │ (In contact via │ │ (Needs resend)    │  After resend email sent
              │  other channel) │ └──────────────────┘
              └─────────────────┘
                            │
                            │ Response
                            │ received
                            ▼
                         ┌─────────────────────────────┐
                         │          RECEBIDO            │
                         │   (Response received &       │
                         │    extracted successfully)   │
                         └─────────────────────────────┘

   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ TERMINAL / ERROR PATHS ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

   From RASCUNHO, AGUARDANDO ENVIO, ENVIADO, EM CONTATO, or REENVIAR COTAÇÃO:
   ┌─────────────────────────────┐
   │          CANCELADO          │  ← Operator cancels (terminal — no exit)
   └─────────────────────────────┘

   From RASCUNHO, AGUARDANDO ENVIO:
   ┌─────────────────────────────┐
   │      PRECISA REGENERAR      │  ← Content stale, must regenerate
   └───────────────┬─────────────┘
                   │ Regeneration complete
                   └──▶ RASCUNHO

   From ENVIADO, EM CONTATO (system error during processing):
   ┌─────────────────────────────┐
   │            ERRO             │  ← Unrecoverable processing error
   └─────────────────────────────┘
```

### 1.2 Transition Table

| From | To | Trigger | Actor | Side Effects | Audit Event | Failure Behavior |
|------|----|---------|-------|--------------|-------------|------------------|
| RASCUNHO | AGUARDANDO ENVIO | Operator approves email content in Dashboard | User (OPERATOR role) | Email preview locked; line added to dispatch queue | `FQL_APPROVED_FOR_SEND` | Reject if email content is empty; reject if contact not confirmed |
| RASCUNHO | PRECISA REGENERAR | Operator marks content as needing regeneration | User (OPERATOR role) | AI generation queued | `FQL_MARKED_REGENERATE` | None |
| RASCUNHO | CANCELADO | Operator cancels line | User (OPERATOR role) | Removes from any queue; no email sent | `FQL_CANCELLED` | None |
| AGUARDANDO ENVIO | ENVIADO | Email dispatcher successfully sends email | System (BackgroundJob) | SupplierQuoteRequest created with gmailMessageId; Gmail thread ID recorded; monitoring enabled | `FQL_EMAIL_SENT` | Rollback to AGUARDANDO ENVIO; increment attempt count; schedule retry |
| AGUARDANDO ENVIO | ERRO | Email dispatch permanently fails (e.g., bad address, auth error) | System (BackgroundJob) | Error details stored; alert generated | `FQL_DISPATCH_FAILED` | Operator must manually resolve |
| AGUARDANDO ENVIO | CANCELADO | Operator cancels before send | User (OPERATOR role) | Removed from dispatch queue | `FQL_CANCELLED` | None |
| ENVIADO | RECEBIDO | Gmail monitoring detects supplier reply and extraction succeeds | System (BackgroundJob) | QuoteResponse created; attachments stored in Drive; Gmail thread marked read | `FQL_RESPONSE_RECEIVED` | If extraction fails, stay in ENVIADO; create ERRO on QuoteResponse; alert operator |
| ENVIADO | EM CONTATO | Operator manually records supplier contact via other channel | User (OPERATOR role) | Contact note recorded | `FQL_MARKED_EM_CONTATO` | None |
| ENVIADO | REENVIAR COTAÇÃO | Operator marks for resend (deadline expired or bounce) | User (OPERATOR role) | New dispatch attempt queued | `FQL_MARKED_RESEND` | None |
| ENVIADO | CANCELADO | Operator cancels after send | User (OPERATOR role) | Monitoring stops for this thread | `FQL_CANCELLED` | None |
| EM CONTATO | RECEBIDO | Supplier submits proposal via email or operator records receipt | System or User | Proposal recorded; Drive upload | `FQL_RESPONSE_RECEIVED` | None |
| EM CONTATO | CANCELADO | Operator cancels | User (OPERATOR role) | None | `FQL_CANCELLED` | None |
| EM CONTATO | ENVIADO | Operator re-queues outbound email | User (OPERATOR role) | New dispatch attempt queued | `FQL_REQUEUED_SEND` | None |
| REENVIAR COTAÇÃO | ENVIADO | Resend email dispatched successfully | System (BackgroundJob) | New SupplierQuoteRequest created; previous one archived | `FQL_RESEND_SENT` | Stay in REENVIAR COTAÇÃO; increment attempt count |
| REENVIAR COTAÇÃO | CANCELADO | Operator cancels | User (OPERATOR role) | None | `FQL_CANCELLED` | None |
| PRECISA REGENERAR | RASCUNHO | AI regeneration completes | System (BackgroundJob) | New email content stored; old content archived | `FQL_REGENERATED` | Stay in PRECISA REGENERAR; alert operator |

### 1.3 Protected Status Rules

The following statuses are **protected** — certain field modifications are forbidden once these statuses have been reached:

| Protected Status | Forbidden Modification | Reason |
|-----------------|----------------------|--------|
| ENVIADO | `returnDeadline` change | Email has already been sent with the deadline communicated to supplier |
| RECEBIDO | `returnDeadline` change | Response already received; deadline is historical |
| EM_CONTATO | `returnDeadline` change | Supplier has been given the deadline in communication |
| CANCELADO | Any field modification | Terminal state |

Any attempt to modify a protected field in a protected state must return a `ProtectedStateViolationError` domain error and must NOT write to the database.

---

## 2. Job State Machine

Tracks the lifecycle of an event job from creation through completion.

### 2.1 State Diagram

```
┌──────────────┐   Production lead    ┌──────────────────────┐
│     NOVO     │ ─── releases job ──▶ │  LIBERADO_FASTQUOTES  │
│  (New — not  │                      │  (Released for FQ     │
│   yet active)│                      │   campaign creation)  │
└──────────────┘                      └──────────┬───────────┘
                                                  │ FQ batch
                                                  │ created
                                                  ▼
                                      ┌──────────────────────┐
                                      │  FASTQUOTES_GERADO    │
                                      │  (FQ emails generated │
                                      │   awaiting dispatch)  │
                                      └──────────┬───────────┘
                                                  │ First email
                                                  │ dispatched
                                                  ▼
                                      ┌──────────────────────┐
                                      │     EM_COTACAO        │
                                      │  (Active quotation    │
                                      │   campaign running)   │
                                      └──────────┬───────────┘
                                                  │ All lines
                                                  │ reach terminal
                                                  │ status
                                                  ▼
                                      ┌──────────────────────┐
                                      │  COTACAO_CONCLUIDA    │
                                      │  (All quotes in;      │
                                      │   ready for approval) │
                                      └──────────┬───────────┘
                                                  │ Budget approved
                                                  │ & billing ready
                                                  ▼
                                      ┌──────────────────────┐
                                      │     FINALIZADO        │
                                      │  (Job complete)       │
                                      └──────────────────────┘

   From any non-terminal state:
   ┌──────────────┐
   │  CANCELADO   │  ← Admin or operator cancels job
   └──────────────┘
```

### 2.2 Transition Table

| From | To | Trigger | Actor |
|------|----|---------|-------|
| NOVO | LIBERADO_FASTQUOTES | Production lead marks job ready for quoting | User (OPERATOR) |
| LIBERADO_FASTQUOTES | FASTQUOTES_GERADO | First FastQuoteBatch created for this job | System or User |
| FASTQUOTES_GERADO | EM_COTACAO | First FastQuoteLine email dispatched | System |
| EM_COTACAO | COTACAO_CONCLUIDA | All FastQuoteLines in this job's batches reach terminal status (RECEBIDO, CANCELADO, ERRO) | System (automated check) |
| COTACAO_CONCLUIDA | FINALIZADO | Admin confirms budget approval and job completion | User (ADMIN or OPERATOR) |
| Any non-terminal | CANCELADO | Admin cancels job | User (ADMIN) |

---

## 3. Email Dispatch State Machine

Tracks the lifecycle of a single outbound email send attempt for a SupplierQuoteRequest.

### 3.1 State Diagram

```
┌──────────────┐   Dispatcher picks   ┌──────────────────┐
│   PENDENTE   │ ──── up the job ────▶ │    ENVIANDO      │
│  (Queued for │                       │  (API call in    │
│   dispatch)  │                       │   progress)      │
└──────────────┘                       └─────────┬────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                         Success           Transient error       Permanent error
                              │            (timeout, 5xx)       (invalid addr,
                              ▼                   │              auth fail)
                    ┌──────────────────┐          ▼                   │
                    │     ENVIADO      │    ┌──────────┐              ▼
                    │  (Confirmed sent)│    │  RETRY   │        ┌──────────┐
                    └──────────────────┘    │ (back to │        │  FALHA   │
                                            │ PENDENTE │        │(terminal)│
                                            │ with     │        └──────────┘
                                            │ backoff) │
                                            └────┬─────┘
                                                 │ Max retries
                                                 │ exceeded
                                                 ▼
                                           ┌──────────────┐
                                           │  ABANDONADO  │
                                           │  (terminal)  │
                                           └──────────────┘
```

### 3.2 Transition Rules

- Maximum retry attempts: 3 (configurable via ConfigurationEntry).
- Retry backoff: exponential (1 min, 5 min, 15 min).
- Transient errors that trigger RETRY: HTTP 5xx, network timeout, Gmail API quota exceeded.
- Permanent errors that go directly to FALHA: HTTP 400 (bad request), invalid email address format, authentication revoked.
- An ABANDONADO state must generate an alert to the operations team and create a BillingDiagnostic of type `EMAIL_DISPATCH_FAILED`.

---

## 4. Quote Response Processing State Machine

Tracks the processing of a single inbound Gmail message identified as a supplier response.

### 4.1 State Diagram

```
┌──────────────┐   Monitoring job    ┌──────────────────────┐
│   RECEBIDO   │ ─── identifies ───▶ │    PROCESSANDO       │
│  (Raw Gmail  │     reply           │  (Extracting data,   │
│   message    │                     │   uploading to Drive)│
│   found)     │                     └───────────┬──────────┘
└──────────────┘                                 │
                             ┌───────────────────┼──────────────────┐
                             │                   │                  │
                        Success          Duplicate message    Extraction error
                             │           (already processed)        │
                             ▼                   │                  ▼
                   ┌──────────────────┐          ▼         ┌──────────────────┐
                   │   PROCESSADO     │  ┌────────────────┐ │      FALHA       │
                   │  (Complete;      │  │DUPLICATA_IGNO- │ │ (requires manual │
                   │   FQL updated;   │  │RADA (terminal; │ │  operator review)│
                   │   Gmail marked   │  │ no further     │ └──────────────────┘
                   │   read)          │  │ action)        │
                   └──────────────────┘  └────────────────┘
```

### 4.2 Processing Rules

- A Gmail message is identified as a supplier response if: it is a reply to a known Gmail thread tracked in a SupplierQuoteRequest record.
- Before creating a QuoteResponse record, check: does a QuoteResponse with this `gmailMessageId` already exist? If yes → DUPLICATA_IGNORADA.
- Gmail "mark as read" operation must occur as the LAST step of processing, after:
  1. QuoteResponse record created (PROCESSADO)
  2. Attachments uploaded to Drive
  3. FastQuoteLine status updated
  4. AuditEvent written
- If any step fails after marking as read, this is a data inconsistency bug — the monitoring job must not mark emails as read until all prior steps succeed.

---

## 5. Supplier Contact Lifecycle State Machine

Tracks the status of a SupplierContact record.

### 5.1 State Diagram

```
┌──────────────────┐   Operator confirms   ┌──────────────────┐
│  NAO_CONFIRMADO  │ ─── contact valid ──▶ │   CONFIRMADO     │
│  (Unconfirmed —  │                       │  (Verified;       │
│   not safe to   │                        │   eligible for    │
│   email)        │                        │   FastQuotes)     │
└──────────────────┘                       └────────┬─────────┘
         │                                          │
         │ Operator archives                        │ Operator archives
         │ (never confirmed)                        │ (no longer valid)
         ▼                                          ▼
┌──────────────────┐                       ┌──────────────────┐
│    ARQUIVADO     │                       │    ARQUIVADO     │
│   (terminal)     │                       │   (terminal)     │
└──────────────────┘                       └──────────────────┘
```

### 5.2 Rules

- Only CONFIRMADO contacts are eligible to be set as `isPreferentialFastQuotes = true`.
- Archiving a contact that is currently `isPreferentialFastQuotes = true` must:
  1. Set `isPreferentialFastQuotes = false` on the archived contact.
  2. Block the archive operation with a `NoPreferentialContactError` warning, prompting the operator to designate a replacement.
  3. If operator explicitly overrides (e.g., no valid replacement exists), allow the archive but set a `BillingDiagnostic`-equivalent flag on the Supplier indicating it has no active preferential contact.

---

## 6. CND Consultation State Machine

Tracks the lifecycle of a single Infosimples CND query.

### 6.1 State Diagram

```
┌─────────────────┐   Job triggered    ┌──────────────────┐
│ NAO_CONSULTADA  │ ──(idempotency ──▶ │   CONSULTANDO    │
│  (Not yet       │    key written)    │  (API call in    │
│   queried)      │                    │   progress)      │
└─────────────────┘                    └───────┬──────────┘
                                               │
                       ┌───────────────────────┼─────────────────────────────┐
                       │                       │                             │
                    Code = OK            Code = 611             Code = debt /
                    (no debts,           (sem emissão           irregular /
                    cert issued)          online)               cert not found
                       │                       │                             │
                       ▼                       ▼                             │
              ┌──────────────┐     ┌────────────────────┐                   │
              │      OK      │     │  NAO_EMITIDA_ONLINE │                   │
              │  (terminal)  │     │  (NOT a debt;       │                   │
              │  Cert valid  │     │   terminal)         │                   │
              └──────────────┘     └────────────────────┘                   │
                                                                             ▼
                                                              ┌──────────────────────────┐
                                                              │        COM_DEBITOS        │
                                                              │   (Debts found; blocks    │
                                                              │    payment — terminal)    │
                                                              └──────────────────────────┘

                              ┌───────────────────────────────┐
                              │            IRREGULAR           │
                              │  (Certificate exists but       │
                              │   supplier is non-compliant;   │
                              │   terminal)                    │
                              └───────────────────────────────┘

                              ┌───────────────────────────────┐
                              │             SEM_CND            │
                              │  (No certificate type applies  │
                              │   to this CNPJ; terminal)      │
                              └───────────────────────────────┘

                              ┌───────────────────────────────┐
                              │              ERRO              │
                              │  (API error, timeout, or       │
                              │   unrecognized response code;  │
                              │   retry eligible)              │
                              └───────────────────────────────┘
```

### 6.2 Code 611 Rule (Critical)

Infosimples response code 611 means: **"A certidão não pode ser emitida online para este CNPJ."** The government system does not issue this certificate type online; it must be obtained in person.

- Code 611 **does NOT mean the company has debts.**
- Code 611 **does NOT make the supplier irregular.**
- Code 611 **must** map to `NAO_EMITIDA_ONLINE` status.
- `NAO_EMITIDA_ONLINE` must be treated as acceptable for `overallStatus = REGULAR`.
- Any code that maps 611 to `COM_DEBITOS` or `IRREGULAR` is a defect and must be treated as a P1 bug.

---

## 7. Revalidation State Machine

Tracks the lifecycle of a single supplier revalidation request within a compliance campaign.

### 7.1 State Diagram

```
┌───────────────┐   Campaign created   ┌──────────────────┐
│  SEM_ENVIO    │ ─── & dispatched ──▶ │    PENDENTE      │
│  (Not yet in  │                      │  (Email sent;    │
│   any campaign│                      │   awaiting       │
│   for this    │                      │   supplier reply)│
│   supplier)   │                      └───────┬──────────┘
└───────────────┘                              │
                                               │
                           ┌───────────────────┼────────────────┐
                           │                   │                │
                     Supplier responds   Deadline passes;   Operator
                     (docs received)     no reply            cancels
                           │                   │                │
                           ▼                   ▼                ▼
                  ┌──────────────┐  ┌─────────────────┐  ┌───────────┐
                  │  RESPONDIDO  │  │LEMBRETE_ENVIADO  │  │ CANCELADO │
                  │  (terminal)  │  │(Reminder sent;   │  │(terminal) │
                  └──────────────┘  │ still awaiting)  │  └───────────┘
                                    └────────┬─────────┘
                                             │
                                  ┌──────────┼──────────┐
                                  │                     │
                            Supplier responds     Operator cancels
                                  │                     │
                                  ▼                     ▼
                         ┌──────────────┐       ┌───────────┐
                         │  RESPONDIDO  │       │ CANCELADO │
                         │  (terminal)  │       │(terminal) │
                         └──────────────┘       └───────────┘
```

### 7.2 Rules

- A supplier should receive at most one revalidation request per campaign.
- A reminder is sent automatically when the deadline is passed without a response (configurable: default 3 days after initial send).
- Maximum one reminder per request.
- After reminder + additional wait (configurable: default 5 days), if no response: operator is alerted; request stays in LEMBRETE_ENVIADO until manually cancelled or supplier responds.

---

## 8. Billing Line State Machine

Tracks the lifecycle of a single payment line within a billing job.

### 8.1 State Diagram

```
┌──────────────┐   Billing job       ┌───────────────────────┐
│   PENDENTE   │ ── activated ──────▶ │   EM_PROCESSAMENTO    │
│  (Created;   │                     │  (Compliance check;   │
│   not active │                     │   contact validation; │
│   yet)       │                     │   NF verification)    │
└──────────────┘                     └──────────┬────────────┘
                                                 │
                                  ┌──────────────┼──────────────┐
                                  │                             │
                            NF not yet              NF already received
                            received                 (or not required yet)
                                  │                             │
                                  ▼                             │
                    ┌──────────────────────┐                    │
                    │    AGUARDANDO_NF     │                    │
                    │  (Waiting for        │                    │
                    │   supplier to send   │                    │
                    │   Nota Fiscal)       │                    │
                    └──────────┬───────────┘                    │
                               │ NF received                    │
                               │ & validated                    │
                               ▼                                ▼
                    ┌──────────────────────────────────────────────┐
                    │                 NF_RECEBIDA                   │
                    │  (NF received and matched to billing line;    │
                    │   ready for payment processing)               │
                    └───────────────────────┬──────────────────────┘
                                            │ Payment confirmed
                                            ▼
                               ┌──────────────────────┐
                               │       CONCLUIDO       │
                               │  (Payment processed;  │
                               │   invoice archived)   │
                               └──────────────────────┘

   From PENDENTE or EM_PROCESSAMENTO:
   ┌──────────────────────┐
   │      CANCELADO       │  ← Admin cancels line
   └──────────────────────┘

   From EM_PROCESSAMENTO (supplier-specific rule applies):
   ┌──────────────────────┐
   │   NAO_GERA_FATURA    │  ← Supplier/contract exemption from NF requirement
   └──────────────────────┘
```

### 8.2 Rules

- A BillingLine cannot advance from EM_PROCESSAMENTO to AGUARDANDO_NF or NF_RECEBIDA if the supplier's `overallComplianceStatus != REGULAR`.
- A BillingLine set to NAO_GERA_FATURA must have an operator-provided justification note stored in the billing line record.
- CONCLUIDO is a terminal state — a completed billing line cannot be uncompleted. Corrections require creating a new line with an offsetting amount.
- The system must generate a BillingDiagnostic record for any BillingLine where the supplier has CND status COM_DEBITOS or IRREGULAR before attempting to advance the line.

---

## State Machine Implementation Contract

All state machine transitions in the platform must be implemented with the following guarantees:

1. **Validation before write**: All pre-conditions (role checks, field constraints, protected status rules) must be evaluated before any database write occurs.

2. **Atomic transition**: The status field update and any required side-effect records (e.g., creating a SupplierQuoteRequest when transitioning to ENVIADO) must be written in a single database transaction.

3. **AuditEvent on every transition**: Every status transition must produce an AuditEvent record within the same transaction. The transition must not be considered complete if the AuditEvent write fails.

4. **No direct status writes**: Application code must never write directly to a `status` field. All status changes must be routed through the state machine service that enforces these rules.

5. **Error surfacing**: Invalid transitions (e.g., attempting to move from RECEBIDO to ENVIADO) must throw a typed `InvalidStateTransitionError` containing: entity type, entity ID, from-state, attempted to-state, and reason.
