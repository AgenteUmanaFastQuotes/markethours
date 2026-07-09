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

## One-time setup

1. Open the target Google Apps Script project.
2. Create a file named `InstallFromGitHub.gs`.
3. Copy the full contents of `gas-installer/InstallFromGitHub.gs` into that file.
4. Ensure the Apps Script manifest includes these OAuth scopes:

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

If the target project already has other operational scopes, keep them. Add these two; do not replace the existing scope list blindly.

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

## GitHub token

The `markethours` repository is public, so `GITHUB_TOKEN` is optional.

A token can still be added as a Script Property to improve GitHub API rate limits:

```text
GITHUB_TOKEN = <token>
```

## Recommended workflow

### 1. Check access

Run:

```javascript
CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS()
```

This verifies:

- the target Apps Script project can be read;
- the configured GitHub branch can be read;
- all managed source files can be fetched.

### 2. Dry run

Run:

```javascript
DRY_RUN_MARKET_HOURS_GAS_INSTALL()
```

The dry run logs:

- repository and branch;
- target Script ID;
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

1. reads the current Apps Script project with `GET /projects/{scriptId}/content`;
2. fetches `scripts/index.html` from GitHub;
3. maps it to Apps Script file `index [HTML]`;
4. preserves every unmanaged current project file;
5. compares current and GitHub source;
6. skips the update entirely when there is no managed change;
7. otherwise sends one safe `PUT /projects/{scriptId}/content` payload.

## Safety properties

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
