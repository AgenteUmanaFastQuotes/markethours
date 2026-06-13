# Umana Operations Platform — Domain Model

This document defines the complete domain model for the Umana Operations Platform. It is organized into bounded contexts (domain boundaries), with entity definitions, key fields, relationships, and invariants for each context.

This document is the authoritative reference for data schema design, API contract definitions, and state machine implementations. Any deviation from the invariants listed here must be treated as a defect.

---

## Domain Boundaries (Bounded Contexts)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         UMANA OPERATIONS PLATFORM                            │
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  CORE/JOBS  │───▶│  FASTQUOTES  │───▶│  SUPPLIERS   │───▶│ COMPLIANCE │  │
│  │             │    │              │    │              │    │            │  │
│  │ Users       │    │ Batches      │    │ Supplier     │    │ CND        │  │
│  │ Roles       │    │ Lines        │    │ Contacts     │    │ Revalidat. │  │
│  │ Producers   │    │ Email disp.  │    │ Categories   │    │ Campaigns  │  │
│  │ Clients     │    │ Responses    │    │ Compliance   │    │            │  │
│  │ Projects    │    │ AI runs      │    │   profiles   │    │            │  │
│  │ Jobs        │    │              │    │              │    │            │  │
│  └─────────────┘    └──────────────┘    └──────────────┘    └────────────┘  │
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────────────┐    │
│  │   BILLING   │    │    AUDIT     │    │       INFRASTRUCTURE         │    │
│  │             │    │              │    │                              │    │
│  │ BillingJobs │    │ AuditEvents  │    │ BackgroundJobs               │    │
│  │ Lines       │    │ (immutable   │    │ IdempotencyKeys              │    │
│  │ Invoices    │    │  append-only)│    │ IntegrationRuns              │    │
│  │ Retentions  │    │              │    │ ConfigurationEntries         │    │
│  └─────────────┘    └──────────────┘    └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Core / Jobs Context

### Entity: User

The identity of a human operator or system actor within the platform.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| email | String (unique) | Email address, serves as login identifier |
| displayName | String | Full name for display |
| googleId | String (nullable) | Google OAuth subject ID for SSO |
| roleId | FK → Role | Assigned role |
| isActive | Boolean | Whether this user can log in |
| createdAt | Timestamp | Account creation time |
| lastLoginAt | Timestamp (nullable) | Last successful login |

**Invariants:**
- Email must be lowercase and validated as a valid email address.
- A deactivated user (isActive = false) must not be able to authenticate or perform actions.
- System service accounts (e.g., preproducao@umana.ag acting as automation) must have an associated User record.

---

### Entity: Role

A named set of permissions assignable to users.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| name | String (unique) | Role name (e.g., OPERATOR, COMPLIANCE, ADMIN, READ_ONLY) |
| description | String | Human-readable role description |
| permissions | FK[] → Permission | Permissions granted to this role |

**Defined roles:**
- `ADMIN` — full access including system configuration
- `OPERATOR` — full FastQuotes and job management
- `COMPLIANCE` — compliance and CND management only
- `BILLING` — billing workflow access
- `READ_ONLY` — read all, write nothing

---

### Entity: Permission

A single named capability that can be granted or denied.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| code | String (unique) | Machine-readable permission code (e.g., `fastquotes:send`, `compliance:revalidate`) |
| description | String | Human-readable description |
| context | String | Domain context (FASTQUOTES, COMPLIANCE, BILLING, ADMIN, etc.) |

---

### Entity: Producer

Represents Umana itself or a contracted senior producer operating as a production entity.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| legalName | String | Official company name (razão social) |
| cnpj | String(14) | CNPJ as 14-digit string, no formatting |
| email | String | Primary contact email |
| isDefault | Boolean | Whether this is the primary Umana entity |

**Invariants:**
- `cnpj` must be stored as a 14-character string with leading zeros preserved.

---

### Entity: Client

A company or individual who has engaged Umana to produce an event.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| legalName | String | Official company name |
| tradeName | String (nullable) | Commercial/brand name |
| cnpj | String(14) (nullable) | CNPJ if a legal entity |
| cpf | String(11) (nullable) | CPF if an individual |
| primaryContactName | String | Main contact person's name |
| primaryContactEmail | String | Main contact email |
| primaryContactPhone | String (nullable) | Phone number |

**Invariants:**
- At least one of `cnpj` or `cpf` must be non-null.
- `cnpj` stored as 14-char string, `cpf` as 11-char string — no formatting characters.

---

### Entity: Project

A high-level grouping that may span multiple jobs (e.g., a multi-city tour is one project with multiple job legs).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| code | String (unique) | Internal project reference code |
| name | String | Project display name |
| clientId | FK → Client | Client this project belongs to |
| status | Enum(ATIVO, CONCLUIDO, CANCELADO) | Project lifecycle status |
| createdAt | Timestamp | Creation time |

---

### Entity: Job

A single discrete event production engagement. The central entity of the platform.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | String (unique) | Human-readable JOB_ID, format: `UJ-{line}-{timestamp}` |
| projectId | FK → Project | Parent project |
| clientId | FK → Client | Client (denormalized from Project for query convenience) |
| name | String | Job display name (typically event name) |
| eventType | Enum | One of the defined event type codes |
| status | Enum | See Job State Machine |
| productionLeadId | FK → User | Assigned production lead |
| eventDate | Date (nullable) | Scheduled event date |
| eventLocation | String (nullable) | City or venue name |
| estimatedBudget | Decimal (nullable) | Approximate total budget in BRL |
| briefingText | Text (nullable) | Full briefing document text |
| internalSpreadsheetLink | String (nullable) | URL to MasterInterna spreadsheet |
| driveFolderLinks | FK[] → DriveFolderLink | Associated Drive folders |
| createdAt | Timestamp | Record creation time |
| updatedAt | Timestamp | Last modification time |

**Invariants:**
- `jobId` must follow the `UJ-{line}-{timestamp}` format and must be unique across all jobs.
- `jobId` must be treated as a string everywhere — it must never be parsed as a number.
- A job's status can only advance via defined transitions in the Job State Machine.
- A job cannot be deleted; it can only be set to CANCELADO status.

---

### Entity: JobStatus (Enum)

```
NOVO
LIBERADO_FASTQUOTES
FASTQUOTES_GERADO
EM_COTACAO
COTACAO_CONCLUIDA
FINALIZADO
CANCELADO
```

---

### Entity: Briefing

A structured representation of the event briefing provided for a job.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | FK → Job | Parent job |
| rawText | Text | Full original briefing text |
| extractedEventType | Enum (nullable) | AI-extracted event type |
| extractedDate | Date (nullable) | AI-extracted event date |
| extractedLocation | String (nullable) | AI-extracted location |
| extractedAudience | String (nullable) | AI-extracted audience description |
| extractedCategories | String[] | AI-suggested FastQuote categories |
| aiExtractionRunId | FK → AIGenerationRun (nullable) | Associated AI run that did extraction |
| createdAt | Timestamp | When briefing was submitted |
| version | Integer | Version counter, incremented on update |

---

### Entity: InternalSpreadsheetLink

A typed link between a Job and an external Google Sheets document.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | FK → Job | Parent job |
| spreadsheetId | String | Google Sheets file ID |
| url | String | Full URL |
| type | Enum(MASTER_INTERNA, REDUX_ROW, OTHER) | Document type |
| label | String (nullable) | Display label |

---

### Entity: DriveFolderLink

A typed link between a Job and a Google Drive folder.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | FK → Job | Parent job |
| folderId | String | Google Drive folder ID |
| url | String | Full URL |
| category | Enum(ORCAMENTOS, BOLETOS_E_NOTAS, CONTRATOS_E_CARTAS, FICHA_CADASTRAL_E_DOCS, MASTER, OTHER) | Folder category |
| label | String (nullable) | Display label |

---

## FastQuotes Context

### Entity: FastQuoteBatch

A campaign of FastQuote requests for a single job. One job can have multiple batches (e.g., initial outreach, follow-up to non-responders).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | FK → Job | Parent job |
| batchNumber | Integer | Sequential batch number within job (1-based) |
| status | Enum(RASCUNHO, EM_ANDAMENTO, CONCLUIDO, CANCELADO) | Batch-level lifecycle status |
| createdByUserId | FK → User | User who initiated this batch |
| totalLines | Integer | Total number of quote request lines |
| sentCount | Integer | Number of lines successfully sent |
| receivedCount | Integer | Number of lines with received responses |
| createdAt | Timestamp | Batch creation time |
| dispatchedAt | Timestamp (nullable) | When first line was sent |
| completedAt | Timestamp (nullable) | When all lines reached terminal status |

---

### Entity: FastQuoteLine

A single supplier quote request within a batch. This is the primary operational unit of the FastQuotes workflow.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| batchId | FK → FastQuoteBatch | Parent batch |
| jobId | FK → Job | Parent job (denormalized) |
| supplierId | FK → Supplier | Target supplier |
| supplierContactId | FK → SupplierContact | Target contact (must be confirmed preferential) |
| category | Enum | FastQuote category (see glossary) |
| status | Enum | See FastQuote Line State Machine |
| generatedEmailSubject | Text (nullable) | AI-generated email subject |
| generatedEmailBody | Text (nullable) | AI-generated email body (HTML or plain text) |
| returnDeadline | Date (nullable) | Requested quote response deadline |
| aiGenerationRunId | FK → AIGenerationRun (nullable) | Run that generated this email |
| sentAt | Timestamp (nullable) | When email was successfully dispatched |
| receivedAt | Timestamp (nullable) | When response was received and processed |
| cancelledAt | Timestamp (nullable) | When line was cancelled |
| cancelReason | Text (nullable) | Reason for cancellation |
| createdAt | Timestamp | Record creation time |
| updatedAt | Timestamp | Last modification time |

**Invariants:**
- `supplierContactId` must reference a SupplierContact with `status = CONFIRMADO` and `isPreferentialFastQuotes = true`.
- Suppliers with a CNPJ must have a registered and confirmed contact before a FastQuoteLine can be created for them.
- Status transitions must follow the FastQuote Line State Machine exactly.
- Protected statuses (ENVIADO, RECEBIDO, EM_CONTATO, CANCELADO): `returnDeadline` cannot be changed once any of these statuses has been reached.
- A FastQuoteLine cannot be deleted; it can only be set to CANCELADO or ERRO.

---

### Entity: FastQuoteCategory (Enum)

See GLOSSARY.md for the full list of valid category strings.

---

### Entity: SupplierQuoteRequest

A record of a single outbound email generated and sent as part of a FastQuoteLine.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| fastQuoteLineId | FK → FastQuoteLine | Parent line |
| emailTo | String | Recipient email at time of send |
| emailSubject | String | Subject line at time of send |
| emailBodySnapshot | Text | Full email body at time of send (immutable snapshot) |
| status | Enum | See Email Dispatch State Machine |
| gmailMessageId | String (nullable) | Gmail Message-ID after successful send |
| gmailThreadId | String (nullable) | Gmail Thread-ID for reply monitoring |
| idempotencyKey | String (unique) | Idempotency key used for this send attempt |
| attemptCount | Integer | Number of send attempts made |
| lastAttemptAt | Timestamp (nullable) | Timestamp of most recent attempt |
| sentAt | Timestamp (nullable) | Confirmed successful send timestamp |
| errorMessage | Text (nullable) | Error detail if status = FALHA |
| createdAt | Timestamp | Record creation time |

**Invariants:**
- `idempotencyKey` must be generated and persisted BEFORE the Gmail send is attempted.
- `gmailMessageId` and `gmailThreadId` must be stored immediately upon successful send.
- The email body snapshot is immutable — once recorded, it must not be overwritten.

---

### Entity: QuoteRequestStatus (Enum)

```
PENDENTE
ENVIANDO
ENVIADO
FALHA
RETRY
ABANDONADO
```

---

### Entity: QuoteReturnDeadline

A record of return deadline values set for a FastQuoteLine, including history of changes (before the protected statuses lock it).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| fastQuoteLineId | FK → FastQuoteLine | Parent line |
| deadlineDate | Date | The deadline date value |
| setByUserId | FK → User | User who set this deadline |
| setAt | Timestamp | When deadline was set |
| isPrevious | Boolean | True if this was superseded by a later deadline |

---

### Entity: EmailPreview

A rendered preview of a FastQuoteLine email, generated for operator review before dispatch approval.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| fastQuoteLineId | FK → FastQuoteLine | Parent line |
| renderedSubject | String | Preview subject line |
| renderedBody | Text | Preview body (HTML) |
| generatedAt | Timestamp | When preview was generated |
| approvedByUserId | FK → User (nullable) | User who approved for send |
| approvedAt | Timestamp (nullable) | Approval timestamp |
| rejectedByUserId | FK → User (nullable) | User who rejected |
| rejectedAt | Timestamp (nullable) | Rejection timestamp |
| rejectionNote | Text (nullable) | Reason for rejection |

---

### Entity: EmailDispatchAttempt

A single attempt to send a FastQuote email via Gmail API.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| supplierQuoteRequestId | FK → SupplierQuoteRequest | Parent request |
| attemptNumber | Integer | Attempt sequence number (1-based) |
| attemptedAt | Timestamp | When attempt was made |
| outcome | Enum(SUCCESS, FAILURE, TIMEOUT) | Result of this attempt |
| errorCode | String (nullable) | API or system error code if failure |
| errorMessage | Text (nullable) | Error detail |
| gmailResponseSnapshot | JSON (nullable) | Raw Gmail API response snapshot |

---

### Entity: QuoteResponse

A supplier response to a FastQuote request, extracted from an inbound Gmail message.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| fastQuoteLineId | FK → FastQuoteLine | Associated quote line |
| gmailMessageId | String | Gmail Message-ID of the reply |
| gmailThreadId | String | Gmail Thread-ID |
| receivedAt | Timestamp | When Gmail received the message |
| processedAt | Timestamp (nullable) | When platform processed this response |
| processingStatus | Enum(RECEBIDO, PROCESSANDO, PROCESSADO, FALHA, DUPLICATA_IGNORADA) | Processing state |
| rawEmailBodySnapshot | Text | Full raw email body at time of processing |
| senderEmail | String | Reply sender's email address |
| hasAttachments | Boolean | Whether attachments were present |
| attachmentCount | Integer | Number of attachments |
| extractedQuoteValue | Decimal (nullable) | Extracted total quote value in BRL |
| extractedValidityDays | Integer (nullable) | Extracted proposal validity period |
| extractionNotes | Text (nullable) | Notes from extraction process |

**Invariants:**
- A Gmail message that has already been processed as a QuoteResponse must not be re-processed (idempotency via gmailMessageId).
- A Gmail message must be marked as "read" in Gmail ONLY after successful processing completion, not before or during.

---

### Entity: ProposalAttachment

A file attachment received from a supplier as part of a quote response.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| quoteResponseId | FK → QuoteResponse | Parent response |
| originalFilename | String | Original filename from email |
| mimeType | String | MIME type (e.g., application/pdf) |
| fileSizeBytes | Integer | File size in bytes |
| driveFileId | String (nullable) | Google Drive file ID after upload |
| driveFileUrl | String (nullable) | Drive URL for access |
| storedAt | Timestamp (nullable) | When file was written to Drive |

---

### Entity: ProposalExtractionResult

The structured data extracted from a supplier proposal attachment by Claude AI.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| attachmentId | FK → ProposalAttachment | Source attachment |
| aiGenerationRunId | FK → AIGenerationRun | AI run that performed extraction |
| extractedAt | Timestamp | Extraction timestamp |
| extractedValorBruto | Decimal (nullable) | Gross quote value extracted |
| extractedValorLiquido | Decimal (nullable) | Net value if specified |
| extractedValidityDays | Integer (nullable) | Proposal validity in days |
| extractedPaymentTerms | Text (nullable) | Payment terms description |
| extractedScopeDescription | Text (nullable) | Extracted scope of work |
| extractedNotes | Text (nullable) | Other notable extracted information |
| extractionConfidence | Enum(HIGH, MEDIUM, LOW) | AI confidence in extraction quality |
| requiresManualReview | Boolean | Whether operator review is required |
| rawAiOutput | JSON | Full raw AI extraction output |

---

### Entity: AIGenerationRun

A record of a single invocation of the Claude API (Anthropic) for any platform purpose.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| purpose | Enum(FASTQUOTE_GENERATION, PROPOSAL_EXTRACTION, BRIEFING_PARSING) | What this run was for |
| modelId | String | Model identifier used (e.g., `claude-3-5-sonnet-20241022`) |
| promptSnapshot | Text | Full prompt sent (immutable) |
| responseSnapshot | Text (nullable) | Full response received |
| inputTokens | Integer (nullable) | Input token count |
| outputTokens | Integer (nullable) | Output token count |
| durationMs | Integer (nullable) | API call duration in milliseconds |
| status | Enum(SUCCESS, FAILURE, TIMEOUT) | Outcome |
| errorMessage | Text (nullable) | Error detail if failure |
| createdAt | Timestamp | When run was initiated |
| associatedJobId | FK → Job (nullable) | Associated job for cost attribution |

---

## Suppliers Context

### Entity: Supplier

A legal entity that provides goods or services for Umana events.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| cnpj | String(14) (nullable) | CNPJ as 14-char string, no formatting |
| cpf | String(11) (nullable) | CPF as 11-char string (for individuals) |
| legalName | String | Razão social — legal company name |
| tradeName | String (nullable) | Nome fantasia — trading name |
| primaryCategory | FK → SupplierCategory | Primary service category |
| additionalCategories | FK[] → SupplierCategory | Additional categories |
| isActive | Boolean | Whether available for new quotes |
| legacyBaseDadasRowId | String (nullable) | Row reference in old BaseDados sheet for migration tracing |
| createdAt | Timestamp | Record creation time |
| updatedAt | Timestamp | Last modification time |

**Invariants:**
- At least one of `cnpj` or `cpf` must be non-null.
- `cnpj` must be exactly 14 characters (digits only, no punctuation). Leading zeros must be preserved.
- `cpf` must be exactly 11 characters (digits only, no punctuation).
- A Supplier with a `cnpj` must have at least one SupplierContact with `status = CONFIRMADO` before it can receive a FastQuote email.

---

### Entity: SupplierContact

A contact person at a supplier company who can receive FastQuote outreach.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| supplierId | FK → Supplier | Parent supplier |
| name | String | Contact person's full name |
| email | String | Email address |
| phone | String (nullable) | Phone number |
| role | String (nullable) | Job title or role at supplier |
| status | Enum | See Supplier Contact Lifecycle State Machine |
| source | Enum | How this contact was obtained |
| isPreferentialFastQuotes | Boolean | If true, this contact receives FastQuote emails |
| notes | Text (nullable) | Freeform notes about this contact |
| confirmedAt | Timestamp (nullable) | When contact status was set to CONFIRMADO |
| confirmedByUserId | FK → User (nullable) | Who confirmed this contact |
| archivedAt | Timestamp (nullable) | When contact was archived |
| archivedReason | Text (nullable) | Reason for archiving |
| createdAt | Timestamp | Record creation time |

**Invariants:**
- Only one SupplierContact per Supplier may have `isPreferentialFastQuotes = true` at any time.
- A SupplierContact with `status != CONFIRMADO` must not have `isPreferentialFastQuotes = true`.
- Archiving a contact that is the current preferential FastQuotes contact must unset `isPreferentialFastQuotes = true` and require selection of a new preferential contact.

---

### Entity: ContactStatus (Enum)

```
NAO_CONFIRMADO
CONFIRMADO
ARQUIVADO
```

---

### Entity: ContactSource (Enum)

```
MANUAL_ENTRY
SUPPLIER_WEBSITE
PREVIOUS_EMAIL_REPLY
REFERRED_BY_TEAM
IMPORTED_FROM_LEGACY
UNKNOWN
```

---

### Entity: ContactConfidence (Enum)

```
HIGH       -- confirmed via direct communication
MEDIUM     -- sourced from supplier website or referral
LOW        -- guessed or inferred; requires verification
```

---

### Entity: SupplierCategory

A classification for the type of services a supplier provides.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| code | String (unique) | Machine-readable code (matches FastQuote category strings) |
| label | String | Display label |
| isActive | Boolean | Whether new suppliers can be classified here |

---

### Entity: SupplierComplianceProfile

A summary of a supplier's current compliance status.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| supplierId | FK → Supplier (unique) | One-to-one with Supplier |
| federalCndStatus | Enum(OK, COM_DEBITOS, IRREGULAR, SEM_CND, ERRO, NAO_EMITIDA_ONLINE, NAO_CONSULTADA) | Federal CND status |
| federalCndExpiresAt | Date (nullable) | Federal CND expiry date |
| inssCndStatus | Enum | INSS CND status |
| inssCndExpiresAt | Date (nullable) | INSS CND expiry date |
| fgtsCndStatus | Enum | FGTS CND status |
| fgtsCndExpiresAt | Date (nullable) | FGTS CND expiry date |
| trabalhCndStatus | Enum | Labor (Trabalhista) CND status |
| trabalhCndExpiresAt | Date (nullable) | Trabalhista CND expiry date |
| overallStatus | Enum(REGULAR, IRREGULAR, PENDENTE, NAO_CONSULTADA) | Consolidated compliance status |
| lastConsultedAt | Timestamp (nullable) | When any CND was last refreshed |
| requiresRevalidation | Boolean | Whether a new revalidation is needed |

**Invariants:**
- `overallStatus = REGULAR` requires all individual CND statuses to be OK or NAO_EMITIDA_ONLINE (code 611 is acceptable as NAO_EMITIDA_ONLINE — not a debt indicator).
- `overallStatus = IRREGULAR` is set when any individual status is COM_DEBITOS or IRREGULAR.
- Code 611 from Infosimples must map to `NAO_EMITIDA_ONLINE`, never to COM_DEBITOS or IRREGULAR.

---

## Compliance Context

### Entity: CndConsultation

A record of a single CND query sent to Infosimples for a specific supplier and certificate type.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| supplierId | FK → Supplier | Supplier being queried |
| cnpj | String(14) | CNPJ used for query (snapshot at time of query) |
| cndType | Enum(FEDERAL, INSS, FGTS, TRABALHISTA) | Type of CND queried |
| status | Enum | See CND Consultation State Machine |
| infosimplesResponseCode | Integer (nullable) | Raw Infosimples response code |
| infosimplesResponseDescription | String (nullable) | Response description |
| certExpiryDate | Date (nullable) | Certificate expiry date if OK |
| rawResponseSnapshot | JSON (nullable) | Full Infosimples API response |
| queriedAt | Timestamp | When query was sent |
| resolvedAt | Timestamp (nullable) | When response was received/processed |
| idempotencyKey | String (unique) | Prevents duplicate queries per cycle |
| triggeredByRevalidationId | FK → RevalidationRequest (nullable) | If triggered by revalidation campaign |

**Invariants:**
- `infosimplesResponseCode = 611` must set `status = NAO_EMITIDA_ONLINE` on the SupplierComplianceProfile, not IRREGULAR.
- The `idempotencyKey` must be set before sending the API request to Infosimples.
- A CndConsultation record must be created (with status CONSULTANDO) before the API call is made.

---

### Entity: CndStatus (Enum)

```
NAO_CONSULTADA
CONSULTANDO
OK
COM_DEBITOS
IRREGULAR
SEM_CND
ERRO
NAO_EMITIDA_ONLINE
```

---

### Entity: RevalidationCampaign

A batch revalidation effort targeting a set of suppliers whose compliance status needs renewal.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| name | String | Campaign name |
| createdByUserId | FK → User | Who initiated this campaign |
| targetCriteria | JSON | Filter criteria used to select suppliers |
| totalTargetSuppliers | Integer | Number of suppliers targeted |
| status | Enum(RASCUNHO, EM_ANDAMENTO, CONCLUIDO, CANCELADO) | Campaign lifecycle status |
| createdAt | Timestamp | When campaign was created |
| launchedAt | Timestamp (nullable) | When first requests were dispatched |
| completedAt | Timestamp (nullable) | When all requests reached terminal status |

---

### Entity: RevalidationRequest

A single revalidation request sent to a supplier as part of a campaign.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| campaignId | FK → RevalidationCampaign | Parent campaign |
| supplierId | FK → Supplier | Target supplier |
| status | Enum | See Revalidation State Machine |
| sentAt | Timestamp (nullable) | When initial request was sent |
| reminderSentAt | Timestamp (nullable) | When reminder was sent |
| respondedAt | Timestamp (nullable) | When supplier responded |
| cancelledAt | Timestamp (nullable) | When request was cancelled |
| cancelReason | Text (nullable) | Reason for cancellation |
| emailTo | String (nullable) | Email address used for this request |

---

### Entity: ComplianceResponse

A supplier's response to a revalidation request (document upload or self-declaration).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| revalidationRequestId | FK → RevalidationRequest | Parent request |
| responseType | Enum(DOCUMENT_RECEIVED, EMAIL_REPLY, SELF_DECLARATION) | How supplier responded |
| receivedAt | Timestamp | When response was received |
| documentDriveFileId | String (nullable) | Drive file ID of uploaded document |
| notes | Text (nullable) | Operator notes on this response |
| processedByUserId | FK → User (nullable) | Who reviewed/processed this |

---

## Billing Context

### Entity: BillingJob

A billing coordination record for a single event job, tracking the overall billing status.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| jobId | FK → Job (unique) | Associated event job |
| status | Enum(ABERTO, EM_PROCESSAMENTO, AGUARDANDO_NF, CONCLUIDO, CANCELADO) | Overall billing status |
| totalBudgetedValue | Decimal (nullable) | Total approved budget for this job |
| totalInvoicedValue | Decimal | Sum of all confirmed invoice values |
| totalRetentions | Decimal | Sum of all withholdings to be retained |
| totalNetPayable | Decimal | Total actually payable to suppliers |
| createdAt | Timestamp | Record creation time |
| updatedAt | Timestamp | Last update time |

---

### Entity: BillingLine

A single line item in a billing job, representing one supplier payment to be processed.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| billingJobId | FK → BillingJob | Parent billing job |
| supplierId | FK → Supplier | Supplier to be paid |
| fastQuoteLineId | FK → FastQuoteLine (nullable) | Associated quote if applicable |
| status | Enum | See Billing Line State Machine |
| description | String | Description of service being paid |
| grossValue | Decimal | Total gross value (valor bruto) |
| retentionValue | Decimal | Total withholdings to be retained |
| netValue | Decimal | Net payable value (must equal grossValue - retentionValue) |
| costCenter | String (nullable) | Client cost center code |
| expectedNfDate | Date (nullable) | Expected date for NF receipt |
| createdAt | Timestamp | Record creation time |
| updatedAt | Timestamp | Last modification time |

**Invariants:**
- `netValue` must always equal `grossValue - retentionValue` (computed, not independently entered).
- A BillingLine cannot advance to NF_RECEBIDA without an associated InvoiceDocument.

---

### Entity: BillingStatus (Enum)

```
PENDENTE
EM_PROCESSAMENTO
AGUARDANDO_NF
NF_RECEBIDA
CONCLUIDO
CANCELADO
NAO_GERA_FATURA
```

---

### Entity: InvoiceDocument

A received fiscal or billing document from a supplier (NF, ND, or fatura).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| billingLineId | FK → BillingLine | Parent billing line |
| documentType | Enum(NF, ND, FATURA, BOLETO, OTHER) | Type of document |
| documentNumber | String (nullable) | NF number, boleto number, or other reference |
| issuedAt | Date (nullable) | Document issue date |
| receivedAt | Timestamp | When Umana received this document |
| grossValue | Decimal | Gross value on document |
| driveFileId | String (nullable) | Drive file ID of the document |
| driveFileUrl | String (nullable) | Drive URL for access |
| uploadedByUserId | FK → User | Who uploaded this document |
| notes | Text (nullable) | Operator notes |

---

### Entity: Retention

A tax withholding line item within a BillingLine.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| billingLineId | FK → BillingLine | Parent billing line |
| retentionType | Enum(ISS, IR, PIS, COFINS, CSLL, INSS, OTHER) | Type of withholding |
| rate | Decimal | Withholding rate (e.g., 0.05 for 5%) |
| baseValue | Decimal | Value to which rate is applied |
| retentionAmount | Decimal | Computed retention amount |
| notes | String (nullable) | Legal basis or notes |

**Invariants:**
- `retentionAmount` must equal `baseValue * rate` (computed, not independently entered).
- The sum of all Retention amounts for a BillingLine must equal `billingLine.retentionValue`.

---

### Entity: BillingDiagnostic

A diagnostic check performed on a BillingLine to surface data quality issues before processing.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| billingLineId | FK → BillingLine | Parent billing line |
| diagnosticType | Enum(COMPLIANCE_CHECK, VALUE_MISMATCH, MISSING_NF, CNPJ_INVALID, CONTACT_MISSING, OTHER) | What was checked |
| severity | Enum(ERROR, WARNING, INFO) | Severity level |
| message | Text | Human-readable diagnostic message |
| resolvedAt | Timestamp (nullable) | When this diagnostic was resolved |
| resolvedByUserId | FK → User (nullable) | Who resolved it |
| createdAt | Timestamp | When diagnostic was generated |

---

### Entity: CostCenter

A client cost center code registered in the platform for use in billing attribution.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| clientId | FK → Client | Client that owns this cost center |
| code | String | Cost center code string |
| description | String (nullable) | Human-readable description |
| isActive | Boolean | Whether currently assignable |

---

## Infrastructure Context

### Entity: AuditEvent

An immutable record of any state-changing operation in the platform. The audit log is append-only.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| entityType | String | Type of entity affected (e.g., "FastQuoteLine", "CndConsultation") |
| entityId | UUID | ID of the affected entity |
| action | String | Action performed (e.g., "STATUS_TRANSITION", "EMAIL_SENT", "RECORD_CREATED") |
| actorType | Enum(USER, SYSTEM, BACKGROUND_JOB) | Who/what performed the action |
| actorId | String (nullable) | User ID or job ID of actor |
| actorEmail | String (nullable) | Email of acting user (snapshot) |
| previousState | JSON (nullable) | Snapshot of entity state before change |
| newState | JSON (nullable) | Snapshot of entity state after change |
| reason | Text (nullable) | Why this action was taken |
| ipAddress | String (nullable) | Request IP if user-initiated |
| createdAt | Timestamp | When event occurred (immutable, set at insert) |

**Invariants:**
- AuditEvent records must NEVER be updated or deleted after creation.
- `createdAt` is set by the database at insert time; application code must not override it.
- All state transitions for FastQuoteLines, CndConsultations, and BillingLines must generate an AuditEvent.

---

### Entity: IntegrationRun

A record of a single execution of an external integration cycle.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| integrationType | Enum(GMAIL_MONITORING, INFOSIMPLES_CND, DRIVE_WRITE, CLAUDE_API) | Integration type |
| status | Enum(STARTED, COMPLETED, FAILED, PARTIAL) | Outcome |
| startedAt | Timestamp | When run started |
| completedAt | Timestamp (nullable) | When run ended |
| processedCount | Integer | Records successfully processed |
| failedCount | Integer | Records that failed |
| errorSummary | Text (nullable) | Summary of any errors |
| triggerType | Enum(SCHEDULED, USER_INITIATED, BACKGROUND_JOB) | What triggered this run |

---

### Entity: BackgroundJob

A queued unit of asynchronous work managed by BullMQ.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| queueName | String | BullMQ queue name |
| bullMqJobId | String | BullMQ native job ID |
| jobType | String | Job type identifier (e.g., `fastquote.send`, `cnd.query`) |
| payload | JSON | Job input payload |
| status | Enum(QUEUED, PROCESSING, COMPLETED, FAILED, RETRYING) | Job status |
| attempts | Integer | Number of attempts made |
| maxAttempts | Integer | Maximum configured retry count |
| enqueuedAt | Timestamp | When job was added to queue |
| startedAt | Timestamp (nullable) | When processing began |
| completedAt | Timestamp (nullable) | When processing ended |
| errorMessage | Text (nullable) | Error detail if failed |
| associatedEntityType | String (nullable) | Entity type job operates on |
| associatedEntityId | UUID (nullable) | Entity ID job operates on |

---

### Entity: IdempotencyKey

A persistent record of idempotency keys for operations with external side effects.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| keyValue | String (unique) | The idempotency key string |
| operationType | String | Operation this key covers (e.g., `email.send`, `cnd.query`) |
| entityId | UUID | Entity the operation relates to |
| status | Enum(PENDING, COMPLETED, FAILED) | Whether the operation completed |
| createdAt | Timestamp | Key creation time (BEFORE operation attempt) |
| resolvedAt | Timestamp (nullable) | When operation confirmed success or permanent failure |

**Invariants:**
- The IdempotencyKey record must be written to the database (with status PENDING) BEFORE the external operation is attempted.
- If the same `keyValue` already exists with status COMPLETED, the operation must be skipped entirely.
- Keys must never be deleted; they serve as the permanent deduplication record.

---

### Entity: ConfigurationEntry

A runtime configuration value managed by operators.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Surrogate primary key |
| key | String (unique) | Configuration key (dot-separated namespaced path) |
| value | Text | Configuration value (may be JSON) |
| valueType | Enum(STRING, INTEGER, BOOLEAN, JSON, SECRET) | How to parse/display the value |
| description | String | What this config controls |
| isSecret | Boolean | If true, value is encrypted at rest and masked in UI |
| updatedByUserId | FK → User | Who last changed this value |
| updatedAt | Timestamp | When last changed |

**Invariants:**
- Entries with `isSecret = true` must be stored encrypted and must never be logged or included in AuditEvent snapshots in plaintext.

---

## Platform-Wide Invariants

These invariants apply across all bounded contexts and must be enforced at the persistence layer:

1. **CNPJ as string**: CNPJ values must always be stored as 14-character text strings with leading zeros preserved. Any function receiving a CNPJ must validate it is exactly 14 digits before processing.

2. **JOB_ID format**: JOB_ID must follow the `UJ-{line}-{timestamp}` format. It must be treated as a string everywhere in the system — never parsed as a number or subjected to arithmetic operations.

3. **Confirmed contact before email**: Suppliers with a CNPJ must have at least one SupplierContact with `status = CONFIRMADO` and `isPreferentialFastQuotes = true` before a FastQuoteLine can be created or sent for them.

4. **Infosimples code 611**: Response code 611 from Infosimples must be mapped to `NAO_EMITIDA_ONLINE` status and must contribute to `overallStatus = REGULAR`, not `IRREGULAR`. This is legally and operationally critical.

5. **Gmail read-marking**: Gmail messages must be marked as read ONLY after all processing of that message has been completed successfully. Partial processing failures must leave the message unread for retry.

6. **FastQuote protected statuses**: The `returnDeadline` field of a FastQuoteLine cannot be modified once the line has reached any of: ENVIADO, RECEBIDO, EM_CONTATO, CANCELADO. Attempts to modify the deadline in these states must return a domain error.

7. **Audit immutability**: AuditEvent records are append-only. No UPDATE or DELETE statement may ever target the audit_events table.

8. **Idempotency before action**: For any operation that touches Gmail, Drive, Infosimples, or Claude API, the IdempotencyKey must be persisted to the database before the external call is made.

9. **Net value calculation**: `BillingLine.netValue` must always be recomputed as `grossValue - retentionValue` whenever either source field changes. It must never be set independently.

10. **Exclusive preferential contact**: At most one SupplierContact per Supplier may have `isPreferentialFastQuotes = true` at any time. This must be enforced at the database level with a partial unique index.
