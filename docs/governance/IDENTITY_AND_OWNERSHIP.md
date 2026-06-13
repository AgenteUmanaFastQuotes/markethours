# Identity and Ownership Governance — Umana Operations Platform

## Document Purpose

This document establishes the identity and ownership governance rules for the Umana Operations Platform. It defines who owns what, why the current state is a risk, what the target state is, and how to get there. It is a living document that must be updated whenever ownership of any system component changes.

**This is a governance document, not a technical guide. All technical personnel, including external contractors, who have access to any Umana system component must read and acknowledge this document.**

**Last updated**: 2026-06-13  
**Document owner**: preproducao@umana.ag  
**Review schedule**: Quarterly (next review: 2026-09-13)

---

## Why `preproducao@umana.ag` Is the System Master Account

`preproducao@umana.ag` is the designated system master account for the Umana Operations Platform. This account is:

- A **Google Workspace organizational account** under the `umana.ag` domain, not a personal account.
- Owned by **Umana as an organization**, not by any individual. If the individual currently managing this account leaves Umana, the account remains with the organization and can be managed by another authorized administrator.
- The target owner of all system components: GAS scripts, Web App deployments, Drive folders, spreadsheets, API credentials, triggers, and service configurations.
- The identity under which all automated workflows execute (email sending, CND queries, Drive writes, background jobs).

An organizational account under `umana.ag` provides:
- Continuity of service regardless of individual personnel changes.
- Organizational control over the account's lifecycle (administrators can reset passwords, manage 2FA, transfer ownership).
- Clear separation between personal use and system operation.
- Compliance with Google Workspace policies for business accounts.
- Billing and usage attribution to the organization, not to an individual.

---

## Why `daniel.valin@thanks.ag` Must NOT Be a Production Dependency

`daniel.valin@thanks.ag` is the personal work account of an individual at Grupo Thanks. The current Umana Operations Platform depends on this account as the owner, deployer, and executor of virtually all system components. This is architecturally and operationally unacceptable for the following reasons:

**1. Single point of failure for the entire organization's operations**

If `daniel.valin@thanks.ag` becomes unavailable — for any reason (vacation, illness, resignation, account lock, Google Workspace license removal, domain migration) — the entire Umana production operation halts. Every automated workflow, every dashboard, every email send, every CND check, every billing operation stops. There is no fallback.

**2. No organizational control over account lifecycle**

Umana cannot independently manage `daniel.valin@thanks.ag`. It belongs to a `thanks.ag` domain that is a different organizational entity from `umana.ag`. Umana cannot:
- Reset the account's password if locked out.
- Manage the account's 2FA settings.
- Transfer script ownership without the account holder's active participation.
- Revoke the account's access to Umana systems if the working relationship ends adversarially.

**3. Personal liability and audit confusion**

All API calls, all Gmail sends, all Drive writes attributed to `daniel.valin@thanks.ag` are personally attributed to one individual. Billing for Anthropic API, Infosimples queries, and other metered services is under a personal or personal-org account, not under Umana's organizational billing. Audit records (where they exist) attribute operational actions to one person even when those actions are automated.

**4. Cross-domain trust complexity**

`thanks.ag` and `umana.ag` are different Google Workspace domains. Files, folders, and scripts owned by `thanks.ag` accounts have different sharing rules, permissions inheritance, and administrative boundaries than `umana.ag` accounts. This creates silent permission failures and unexpected access restrictions.

**Hard rule, stated explicitly**: The Umana Operations Platform system must be fully and completely operable if `daniel.valin@thanks.ag` is unavailable, suspended, or has left the organization permanently. Any component that fails this test is a critical risk item requiring immediate remediation. This rule overrides all convenience arguments about maintaining the status quo.

---

## Component Ownership Inventory

Current state and target state for all system components. This table must be updated whenever an ownership transfer is completed.

| Component | Current Owner | Current Owner Account Type | Target Owner | Transfer Priority | Risk Level | Transfer Status |
|-----------|--------------|--------------------------|-------------|------------------|------------|-----------------|
| AgenteUmanaFastQuotes (GAS Library) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | CRITICAL | Pending |
| Dashboard FastQuotes Ops (Web App deployment) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | CRITICAL | Pending |
| DashboardCompliance (Web App deployment) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | HIGH | Pending |
| GAS time-based triggers (monitoring, CND, billing) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | CRITICAL | Pending |
| Gmail sending identity (GmailApp) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | CRITICAL | Pending |
| Gmail label structure for monitoring | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | HIGH | Pending |
| BaseDados spreadsheet (OWNER) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | HIGH | Pending |
| REDUX/PROJETOS spreadsheet (OWNER or Editor) | daniel.valin@thanks.ag + team | Mixed / thanks.ag + umana.ag | preproducao@umana.ag | HIGH | HIGH | Pending |
| Drive root folder (Umana jobs hierarchy) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | CRITICAL | HIGH | Pending |
| Drive sub-folders (per-job: ORCAMENTOS, etc.) | daniel.valin@thanks.ag | Personal work / thanks.ag | preproducao@umana.ag | HIGH | MEDIUM | Pending |
| PropertiesService (ScriptProperties) | daniel.valin@thanks.ag | Script owner | preproducao@umana.ag (new script owner) | CRITICAL | HIGH | Pending |
| Anthropic API key | Personal Anthropic account | Personal | umana.ag org Anthropic account | HIGH | HIGH | Pending |
| Anthropic API billing | Personal account | Personal | umana.ag organizational billing | HIGH | MEDIUM | Pending |
| Infosimples API key | Account associated with daniel.valin | Personal/thanks.ag | preproducao@umana.ag account | HIGH | HIGH | Pending |
| Infosimples API billing | Account associated with daniel.valin | Personal/thanks.ag | umana.ag organizational billing | HIGH | MEDIUM | Pending |
| MasterInterna template | Umana team / daniel.valin@thanks.ag | Mixed | preproducao@umana.ag | LOW | LOW | Pending |

### Transfer Status Values

- **Pending**: Not yet started
- **In Progress**: Transfer process initiated but not complete
- **Completed**: Transfer verified and validated
- **Blocked**: Transfer pending resolution of a blocker (document blocker inline)

---

## Dependency Classification

Understanding the nature of each dependency helps prioritize and plan transfers correctly.

| Dependency Type | Description | Risk if Not Transferred | Transfer Method |
|----------------|-------------|------------------------|-----------------|
| **Script owner** | The Google account that owns a GAS script project | Script cannot be edited, deployed, or triggered by others | Re-create script under new account; migrate all properties manually |
| **Trigger installer** | The account under whose OAuth context GAS triggers fire | Triggers stop firing if account is unavailable or has revoked OAuth | Re-install triggers from new account after script ownership transfer |
| **Web App deployment owner** | The account that deployed a GAS Web App | Web App becomes inaccessible | Redeploy Web App from new owner account |
| **Script executor** | The account whose identity is used for "Execute as: Me" Web Apps | All Drive/Gmail/Sheets operations performed as this account | Redeploy as new account |
| **Spreadsheet owner** | The Google account that owns a Sheets file | Write access may be restricted; cannot be transferred if account is gone | Use Google Drive ownership transfer API; or create new spreadsheet and migrate data |
| **Drive folder owner** | The Google account that owns a Drive folder | Folder may become inaccessible; write permissions affected | Use Drive ownership transfer; or recreate folder under new account and copy contents |
| **API credential owner** | The account under which an API key or OAuth credential is registered | API calls fail or are billed to wrong account | Create new credentials under org account; rotate key in all consuming systems |
| **Billing/API account owner** | The billing account for metered APIs (Anthropic, Infosimples) | Charges go to personal account; access may be revoked | Create org-level billing account; migrate subscription and regenerate keys |

---

## Ownership Transfer Runbook

This runbook provides step-by-step instructions for transferring operational ownership from `daniel.valin@thanks.ag` to `preproducao@umana.ag`.

### Prerequisites

Before starting any transfer:
1. Confirm `preproducao@umana.ag` is a licensed Google Workspace user with access to Google Drive, Sheets, Gmail, and Apps Script.
2. Confirm `preproducao@umana.ag` has admin access or sufficient permissions in the relevant Workspace domain.
3. Document the current state of all components in the inventory table above.
4. Schedule a maintenance window where operational impact can be monitored.

### Step 1: Transfer Spreadsheet Ownership

For each spreadsheet (BaseDados, REDUX/PROJETOS):
1. Open the spreadsheet as `daniel.valin@thanks.ag`.
2. Click Share → Manage access → Change owner to `preproducao@umana.ag`.
3. Confirm transfer. Note: Google requires the new owner to accept the transfer via email notification.
4. After transfer, verify `preproducao@umana.ag` is listed as Owner.
5. Verify all existing editors/viewers still have their access.
6. Update the inventory table.

### Step 2: Transfer Drive Folder Ownership

For each Drive folder in the Umana job hierarchy:
1. Open Google Drive as `daniel.valin@thanks.ag`.
2. Right-click folder → Share → Transfer ownership to `preproducao@umana.ag`.
3. Repeat for all sub-folders (ORCAMENTOS, BOLETOS E NOTAS, CONTRATOS E CARTAS, FICHA CADASTRAL E DOCS folders).
4. Verify by checking folder Details → Owner field.
5. Update the inventory table.

**Note**: Drive ownership transfer must be done folder by folder. For large folder hierarchies, use the Drive Admin SDK's batch transfer capabilities if available.

### Step 3: Re-create GAS Scripts Under New Owner

GAS script ownership cannot be transferred directly — the script must be re-created under the new account:

1. Export all GAS script source files from the existing script project using `clasp pull` or manual copy.
2. Create a new GAS script project in `preproducao@umana.ag`'s account.
3. Copy all source files into the new project.
4. Migrate all ScriptProperties:
   - From old script, export all property keys and values (EXCEPT secrets that will be rotated).
   - Set all properties in the new script using the PropertiesService API or a migration helper script.
5. Rotate all API keys that were stored in the old script:
   - Anthropic API: Generate a new key from the org account; store in new script's ScriptProperties; invalidate old key.
   - Infosimples: Generate a new token from org account; store in new script; invalidate old.
6. Deploy new Web Apps (Dashboard FastQuotes Ops, DashboardCompliance) from the new script project.
7. Record the new Web App deployment URLs and update all bookmarks/links.
8. Install all time-based triggers from `preproducao@umana.ag`'s account in the new script project.
9. Verify triggers appear in `preproducao@umana.ag`'s Apps Script triggers dashboard.

### Step 4: Validate All Workflows

After all transfers:
1. Trigger a test FastQuote batch (with a test supplier — do not send to real suppliers).
2. Verify the email is sent from `preproducao@umana.ag` Gmail identity.
3. Verify the response monitoring trigger fires under `preproducao@umana.ag`.
4. Perform a test CND query via DashboardCompliance.
5. Verify a test Drive folder write succeeds under `preproducao@umana.ag` ownership.
6. Check all Dashboard Web Apps are accessible at their new URLs.
7. Confirm no workflows require `daniel.valin@thanks.ag` at any step.

### Step 5: Remove `daniel.valin@thanks.ag` Access

Only after Step 4 is fully validated:
1. Remove `daniel.valin@thanks.ag` from owner/editor roles on all transferred spreadsheets.
   - Downgrade to "Viewer" if read access is needed for transition reference.
   - Remove entirely once confident migration is complete.
2. Remove `daniel.valin@thanks.ag` from Drive folder editor/owner roles.
3. Confirm the old GAS script project is archived (not deleted — kept as reference).
4. Update the inventory table to reflect completed transfers.

---

## Rollback Access During Transition

During the transfer process, both `daniel.valin@thanks.ag` and `preproducao@umana.ag` must have edit access to all components until validation is complete. This creates a brief period of dual-ownership that is acceptable as a transition state.

**Rollback trigger**: If any workflow fails after transfer, the rollback is to re-add `daniel.valin@thanks.ag` as Owner to the affected component and revert to the pre-transfer state. This must be done within 2 hours of a confirmed failure to minimize operational impact.

**Rollback does not apply** to API key rotation — once a key is rotated and the old key invalidated, the old key cannot be restored. For this reason, API key rotation must be the last step of Step 3 and must be performed with the new key already tested.

---

## Hard Rules Summary

1. **`daniel.valin@thanks.ag` must not be the sole owner of any system component.** Shared ownership (both accounts as Owner) is acceptable as a transition state but must not persist beyond the transfer completion date.

2. **`daniel.valin@thanks.ag` must not be the only account capable of executing any operational workflow.** If removing `daniel.valin@thanks.ag` from a workflow causes that workflow to stop working, the transfer is not complete.

3. **All API keys must be registered under `umana.ag` organizational accounts**, not personal accounts. Keys registered to `daniel.valin@thanks.ag` or personal accounts must be rotated.

4. **All GAS scripts that run operational workflows must be owned by `preproducao@umana.ag`**, with their triggers installed under that account.

5. **The system must pass the `daniel.valin@thanks.ag` unavailability test**: any operator with appropriate role permissions and access to `preproducao@umana.ag` credentials must be able to perform all operational functions without any input from, access to, or knowledge of `daniel.valin@thanks.ag`.

---

## Cross-Domain Dependency Risks

The Umana Operations Platform currently straddles two Google Workspace domains:

| Domain | Organization | Risk |
|--------|-------------|------|
| `thanks.ag` | Grupo Thanks (parent group) | Scripts, data, and credentials owned here have different Workspace admin controls than `umana.ag`. Cross-domain sharing adds permission complexity. |
| `umana.ag` | Umana | Target domain for all system ownership. Workspace admin controls are under Umana's management. |

Key cross-domain risks:
- **Sharing rules**: Google Workspace admins can restrict sharing between domains. If `thanks.ag` admin restricts external sharing, `umana.ag` accounts lose access to `thanks.ag`-owned files and folders.
- **OAuth consent**: OAuth tokens granted by `thanks.ag` accounts to GAS scripts operate under `thanks.ag`'s consent policies. Changes to those policies can silently revoke tokens.
- **Audit separation**: `thanks.ag` domain audit logs (Admin Reports) capture actions by `thanks.ag` accounts, not `umana.ag` accounts. This makes unified audit analysis across the two domains difficult.
- **Organizational separation**: If Grupo Thanks and Umana ever separate as business entities, `thanks.ag` dependencies become assets of Thanks rather than Umana.

**Target state**: Zero operational dependencies on `thanks.ag` domain resources. All system components owned and operated within `umana.ag` domain.

---

## Audit Schedule

Quarterly ownership reviews must be conducted to verify the inventory table is current and all components remain under the correct ownership.

**Review procedure**:
1. Open this document and review the Component Ownership Inventory table.
2. For each component, verify the current owner matches the "Current Owner" column.
3. For components with "Target Owner" still different from "Current Owner", confirm the transfer is in progress and update the "Transfer Status" field.
4. For any component discovered to have drifted back to `daniel.valin@thanks.ag` ownership, initiate immediate re-transfer and document the cause.
5. Update the "Last updated" field at the top of this document.
6. Email a summary of the review to the system owner (preproducao@umana.ag) and the Umana technical lead.

**Next scheduled review**: 2026-09-13

**Review owner**: preproducao@umana.ag

---

## Escalation Path

If any issue arises where `daniel.valin@thanks.ag` must be involved (e.g., recovery from a state that requires the old account), escalate as follows:

1. Document the specific dependency that requires `daniel.valin@thanks.ag`.
2. Notify the Umana production lead and technical lead.
3. Engage `daniel.valin@thanks.ag` for the specific limited action required.
4. Immediately after resolution, implement a permanent fix so this dependency cannot recur.
5. Update this document with the dependency that was found and the permanent fix applied.

Any recurrence of the same dependency being needed twice constitutes a process failure and must be escalated to organization leadership.
