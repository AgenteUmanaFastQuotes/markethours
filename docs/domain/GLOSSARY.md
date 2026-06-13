# Umana Operations Platform — Domain Glossary

This glossary defines all domain-specific terms used in the Umana Operations Platform. Terms include Portuguese business terminology with English explanations, technical system names, workflow statuses, and category classifications. All engineers, operators, and stakeholders working with this platform should use these definitions as the authoritative reference.

---

## Organizations and Systems

**Umana**
The event production company within the Grupo Thanks umbrella. Umana handles end-to-end production of corporate events: supplier coordination, logistics, compliance, and billing. The Umana Operations Platform is built to support Umana's production workflows.

**Grupo Thanks**
The parent group that includes Umana as its event production arm. Grupo Thanks operates multiple business lines in the Brazilian corporate events and entertainment sector.

**REDUX**
The internal name for the primary operational Google Sheets workbook used by the Umana team. REDUX contains the PROJETOS tab as its main job registry and serves as the intake point for all new event jobs. The name reflects an earlier system iteration and is maintained for historical continuity.

**PROJETOS**
The main tab within the REDUX spreadsheet that lists all active and historical event jobs. Each row in PROJETOS corresponds to one job, containing the JOB_ID, client name, event type, production lead, status, and links to associated Drive folders and MasterInterna spreadsheets. "PROJETOS" is Portuguese for "projects."

**FastQuotes**
The supplier quotation workflow and the name of the subsystem that manages it. FastQuotes covers the full lifecycle of soliciting quotes from external suppliers for a given event job: from generating personalized outreach emails (via AI), dispatching them via Gmail, monitoring for supplier responses, extracting quote data from responses, and feeding results back into the project record. The system is also used to refer to the email outreach batches themselves.

**AgenteUmanaFastQuotes**
The name of the Google Apps Script library that implements the core orchestration logic for the FastQuotes workflow. It handles AI prompt construction, Gmail dispatch, reply monitoring, proposal data extraction, status management, and integration with BaseDados and REDUX. "Agente" is Portuguese for "agent."

**Dashboard FastQuotes Ops**
The operational web interface (a GAS Web App) through which the Umana production team manages FastQuotes campaigns. Operators use this dashboard to review AI-generated email previews, trigger sends, monitor status per supplier, and handle exceptions.

**MasterInterna**
A per-project Google Sheets workbook copied from a standard template for each new event job. MasterInterna contains the internal project plan: task breakdown, team assignments, budget line items, timeline, and milestone status. "Interna" is Portuguese for "internal." Each project has exactly one MasterInterna linked from its PROJETOS row.

**BaseDados**
The Google Sheets workbook that serves as the supplier master database. Contains FORNECEDORES_MASTER (the supplier registry) and FORNECEDOR_CONTATOS (the contact registry), as well as compliance status caches and CND consultation history. "Base de dados" is Portuguese for "database."

**DashboardCompliance**
The web interface (a GAS Web App) through which the compliance team manages CND consultations and supplier revalidation campaigns. Operators view CND status per supplier, launch revalidation requests, and review Infosimples API responses.

**FastBilling**
The billing coordination workflow within the Umana Operations Platform. FastBilling manages the collection, validation, and archival of supplier invoices (NF, ND, fatura) against approved budget lines. It tracks the lifecycle from approved quote to received and archived invoice.

---

## Supplier Data Terms

**FORNECEDORES_MASTER**
The tab in BaseDados containing the registry of all suppliers. Each row represents one legal entity (supplier), identified by CNPJ, with fields for company name (razão social), trade name (nome fantasia), category, active/inactive flag, and compliance status summary. "Fornecedores" is Portuguese for "suppliers." "Master" indicates it is the authoritative source.

**FORNECEDOR_CONTATOS**
The tab in BaseDados containing contact person records for suppliers. Each row represents one contact at a supplier company, linked to the supplier by CNPJ. Fields include: contact name, email address, phone, role/title, contact source, confirmation status, and whether this contact is designated as the preferred FastQuotes contact for this supplier. "Contatos" is Portuguese for "contacts."

**fornecedor**
Portuguese for "supplier." Refers to any external company or individual providing goods or services for an Umana event job. Suppliers are identified by CNPJ (for legal entities) or CPF (for individuals). All suppliers must pass compliance checks before receiving payment.

**produtora**
Portuguese for "production company." Refers to Umana itself in the context of event production contracts. When a contract specifies a "tomador" and an "emitente," Umana typically acts as the tomador (service receiver).

**cliente**
Portuguese for "client." The corporation or individual who has hired Umana to produce their event. Clients are distinct from suppliers — suppliers provide services to Umana for the event, while clients are the end customer paying Umana.

**contato preferencial FastQuotes**
"Preferred FastQuotes contact" — the single contact record at a supplier that is flagged as the designated recipient for FastQuotes email outreach. When a FastQuote batch is generated for a supplier, the system uses this contact's email address. A supplier may have multiple contacts but only one preferential FastQuotes contact at a time.

---

## Job and Project Terms

**projeto**
Portuguese for "project." Used interchangeably with "job" in some contexts. In the platform, a projeto corresponds to one line in PROJETOS and one event production engagement.

**JOB_ID**
The unique identifier assigned to each event job in the Umana Operations Platform. Format: `UJ-{sequential-line-number}-{timestamp}`. Example: `UJ-042-20240315`. The JOB_ID is the primary key used across all systems to correlate records from PROJETOS, FastQuotes, MasterInterna, Drive folders, and billing records. The JOB_ID must be treated as a string, never a number.

**briefing**
The initial specification document provided by the client describing the event: objectives, audience, date, location, format, approximate budget, and requirements. The briefing is the input that drives FastQuote category selection and supplier outreach scope.

**orçamento**
Portuguese for "budget" or "quotation." In the context of FastQuotes, an orçamento is the quote received from a supplier in response to a FastQuote request. In the context of project financials, orçamento refers to the approved budget for the event. Context determines which meaning applies.

**proposta**
Portuguese for "proposal." A formal document sent by a supplier in response to a FastQuote request, typically a PDF attachment containing pricing, scope description, payment terms, and validity dates. The platform uses Claude API to extract structured data from propostas.

**centro de custo**
Portuguese for "cost center." A financial classification code applied to billing lines to attribute costs to specific organizational units or budget categories within the client's accounting system. Umana collects centro de custo codes from clients and applies them to all invoices issued.

---

## Financial and Compliance Terms

**CNPJ**
*Cadastro Nacional da Pessoa Jurídica* — the Brazilian federal tax registration number for legal entities (companies). Format: `XX.XXX.XXX/XXXX-XX` (14 digits). CNPJ is the primary identifier for all suppliers in BaseDados. **Critical rule: CNPJ must always be stored as a text/string field, never as a numeric value. Leading zeros are significant and must be preserved.**

**CPF**
*Cadastro de Pessoas Físicas* — the Brazilian federal tax registration number for individuals. Format: `XXX.XXX.XXX-XX` (11 digits). Used for individual suppliers (autonomous professionals) rather than companies.

**CND**
*Certidão Negativa de Débitos* — a certificate issued by Brazilian federal, state, or municipal tax authorities certifying that a company has no outstanding tax debts. CNDs are required by Umana's compliance policy before making payments to suppliers. The platform queries CNDs via the Infosimples API. Types include: CND Federal (Receita Federal), CND INSS, CND FGTS, and CND Trabalhista (labor courts).

**NF / Nota Fiscal**
*Nota Fiscal* — the official Brazilian fiscal invoice document issued by a supplier to Umana for services rendered. The NF is a legally required document for all B2B transactions and contains the supplier's CNPJ, Umana's CNPJ, service description, value, tax deductions, and the nota fiscal number. Required for payment processing. Also abbreviated as NF-e (electronic nota fiscal).

**ND / Nota de Débito**
*Nota de Débito* — a debit note, used when a supplier needs to adjust a previously issued invoice or record a charge that does not require a full nota fiscal. Less common than NF but used in specific supplier relationships.

**fatura**
Portuguese for "invoice" or "bill." A fatura is a billing document issued by a supplier requesting payment, often accompanying or referencing a Nota Fiscal. In some contexts, "fatura" refers to the combined billing package (NF + boleto) sent by a supplier.

**boleto**
*Boleto bancário* — the Brazilian standard payment slip used for bank transfers. Suppliers send boletos to Umana along with their NF/fatura to request payment. Boletos have a specific due date and bar code for bank payment processing. In the Umana system, the BOLETOS E NOTAS Drive folder stores received boletos per job.

**tomador**
Portuguese for "service receiver" or "taker." In a service contract, the tomador is the party receiving the service — typically Umana when engaging suppliers. The tomador is responsible for withholding applicable service taxes (ISS, IR, PIS, COFINS, CSLL) at payment time.

**emitente**
Portuguese for "issuer." In a service contract or nota fiscal, the emitente is the party issuing the document — typically the supplier issuing the NF to Umana.

**retenções**
Portuguese for "withholdings" or "tax retentions." The taxes that the tomador (Umana) is legally required to withhold from supplier payments and remit directly to the government. Common retenções in Brazilian service contracts include: ISS (municipal services tax), IR (income tax), PIS, COFINS, CSLL (federal social contributions). The platform must calculate and display retenções correctly on billing records.

**valor líquido**
Portuguese for "net value." The amount actually paid to the supplier after all applicable retenções are deducted from the gross value (valor bruto). `valor_liquido = valor_bruto - retenções`.

**compliance**
In the Umana context, compliance refers specifically to the supplier compliance process: verifying that a supplier has valid, current CNDs (certidões negativas de débitos) before Umana makes any payment to them. A supplier is "compliant" (or "regular") when all required CNDs are valid and not expired. A supplier is "non-compliant" (or "irregular") when any required CND is missing, expired, or shows outstanding debts.

**revalidação**
Portuguese for "revalidation." The process of re-querying a supplier's CND status when their previously recorded compliance status has expired or is approaching expiry. The platform manages revalidation campaigns: identifying suppliers whose CNDs are expiring, sending automated revalidation requests, and updating compliance status based on new Infosimples results.

**Infosimples**
A third-party Brazilian data broker service that provides API access to official government databases including Receita Federal (federal tax registry), CND systems, CNPJ registry, and other public records. Umana uses Infosimples to programmatically query CND status for suppliers without requiring manual access to each government portal.

**código 611**
A specific Infosimples response code meaning "sem emissão de certidão online" — the government system does not issue the certificate online for this CNPJ; the certificate must be obtained in person at a government office. **Critical rule: Code 611 is NOT a debt accusation and must NOT be treated as irregular or blocking. It means the system cannot issue online, not that the company has debts. This distinction is legally and operationally critical.**

---

## Drive Folder Structure Terms

**ORCAMENTOS**
Drive folder category for storing received supplier proposals (orçamentos) and FastQuote response documents per job. "Orçamentos" is Portuguese for "quotes/budgets."

**BOLETOS E NOTAS**
Drive folder category for storing received boletos (payment slips) and notas fiscais (fiscal invoices) per job.

**CONTRATOS E CARTAS**
Drive folder category for storing signed contracts and formal letters per job. "Contratos" = contracts, "Cartas" = letters.

**FICHA CADASTRAL E DOCS**
Drive folder category for storing supplier registration forms (fichas cadastrais) and supporting compliance documents (CNDs, CNPJ cards) per supplier. "Ficha cadastral" = registration form/card.

---

## FastQuote Statuses

These are the valid status values for a FastQuote line (an individual supplier quote request within a batch). Status transitions are governed by the FastQuote State Machine. Status values are stored as uppercase strings.

**RASCUNHO**
Portuguese for "draft." The initial status of a FastQuote line when it has been created but not yet reviewed or approved for sending. The AI-generated email content exists but has not been dispatched. Operators can edit, regenerate, or cancel from this status.

**AGUARDANDO ENVIO**
Portuguese for "awaiting sending." The FastQuote line has been approved by an operator and is queued for dispatch. The system will pick it up in the next dispatch cycle.

**ENVIADO**
Portuguese for "sent." The FastQuote email has been successfully dispatched to the supplier contact. The system is now monitoring for a reply. This is a protected status — the return deadline cannot be changed after reaching ENVIADO.

**EM CONTATO**
Portuguese for "in contact." The supplier has been contacted and is in active communication with the Umana team. This may indicate a phone call, WhatsApp conversation, or email exchange that was initiated outside the platform's automated flow but tracked here.

**RECEBIDO**
Portuguese for "received." A supplier response (quote/proposal) has been received and successfully extracted by the platform. The proposal data has been processed and is available for review. This is a protected status.

**REENVIAR COTAÇÃO**
Portuguese for "resend quotation." Indicates that the original FastQuote email needs to be resent — either because the supplier did not respond within the deadline, the email bounced, or the supplier requested a corrected version. From this status, the system can generate a new send attempt.

**CANCELADO**
Portuguese for "cancelled." The FastQuote line has been cancelled and will not be sent or processed further. This is a protected status — once cancelled, the line cannot be reactivated without explicit intervention.

**ERRO**
Portuguese for "error." The email dispatch or quote processing encountered an unrecoverable error. The line requires operator review to determine corrective action.

**PRECISA REGENERAR**
Portuguese for "needs regeneration." The AI-generated email content for this line is stale, incorrect, or was generated with outdated parameters, and must be regenerated before the line can proceed to AGUARDANDO ENVIO.

---

## FastQuote Categories

These are the defined service categories used to classify FastQuote requests. Category determines which supplier segment receives outreach for a given job line item. Categories are stored as exact strings matching this list.

| Category Code | Description |
|--------------|-------------|
| **A&B** | Alimentos e Bebidas — food and beverage services for events |
| **ARTÍSTICO PALESTRAS & MC** | Artistic performances, keynote speakers, and master of ceremonies |
| **ATIVAÇÃO TEAM BUILDING DINÂMICAS & TREINAMENTO** | Team building activities, group dynamics, and training programs |
| **CENOGRAFIA** | Set design and scenography — physical event environment construction and decoration |
| **FORNECEDOR GRÁFICO E BRINDES** | Graphic production (signage, banners, printed materials) and branded gifts/merchandise |
| **HOSPEDAGEM** | Hotel accommodation and lodging for event attendees or production team |
| **LOCAÇÃO DE ESPAÇO** | Venue rental — the physical space where the event takes place |
| **LOCAÇÃO MOBILIÁRIO** | Furniture rental — tables, chairs, lounge furniture, staging furniture |
| **LOCAÇÃO TÉCNICA E EQUIPAMENTOS** | Technical equipment rental — audio/visual, lighting, staging equipment |
| **LOGÍSTICA AÉREA TERRESTRE E TRANSFER** | Air travel, ground transportation, and airport/venue transfer services |
| **LOGÍSTICA CARGA** | Freight and cargo logistics — shipping event materials and equipment |
| **PRODUÇÃO MASTER OU EXECUTIVA** | Senior production direction — overall event production management contractor |
| **TIME DE PRODUÇÃO APOIO CAMPO** | Field production support team — on-site coordination and execution staff |
| **DIREÇÃO ARTÍSTICA** | Artistic direction — creative direction for the event experience |
| **DIREÇÃO TÉCNICA** | Technical direction — coordination of all technical elements |
| **SEGURO** | Insurance — event liability and cancellation insurance |
| **TRADUÇÃO SIMULTÂNEA** | Simultaneous interpretation services for multilingual events |
| **RESTAURANTE** | Restaurant services — off-site dining experiences for event guests |
| **OUTROS** | Others — any category not covered by the above classifications |

---

## Event Types

These are the defined event type classifications used in PROJETOS and in FastQuote briefings. Event type influences the template structure of the AI-generated outreach and the applicable category mix.

| Event Type Code | Portuguese Name | Description |
|----------------|----------------|-------------|
| **CONVENCAO_VENDAS** | Convenção de Vendas | Annual national sales convention — typically large-scale, multi-day, with significant A/V and content production |
| **STAND_CONGRESSO** | Stand em Congresso | Exhibition stand at an industry congress or trade show |
| **TREINAMENTO** | Treinamento | Training program or workshop — may be in-person or hybrid |
| **JANTAR_PREMIACAO** | Jantar de Premiação | Award dinner — gala format with premium A&B and decor |
| **CONFRATERNIZACAO** | Confraternização | Team celebration or company party event |
| **LANCAMENTO** | Lançamento | Product or service launch event |
| **EVENTO_RESIDENCIAL** | Evento Residencial | Residential event — multi-day event with integrated hotel accommodations |
| **CORPORATIVO_GERAL** | Corporativo Geral | General corporate event not classified in other types |
| **MINI_MEETING** | Mini Meeting | Small-scale meeting or workshop, typically under 30 people |

---

## System Concepts

**AIGenerationRun**
A record of a single invocation of the Claude API for generating or extracting content within the platform. Tracks: input prompt, model used, token counts, output, timestamp, and the FastQuote line or proposal it was associated with.

**IdempotencyKey**
A unique string generated before executing an operation that may have side effects (email send, CND query, Drive write). Used to detect and skip duplicate executions. Must be stored persistently before the operation and cleared only on confirmed success.

**BackgroundJob**
A queued unit of work managed by the job queue system (BullMQ in the target architecture). Represents asynchronous operations like email dispatch batches, CND consultation runs, and billing line processing.

**IntegrationRun**
A record of a single execution of an external integration (Infosimples query, Gmail monitoring cycle, Drive folder scan). Used for audit, debugging, and idempotency tracking.

**AuditEvent**
An immutable record of a state-changing action in the platform. Contains: who, what, when, which entity, previous state, new state, and reason/trigger. The audit log is append-only and must never be modified or deleted.
