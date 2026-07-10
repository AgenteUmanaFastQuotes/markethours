// Chrome MV3 background entrypoint.
// Loads the main service worker and overrides only notification rendering.
// Chrome officially allows iconUrl to be a data URL, avoiding SVG image-loading
// failures such as "Unable to download all specified images" on macOS.

importScripts("service-worker.js");

const NOTIFICATION_ICON_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAC0UlEQVR42u3dTXbbMAxF4YanXoD2v0gvoZ23g1i2Ij4A353mJCGBS5DUH78ej8efXxjLEgICgAAgAAgAAoAAIAAIAAKAACAACAACgAAgAAgAAoAAIAAIAAKAACAACICa/J7S0efzefp3juNoH5evrq+GvZPwiUK0EuAnkt5dhhYC3Jn4biKUFmBn4ruIUFKApMRXF6GUAMmJryrCkvzZ7S1RAa4K5plRueN/EuDiJFwZ/KS2jBDg3YDfEejktrUQoMpl2w6Xl+MEOBvUhIBWbHPkLqBqIM+2I2mHUPZu4CfJ/y4B7/zt4zjKbVWjKsCrwTuOI3ZFfaZtKbKsasnvVJ0SJFiSP1uC1SmY2l1MgIqLpm5xWEbR7PavZOu7PHb1Sj92VYFl5Mzuz0od/dYCgytA1+fxE/u1jP7ZVWAZJbP7593A4dwqgPKfF6eoCjDhZcy0fpoCTAEggPl/7DogpgJMmf/T+msKMAUorQSQ/LGSmAJUABAABAAB7L0JQIJpO4GRU8AZCbqLUO7l0C5tG/dyaNr8e/Yt47urwV3xGr8LqPxxBwIMqQZjBNgd1LuqQZI8KznAU6vBnXEyBQxfG8QJkPYJ+KurQZooK31kVasGn/bv7vhETgGJ5fSVavDdzxP7tdJHVPW1QXpcYheB6aeC/JusiqN/qwDJn00524crkr+rKsZvA6tIULX9Kzl4rjmoACVGUeV2ryr2dz00ancVjKgA3SSo9P3jqBNDziQ4cf1Qsf1lbwalVQM3gzashlOCXvnMIKeGDWhnOQE+Gd3ODWwiwBUl3smhxQW4eq53dnBRAaqush0ZMyyYFdtbpgJUqQbVRC0pQKIIVe9slhYgQYTqt7RbCLBDhC7PMrQS4Kdl6PgAS1sBrhBiwhNLYwRA8esAIAAIAAKAACAACAACgAAgAAgAAoAAIAAIAAKAACAACAACgAAgAAgAAuA//gIrlUkkLpJbOQAAAABJRU5ErkJggg==";

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
