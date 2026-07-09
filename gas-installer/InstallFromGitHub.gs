// ============================================================
// InstallFromGitHub.gs — Market Hours
//
// Browser-only installer: fetches selected files from GitHub and
// safely pushes them into a target Google Apps Script project via
// the Apps Script API while preserving every unmanaged local file.
//
// PRIMARY USE CASE
//   GitHub: scripts/index.html
//   GAS   : index [HTML]
//
// PUBLIC ENTRY POINTS
//   DRY_RUN_MARKET_HOURS_GAS_INSTALL()
//   INSTALL_MARKET_HOURS_FROM_GITHUB()
//   CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS()
//
// OPTIONAL SCRIPT PROPERTIES
//   MARKET_HOURS_TARGET_SCRIPT_ID  — target GAS Script ID.
//                                    If omitted, targets this project.
//   MARKET_HOURS_GITHUB_BRANCH     — branch/ref override. Default: main.
//   GITHUB_TOKEN                   — optional for this public repo;
//                                    useful to increase GitHub API limits.
//
// REQUIRED INSTALLER OAUTH SCOPES
//   https://www.googleapis.com/auth/script.projects
//   https://www.googleapis.com/auth/script.external_request
//
// SAFETY RULE
//   INSTALL is blocked unless GET /projects/{scriptId}/content succeeds.
//   This prevents updateContent from deleting unmanaged local files.
// ============================================================

var MARKET_HOURS_GAS_INSTALLER_CONFIG = {
  githubOwner: 'AgenteUmanaFastQuotes',
  githubRepo: 'markethours',
  defaultBranch: 'main',
  targetScriptIdProperty: 'MARKET_HOURS_TARGET_SCRIPT_ID',
  githubBranchProperty: 'MARKET_HOURS_GITHUB_BRANCH',
  githubTokenProperty: 'GITHUB_TOKEN',
  userAgent: 'MarketHours-GAS-Installer/1.0',

  // GitHub path -> Apps Script file mapping.
  // Add future .gs/.html files here when the GAS app grows.
  managedFiles: [
    {
      githubPath: 'scripts/index.html',
      scriptName: 'index',
      scriptType: 'HTML'
    }
  ]
};

var MARKET_HOURS_GAS_REQUIRED_SCOPES_ = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.external_request'
];

// ── Public entry points ───────────────────────────────────────

function DRY_RUN_MARKET_HOURS_GAS_INSTALL() {
  return runMarketHoursGasInstaller_(true);
}

function INSTALL_MARKET_HOURS_FROM_GITHUB() {
  return runMarketHoursGasInstaller_(false);
}

function CHECK_MARKET_HOURS_GAS_INSTALLER_ACCESS() {
  var cfg = MARKET_HOURS_GAS_INSTALLER_CONFIG;
  var props = PropertiesService.getScriptProperties();
  var scriptId = getMarketHoursTargetScriptId_(cfg, props);
  var branch = props.getProperty(cfg.githubBranchProperty) || cfg.defaultBranch;
  var token = props.getProperty(cfg.githubTokenProperty) || '';

  var current = readAppsScriptProjectContent_(scriptId);
  var githubFiles = fetchManagedGitHubFiles_(cfg, branch, token);

  var result = {
    ok: current.ok && githubFiles.length === cfg.managedFiles.length,
    scriptId: scriptId,
    branch: branch,
    currentProjectReadable: current.ok,
    currentProjectHttpCode: current.httpCode,
    githubFilesFetched: githubFiles.map(function(file) {
      return {
        githubPath: file.githubPath,
        scriptName: file.name,
        scriptType: file.type,
        blobSha: file.blobSha,
        bytes: file.source.length
      };
    })
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ── Main orchestrator ─────────────────────────────────────────

function runMarketHoursGasInstaller_(dryRun) {
  var cfg = MARKET_HOURS_GAS_INSTALLER_CONFIG;
  validateInstallerConfig_(cfg);

  var props = PropertiesService.getScriptProperties();
  var scriptId = getMarketHoursTargetScriptId_(cfg, props);
  var branch = props.getProperty(cfg.githubBranchProperty) || cfg.defaultBranch;
  var githubToken = props.getProperty(cfg.githubTokenProperty) || '';

  Logger.log('══════════════════════════════════════════════');
  Logger.log((dryRun ? 'DRY RUN — ' : '') + 'Market Hours GitHub → GAS Installer');
  Logger.log('Repository    : ' + cfg.githubOwner + '/' + cfg.githubRepo);
  Logger.log('Branch/ref    : ' + branch);
  Logger.log('Target Script : ' + scriptId);
  Logger.log('GitHub token  : ' + (githubToken ? 'configured' : 'not set (public repo mode)'));

  var currentState = readAppsScriptProjectContent_(scriptId);

  if (!currentState.ok) {
    Logger.log('Current GAS   : unreadable — HTTP ' + currentState.httpCode);
    Logger.log('Response      : ' + String(currentState.body || '').slice(0, 300));

    if (!dryRun) {
      throw new Error(
        'INSTALL BLOCKED: cannot read current Apps Script project content (HTTP ' +
        currentState.httpCode + '). updateContent replaces the project file set, so ' +
        'installing without reading current content could delete unmanaged local files. ' +
        'Fix Apps Script API access first, then rerun DRY_RUN.'
      );
    }
  } else {
    Logger.log('Current GAS   : readable (' + currentState.files.length + ' files)');
  }

  var githubFiles = fetchManagedGitHubFiles_(cfg, branch, githubToken);
  validateFetchedManagedFiles_(githubFiles, cfg);

  var currentFiles = currentState.ok ? currentState.files : [];
  var payload = buildSafeMergedPayload_(currentFiles, githubFiles);
  var comparison = compareManagedFiles_(currentFiles, githubFiles);

  Logger.log('');
  Logger.log('Managed GitHub files (' + githubFiles.length + '):');
  githubFiles.forEach(function(file) {
    var cmp = comparison[file.name];
    Logger.log(
      '  ' + file.name + ' [' + file.type + '] ← ' + file.githubPath +
      '  ' + (cmp && cmp.changed ? 'CHANGED' : 'UNCHANGED') +
      '  blob ' + String(file.blobSha || '').slice(0, 12)
    );
  });

  if (currentState.ok) {
    Logger.log('Preserved unmanaged GAS files (' + payload.unmanagedFiles.length + '):');
    if (!payload.unmanagedFiles.length) {
      Logger.log('  (none)');
    } else {
      payload.unmanagedFiles.forEach(function(file) {
        Logger.log('  ' + file.name + ' [' + file.type + ']');
      });
    }
    Logger.log('Final payload : ' + payload.files.length + ' files');
  }

  var changedNames = Object.keys(comparison).filter(function(name) {
    return comparison[name].changed;
  });

  if (dryRun) {
    Logger.log('');
    Logger.log('DRY RUN complete — no project content written.');
    Logger.log('Changed managed files: ' + (changedNames.length ? changedNames.join(', ') : '(none)'));

    return buildInstallerResult_(true, scriptId, branch, currentState, githubFiles, payload, changedNames, null);
  }

  if (!changedNames.length) {
    Logger.log('');
    Logger.log('No managed file changes detected — skipping PUT /content.');
    return buildInstallerResult_(false, scriptId, branch, currentState, githubFiles, payload, changedNames, null);
  }

  Logger.log('');
  Logger.log('Updating Apps Script project safely...');
  var updateResult = pushAppsScriptProjectContent_(scriptId, payload.files);
  Logger.log('✓ Install complete.');
  Logger.log('Editor: ' + updateResult.editorUrl);

  return buildInstallerResult_(false, scriptId, branch, currentState, githubFiles, payload, changedNames, updateResult);
}

function buildInstallerResult_(dryRun, scriptId, branch, currentState, githubFiles, payload, changedNames, updateResult) {
  return {
    ok: true,
    dryRun: dryRun,
    changed: changedNames.length > 0,
    changedManagedFiles: changedNames,
    scriptId: scriptId,
    editorUrl: 'https://script.google.com/d/' + scriptId + '/edit',
    branch: branch,
    currentProjectReadable: currentState.ok,
    currentProjectHttpCode: currentState.httpCode,
    managedFilesCount: githubFiles.length,
    managedFiles: githubFiles.map(function(file) {
      return {
        githubPath: file.githubPath,
        scriptName: file.name,
        scriptType: file.type,
        blobSha: file.blobSha,
        bytes: file.source.length
      };
    }),
    preservedLocalFilesCount: payload.unmanagedFiles.length,
    preservedLocalFiles: payload.unmanagedFiles.map(function(file) {
      return file.name + ' [' + file.type + ']';
    }),
    totalFilesInPayload: payload.files.length,
    updateHttpCode: updateResult ? updateResult.httpCode : null
  };
}

// ── Configuration and validation ──────────────────────────────

function getMarketHoursTargetScriptId_(cfg, props) {
  var propertyValue = props.getProperty(cfg.targetScriptIdProperty) || '';
  var scriptId = propertyValue || ScriptApp.getScriptId();

  if (!scriptId) {
    throw new Error(
      'Cannot determine target Apps Script project. Set Script Property "' +
      cfg.targetScriptIdProperty + '" to the target Script ID.'
    );
  }

  return scriptId;
}

function validateInstallerConfig_(cfg) {
  if (!cfg.githubOwner || !cfg.githubRepo || !cfg.defaultBranch) {
    throw new Error('Installer config is missing githubOwner, githubRepo or defaultBranch.');
  }

  if (!Array.isArray(cfg.managedFiles) || !cfg.managedFiles.length) {
    throw new Error('Installer config must define at least one managedFiles mapping.');
  }

  var seenNames = {};
  var seenPaths = {};

  cfg.managedFiles.forEach(function(file) {
    if (!file.githubPath || !file.scriptName || !file.scriptType) {
      throw new Error('Every managedFiles entry requires githubPath, scriptName and scriptType.');
    }

    if (['HTML', 'SERVER_JS', 'JSON'].indexOf(file.scriptType) === -1) {
      throw new Error('Unsupported Apps Script type for ' + file.githubPath + ': ' + file.scriptType);
    }

    if (seenNames[file.scriptName]) {
      throw new Error('Duplicate Apps Script managed file name: ' + file.scriptName);
    }
    if (seenPaths[file.githubPath]) {
      throw new Error('Duplicate GitHub managed path: ' + file.githubPath);
    }

    seenNames[file.scriptName] = true;
    seenPaths[file.githubPath] = true;
  });
}

function validateFetchedManagedFiles_(files, cfg) {
  if (files.length !== cfg.managedFiles.length) {
    throw new Error(
      'Managed file count mismatch. Expected ' + cfg.managedFiles.length +
      ', fetched ' + files.length + '.'
    );
  }

  files.forEach(function(file) {
    if (!file.source) {
      throw new Error('Fetched empty source for ' + file.githubPath + '.');
    }
  });
}

// ── GitHub ────────────────────────────────────────────────────

function fetchManagedGitHubFiles_(cfg, branch, token) {
  return cfg.managedFiles.map(function(mapping) {
    var encodedPath = mapping.githubPath.split('/').map(encodeURIComponent).join('/');
    var url = 'https://api.github.com/repos/' +
      encodeURIComponent(cfg.githubOwner) + '/' +
      encodeURIComponent(cfg.githubRepo) +
      '/contents/' + encodedPath +
      '?ref=' + encodeURIComponent(branch);

    var response = marketHoursGithubFetch_(url, token, cfg.userAgent);
    var code = response.getResponseCode();

    if (code !== 200) {
      throw new Error(
        'GitHub fetch failed for ' + mapping.githubPath + ' (HTTP ' + code + '): ' +
        response.getContentText().slice(0, 500)
      );
    }

    var data = JSON.parse(response.getContentText());
    if (data.encoding !== 'base64' || !data.content) {
      throw new Error(
        'Unexpected GitHub Contents API response for ' + mapping.githubPath +
        '. Expected base64 content.'
      );
    }

    var decoded = Utilities.base64Decode(String(data.content).replace(/\n/g, ''));
    var source = Utilities.newBlob(decoded).getDataAsString('UTF-8');

    return {
      githubPath: mapping.githubPath,
      name: mapping.scriptName,
      type: mapping.scriptType,
      source: source,
      blobSha: data.sha || null
    };
  });
}

function marketHoursGithubFetch_(url, token, userAgent) {
  var headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': userAgent || 'MarketHours-GAS-Installer/1.0'
  };

  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  return UrlFetchApp.fetch(url, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });
}

// ── Apps Script API ───────────────────────────────────────────

function readAppsScriptProjectContent_(scriptId) {
  var url = 'https://script.googleapis.com/v1/projects/' +
    encodeURIComponent(scriptId) + '/content';
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();

  if (code !== 200) {
    return {
      ok: false,
      httpCode: code,
      body: response.getContentText(),
      files: []
    };
  }

  var data = JSON.parse(response.getContentText());
  return {
    ok: true,
    httpCode: code,
    body: response.getContentText(),
    files: Array.isArray(data.files) ? data.files : []
  };
}

function pushAppsScriptProjectContent_(scriptId, files) {
  var url = 'https://script.googleapis.com/v1/projects/' +
    encodeURIComponent(scriptId) + '/content';
  var token = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ files: files }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error(
      'Apps Script API updateContent failed (HTTP ' + code + '): ' +
      response.getContentText().slice(0, 700)
    );
  }

  return {
    ok: true,
    httpCode: code,
    editorUrl: 'https://script.google.com/d/' + scriptId + '/edit'
  };
}

// ── Safe merge and comparison ─────────────────────────────────

function buildSafeMergedPayload_(currentFiles, managedGithubFiles) {
  var managedNames = {};
  managedGithubFiles.forEach(function(file) {
    managedNames[file.name] = true;
  });

  var unmanagedFiles = (currentFiles || [])
    .filter(function(file) {
      return !managedNames[file.name];
    })
    .map(cloneAppsScriptFile_);

  var managedFiles = managedGithubFiles.map(function(file) {
    return {
      name: file.name,
      type: file.type,
      source: file.source
    };
  });

  return {
    files: managedFiles.concat(unmanagedFiles),
    managedFiles: managedFiles,
    unmanagedFiles: unmanagedFiles
  };
}

function cloneAppsScriptFile_(file) {
  return {
    name: file.name,
    type: file.type,
    source: file.source
  };
}

function compareManagedFiles_(currentFiles, managedGithubFiles) {
  var currentByName = {};
  (currentFiles || []).forEach(function(file) {
    currentByName[file.name] = file;
  });

  var result = {};
  managedGithubFiles.forEach(function(file) {
    var current = currentByName[file.name] || null;
    var currentSource = current ? String(current.source || '') : null;
    var source = String(file.source || '');

    result[file.name] = {
      exists: !!current,
      changed: !current || current.type !== file.type || currentSource !== source,
      currentSha256: current ? sha256Hex_(currentSource) : null,
      githubSha256: sha256Hex_(source)
    };
  });

  return result;
}

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );

  return bytes.map(function(value) {
    var normalized = value < 0 ? value + 256 : value;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}
