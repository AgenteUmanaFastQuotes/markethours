// Chrome MV3 background entrypoint.
// Loads the main service worker and overrides only notification rendering.
// Uses a physical PNG packaged with the extension because Chrome on macOS
// rejected both the previous SVG icon and the embedded PNG data URL.

importScripts("service-worker.js");

const NOTIFICATION_ICON_URL = chrome.runtime.getURL("icons/market-hours-128.png");

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

self.showTestNotification = async function showTestNotificationWithPng(settings) {
  const now = new Date();
  const notificationId = `market-hours:test:${now.getTime()}`;

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

  return true;
};
