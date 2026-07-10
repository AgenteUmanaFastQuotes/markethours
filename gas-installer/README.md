# Market Hours — GitHub → Google Apps Script Installer

This installer updates the Market Hours dashboard directly from GitHub into a Google Apps Script project without manual copy/paste.

## What it manages

Current mapping:

```text
GitHub                         Google Apps Script
scripts/index.html      →      index [HTML]
```

All other files already present in the target Apps Script project are preserved automatically, including:

- `Code.gs`
- `appsscript.json`
- the installer itself
- any other local unmanaged `.gs` or `.html` files

The installer refuses to perform a live install if it cannot read the current Apps Script project content first. This prevents `projects.updateContent` from accidentally deleting unmanaged local files.

## Hard prerequisites

The installer now blocks every public operation unless both requirements are satisfied:

1. the two required OAuth scopes are authorized;
2. Script Property `GITHUB_TOKEN` exists and is not empty.

This applies to all three public functions:

```javascript
CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS()
DRY_RUN_MARKET_HOURS_GAS_INSTALL()
INSTALL_MARKET_HOURS_FROM_GITHUB()
```

## 1. Required OAuth scopes

Before the first run, the Apps Script project's `appsscript.json` must include:

```text
https://www.googleapis.com/auth/script.projects
https://www.googleapis.com/auth/script.external_request
```

Example manifest:

```json
{
  "timeZone": "America/Sao_Paulo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

If the project already has other operational scopes, keep them and add these two. Do not replace the existing scope list blindly.

Every public installer entry point calls:

```javascript
ScriptApp.requireScopes(
  ScriptApp.AuthMode.FULL,
  MARKET_HOURS_GAS_REQUIRED_SCOPES_
);
```

Therefore:

```text
missing scope consent
→ execution stops immediately
→ authorization is requested from the Apps Script IDE
→ no GitHub fetch occurs
→ no Apps Script API call occurs
```

The installer only continues after both required consents are available.

## 2. Required GitHub token

Create this Script Property in **Project Settings → Script Properties**:

```text
GITHUB_TOKEN = <your GitHub personal access token>
```

`GITHUB_TOKEN` is mandatory even though the repository is public. The installer intentionally uses the same authenticated operational pattern as the other GitHub → Apps Script installers.

Behavior:

```text
GITHUB_TOKEN missing or empty
→ hard error immediately
→ CHECK blocked
→ DRY_RUN blocked
→ INSTALL blocked
```

The token value is never written to logs or returned in installer results.

## One-time setup

1. Open the target Google Apps Script project.
2. Create a file named `InstallFromGitHub.gs`.
3. Copy the full contents of `gas-installer/InstallFromGitHub.gs` into that file.
4. Add the two required OAuth scopes to `appsscript.json`.
5. Add Script Property `GITHUB_TOKEN`.
6. Run `CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS()`.
7. Run `DRY_RUN_MARKET_HOURS_GAS_INSTALL()`.
8. Only after reviewing the dry run, execute `INSTALL_MARKET_HOURS_FROM_GITHUB()`.

## Target project

By default, the installer targets the same Apps Script project in which it is running.

To target another Apps Script project, add this Script Property:

```text
MARKET_HOURS_TARGET_SCRIPT_ID = <target Apps Script Script ID>
```

## Optional branch override

Default source branch:

```text
main
```

To test another branch, set:

```text
MARKET_HOURS_GITHUB_BRANCH = feature/my-branch
```

## Recommended workflow

### 1. Check access

Run:

```javascript
CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS()
```

This function first validates required scope consent and the required GitHub token, then verifies:

- the target Apps Script project can be read;
- the configured GitHub branch can be read;
- all managed source files can be fetched.

Successful output includes:

```text
requiredScopesValidated: true
githubTokenConfigured: true
currentProjectReadable: true
```

### 2. Dry run

Run:

```javascript
DRY_RUN_MARKET_HOURS_GAS_INSTALL()
```

The dry run logs:

- repository and branch;
- target Script ID;
- validated OAuth scopes;
- confirmation that `GITHUB_TOKEN` is configured, without exposing its value;
- managed GitHub files;
- whether each managed file changed;
- GitHub blob SHA;
- all unmanaged local Apps Script files that will be preserved;
- final payload size.

No project content is written.

### 3. Install

Run:

```javascript
INSTALL_MARKET_HOURS_FROM_GITHUB()
```

The installer:

1. validates OAuth scope consent with `ScriptApp.requireScopes(...)`;
2. requires Script Property `GITHUB_TOKEN`;
3. reads the current Apps Script project with `GET /projects/{scriptId}/content`;
4. fetches `scripts/index.html` from GitHub with authenticated GitHub API access;
5. maps it to Apps Script file `index [HTML]`;
6. preserves every unmanaged current project file;
7. compares current and GitHub source;
8. skips the update entirely when there is no managed change;
9. otherwise sends one safe `PUT /projects/{scriptId}/content` payload.

## Safety properties

- Scope consent is checked before any external operation.
- `GITHUB_TOKEN` is mandatory.
- Live install is blocked if the current Apps Script project cannot be read.
- Unmanaged local files are preserved.
- The Apps Script manifest is preserved because it is not managed by this installer.
- Existing web app configuration remains untouched unless it already lives inside a managed file, which it currently does not.
- No deployment is created, changed or deleted.
- No GitHub write operation is performed.
- If `index` is unchanged, the installer does not call `updateContent`.

## Adding future GAS files

Edit `managedFiles` inside `InstallFromGitHub.gs`:

```javascript
managedFiles: [
  {
    githubPath: 'scripts/index.html',
    scriptName: 'index',
    scriptType: 'HTML'
  },
  {
    githubPath: 'gas/Code.gs',
    scriptName: 'Code',
    scriptType: 'SERVER_JS'
  }
]
```

Supported Apps Script types:

```text
HTML
SERVER_JS
JSON
```

## Important distinction: install vs deployment

This installer updates Apps Script project content. It does not create a new web app deployment or update an existing deployment version.

For a web app deployed from a fixed version, publish a new version/update the deployment after installation when required by the project's deployment model.
