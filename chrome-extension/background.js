// Chrome MV3 background entrypoint.
// Keeps the original scheduling/gong engine and adds an independent,
// direct notification path that does not depend on overriding functions
// declared inside service-worker.js.

importScripts("service-worker.js");

const DIRECT_OPEN_ALARM_PREFIX = "market-open|";
const DIRECT_NOTIFICATION_ICON_URL = chrome.runtime.getURL("icons/market-hours-128.png");
const DIRECT_HANDLED_RETENTION_MS = 72 * 60 * 60 * 1000;
const DIRECT_CATCH_UP_GRACE_MS = 60 * 1000;

function pruneDirectNotificationHandled(records, nowMs = Date.now()) {
  const output = {};

  for (const [sessionKey, record] of Object.entries(records || {})) {
    const timestamp = Number(record && record.at) || 0;
    if (timestamp && nowMs - timestamp <= DIRECT_HANDLED_RETENTION_MS) {
      output[sessionKey] = record;
    }
  }

  return output;
}

async function persistDirectNotificationDiagnostic(diagnostic) {
  const stored = await chrome.storage.local.get("scheduleStatus");
  const scheduleStatus = {
    ...(stored.scheduleStatus || {}),
    lastDirectNotification: diagnostic,
    lastAlertAt: diagnostic.at
  };

  if (!diagnostic.ok) {
    scheduleStatus.lastError = `[NOTIFICATION] ${diagnostic.displayName || diagnostic.marketName || "Market"}: ${diagnostic.error || diagnostic.reason || "unknown failure"}`;
  } else if (String(scheduleStatus.lastError || "").startsWith("[NOTIFICATION]")) {
    scheduleStatus.lastError = null;
  }

  await chrome.storage.local.set({
    lastDirectNotification: diagnostic,
    scheduleStatus
  });
}

async function createDirectOpeningNotification(opening, settings) {
  const notificationId = `market-open:${opening.sessionKey}`;

  const createdId = await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: DIRECT_NOTIFICATION_ICON_URL,
    title: "MARKET HOURS",
    message: `${opening.displayName} acabou de abrir`,
    contextMessage: `${opening.label} • ${opening.localOpen.slice(0, 5)} local`,
    eventTime: opening.openTimestamp,
    priority: 2,
    requireInteraction: Boolean(settings.requireInteraction),
    silent: true
  });

  const activeNotifications = await chrome.notifications.getAll();

  return {
    notificationId: createdId,
    activeInChrome: Boolean(activeNotifications[createdId])
  };
}

async function handleDirectOpeningNotification(opening, source = "alarm-direct") {
  if (!opening || !opening.sessionKey) {
    return { ok: false, reason: "invalid-opening" };
  }

  const nowMs = Date.now();
  const stored = await chrome.storage.local.get([
    "settings",
    "directNotificationHandled"
  ]);

  const settings = {
    notificationsEnabled: true,
    requireInteraction: false,
    ...(stored.settings || {})
  };

  if (!settings.notificationsEnabled) {
    return { ok: true, skipped: true, reason: "notifications-disabled" };
  }

  const handled = pruneDirectNotificationHandled(
    stored.directNotificationHandled || {},
    nowMs
  );

  if (handled[opening.sessionKey]) {
    return { ok: true, skipped: true, reason: "already-handled" };
  }

  try {
    const created = await createDirectOpeningNotification(opening, settings);

    handled[opening.sessionKey] = {
      at: nowMs,
      notificationId: created.notificationId,
      activeInChrome: created.activeInChrome
    };

    const diagnostic = {
      at: new Date(nowMs).toISOString(),
      source,
      sessionKey: opening.sessionKey,
      marketName: opening.marketName || null,
      displayName: opening.displayName || opening.marketName || null,
      localOpen: opening.localOpen || null,
      openTimestamp: opening.openTimestamp || null,
      ok: true,
      notificationId: created.notificationId,
      activeInChrome: created.activeInChrome,
      iconUrl: DIRECT_NOTIFICATION_ICON_URL
    };

    await chrome.storage.local.set({ directNotificationHandled: handled });
    await persistDirectNotificationDiagnostic(diagnostic);
    console.info("Market Hours direct opening notification succeeded:", diagnostic);

    return diagnostic;
  } catch (error) {
    const diagnostic = {
      at: new Date(nowMs).toISOString(),
      source,
      sessionKey: opening.sessionKey,
      marketName: opening.marketName || null,
      displayName: opening.displayName || opening.marketName || null,
      localOpen: opening.localOpen || null,
      openTimestamp: opening.openTimestamp || null,
      ok: false,
      error: error && error.message ? error.message : String(error),
      iconUrl: DIRECT_NOTIFICATION_ICON_URL
    };

    await persistDirectNotificationDiagnostic(diagnostic);
    console.error("Market Hours direct opening notification failed:", diagnostic, error);

    return diagnostic;
  }
}

async function processRecentOpeningsFromSchedule(scheduledOpenings, source) {
  const nowMs = Date.now();
  const recent = Object.values(scheduledOpenings || {}).filter((opening) => {
    const timestamp = Number(opening && opening.openTimestamp) || 0;
    return timestamp <= nowMs && nowMs - timestamp <= DIRECT_CATCH_UP_GRACE_MS;
  });

  for (const opening of recent) {
    await handleDirectOpeningNotification(opening, source);
  }
}

// Independent real-alarm listener. It uses the packaged PNG directly and does
// not depend on showOpeningNotification() or handleOpening() overrides.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm || !alarm.name || !alarm.name.startsWith(DIRECT_OPEN_ALARM_PREFIX)) return;

  (async () => {
    const { scheduledOpenings = {} } = await chrome.storage.local.get("scheduledOpenings");
    const opening = scheduledOpenings[alarm.name];

    if (!opening) {
      const diagnostic = {
        at: new Date().toISOString(),
        source: "alarm-direct",
        ok: false,
        reason: "opening-not-found",
        alarmName: alarm.name
      };
      await persistDirectNotificationDiagnostic(diagnostic);
      console.error("Market Hours direct opening notification failed:", diagnostic);
      return;
    }

    await handleDirectOpeningNotification(opening, "alarm-direct");
  })().catch(async (error) => {
    const diagnostic = {
      at: new Date().toISOString(),
      source: "alarm-direct",
      ok: false,
      reason: "listener-crash",
      error: error && error.message ? error.message : String(error),
      alarmName: alarm.name
    };

    await persistDirectNotificationDiagnostic(diagnostic).catch(() => {});
    console.error("Market Hours direct alarm listener crashed:", diagnostic, error);
  });
});

// Covers catch-up openings created by schedule refreshes/startup within the
// existing 60-second grace window.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.scheduledOpenings) return;

  processRecentOpeningsFromSchedule(
    changes.scheduledOpenings.newValue || {},
    "schedule-catch-up-direct"
  ).catch((error) => {
    console.error("Market Hours direct catch-up notification failed:", error);
  });
});
