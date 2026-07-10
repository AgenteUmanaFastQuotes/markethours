// Chrome MV3 background entrypoint.
// Loads the main service worker, keeps the packaged PNG notification icon,
// and adds persistent diagnostics for every real market-opening alert.

importScripts("service-worker.js");

const NOTIFICATION_ICON_URL = chrome.runtime.getURL("icons/market-hours-128.png");
const ORIGINAL_HANDLE_OPENING = self.handleOpening;
const ORIGINAL_SHOW_TEST_NOTIFICATION = self.showTestNotification;

self.showOpeningNotification = async function showOpeningNotificationWithPng(opening, settings) {
  const notificationId = `market-open:${opening.sessionKey}`;

  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: NOTIFICATION_ICON_URL,
    title: "MARKET HOURS",
    message: `${opening.displayName} acabou de abrir`,
    contextMessage: `${opening.label} • ${opening.localOpen.slice(0, 5)} local`,
    eventTime: opening.openTimestamp,
    priority: 2,
    requireInteraction: Boolean(settings.requireInteraction),
    silent: true
  });

  return true;
};

self.showTestNotification = async function showTestNotificationWithDiagnostics(settings) {
  const now = new Date();
  const notificationId = `market-hours:test:${now.getTime()}`;

  try {
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: NOTIFICATION_ICON_URL,
      title: "MARKET HOURS",
      message: "Teste de notificação concluído",
      contextMessage: "Aberturas de mercado aparecerão desta forma.",
      eventTime: now.getTime(),
      priority: 2,
      requireInteraction: Boolean(settings.requireInteraction),
      silent: true
    });

    const diagnostic = {
      at: now.toISOString(),
      type: "test-notification",
      ok: true,
      notificationId
    };

    await chrome.storage.local.set({ lastNotificationTest: diagnostic });
    console.info("Market Hours test notification succeeded:", diagnostic);
    return true;
  } catch (error) {
    const diagnostic = {
      at: now.toISOString(),
      type: "test-notification",
      ok: false,
      notificationId,
      error: error && error.message ? error.message : String(error)
    };

    await chrome.storage.local.set({ lastNotificationTest: diagnostic });
    console.error("Market Hours test notification failed:", diagnostic);
    throw error;
  }
};

async function persistOpeningDiagnostic(opening, source, result) {
  const diagnostic = {
    at: new Date().toISOString(),
    source: source || "unknown",
    sessionKey: opening && opening.sessionKey ? opening.sessionKey : null,
    marketName: opening && opening.marketName ? opening.marketName : null,
    displayName: opening && opening.displayName ? opening.displayName : null,
    localOpen: opening && opening.localOpen ? opening.localOpen : null,
    openTimestamp: opening && opening.openTimestamp ? opening.openTimestamp : null,
    ok: Boolean(result && result.ok),
    sound: Boolean(result && result.sound),
    notification: Boolean(result && result.notification),
    reason: result && result.reason ? result.reason : null,
    errors: Array.isArray(result && result.errors) ? result.errors : []
  };

  const stored = await chrome.storage.local.get("scheduleStatus");
  const scheduleStatus = {
    ...(stored.scheduleStatus || {}),
    lastAlertAt: diagnostic.at,
    lastAlert: diagnostic
  };

  if (!diagnostic.ok) {
    const details = diagnostic.errors.length
      ? diagnostic.errors.join(" | ")
      : (diagnostic.reason || "unknown failure");
    scheduleStatus.lastError = `[ALERT] ${diagnostic.displayName || diagnostic.marketName || "Market"}: ${details}`;
  } else if (String(scheduleStatus.lastError || "").startsWith("[ALERT]")) {
    scheduleStatus.lastError = null;
  }

  await chrome.storage.local.set({
    lastOpeningEvent: diagnostic,
    scheduleStatus
  });

  return diagnostic;
}

self.handleOpening = async function handleOpeningWithDiagnostics(opening, source = "alarm") {
  let result;

  try {
    result = await ORIGINAL_HANDLE_OPENING(opening, source);
    const diagnostic = await persistOpeningDiagnostic(opening, source, result);

    if (diagnostic.ok) {
      console.info("Market Hours opening alert completed:", diagnostic);
    } else {
      console.error("Market Hours opening alert failed:", diagnostic);
    }

    return result;
  } catch (error) {
    result = {
      ok: false,
      source,
      sound: false,
      notification: false,
      errors: [error && error.message ? error.message : String(error)]
    };

    const diagnostic = await persistOpeningDiagnostic(opening, source, result);
    console.error("Market Hours opening alert crashed:", diagnostic, error);
    throw error;
  }
};
