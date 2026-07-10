const CALENDAR_URL = "https://agenteumanafastquotes.github.io/markethours/market_calendar.json";
const OPEN_ALARM_PREFIX = "market-open|";
const REFRESH_ALARM = "market-hours|refresh";
const SCHEDULE_HORIZON_MS = 14 * 24 * 60 * 60 * 1000;
const CATCH_UP_GRACE_MS = 60 * 1000;
const MAX_STALE_ALARM_MS = 5 * 60 * 1000;
const HANDLED_RETENTION_MS = 72 * 60 * 60 * 1000;

const SETTINGS_DEFAULTS = {
  soundEnabled: true,
  notificationsEnabled: true,
  requireInteraction: false
};

const FALLBACK_REGULAR_SESSIONS = {
  Tokyo: [["09:00", "11:30"], ["12:30", "15:30"]],
  Korea: [["09:00", "15:30"]],
  Taiwan: [["09:00", "13:30"]],
  Singapore: [["09:00", "12:00"], ["13:00", "17:00"]],
  Shanghai: [["09:30", "11:30"], ["13:00", "15:00"]],
  "Hong Kong": [["09:30", "12:00"], ["13:00", "16:00"]],
  Philippines: [["09:30", "12:00"], ["13:00", "15:15"]],
  India: [["09:15", "15:30"]],
  Frankfurt: [["08:00", "22:00"]],
  London: [["08:00", "16:30"]],
  "New York": [["09:30", "16:00"]]
};

const MARKET_DISPLAY_NAMES = {
  Tokyo: "Tóquio",
  Korea: "Coreia",
  Taiwan: "Taiwan",
  Singapore: "Singapura",
  Shanghai: "Xangai",
  "Hong Kong": "Hong Kong",
  Philippines: "Filipinas",
  India: "Índia",
  Frankfurt: "Frankfurt",
  London: "Londres",
  "New York": "Nova York"
};

let creatingOffscreen = null;
const inFlightOpenings = new Set();

function pad(value) {
  return String(value).padStart(2, "0");
}

function normalizeTime(value) {
  const raw = String(value || "00:00").trim();
  const match = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return "00:00:00";

  return `${pad(Number(match[1]))}:${pad(Number(match[2]))}:${pad(Number(match[3] || 0))}`;
}

function slugify(value) {
  return String(value || "market")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23"
  });

  const output = {};
  for (const part of formatter.formatToParts(date)) {
    output[part.type] = part.value;
  }

  const hour = output.hour === "24" ? "00" : output.hour;

  return {
    year: Number(output.year),
    month: Number(output.month),
    day: Number(output.day),
    hour: Number(hour),
    minute: Number(output.minute),
    second: Number(output.second),
    dateKey: `${output.year}-${output.month}-${output.day}`,
    time: `${hour}:${output.minute}:${output.second}`
  };
}

function zonedTimeToUtcMs(dateKey, timeString, timeZone) {
  const normalized = normalizeTime(timeString);
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute, second] = normalized.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);

  let utc = new Date(targetAsUtc);

  for (let i = 0; i < 4; i += 1) {
    const zoned = getZonedParts(utc, timeZone);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second
    );
    const diff = zonedAsUtc - targetAsUtc;

    if (diff === 0) break;
    utc = new Date(utc.getTime() - diff);
  }

  return utc.getTime();
}

function getRegularSessions(marketName, market) {
  if (Array.isArray(market.regular_sessions) && market.regular_sessions.length) {
    return market.regular_sessions;
  }

  return FALLBACK_REGULAR_SESSIONS[marketName] || [];
}

function buildSegments(marketName, market, dateKey) {
  let segments = getRegularSessions(marketName, market).map((session) => [
    normalizeTime(session[0]),
    normalizeTime(session[1])
  ]);

  const specialOpen = market.special_opens && market.special_opens[dateKey];
  const specialClose = market.special_closes && market.special_closes[dateKey];

  if (segments.length && specialOpen) {
    segments[0][0] = normalizeTime(specialOpen);
  }

  if (segments.length && specialClose) {
    segments = [[segments[0][0], normalizeTime(specialClose)]];
  }

  return segments;
}

function buildOpenings(calendar, nowMs = Date.now()) {
  if (!calendar || !calendar.markets || typeof calendar.markets !== "object") {
    throw new Error("Calendar JSON does not contain a valid markets object.");
  }

  const startMs = nowMs - CATCH_UP_GRACE_MS;
  const endMs = nowMs + SCHEDULE_HORIZON_MS;
  const openings = [];

  for (const [marketName, market] of Object.entries(calendar.markets)) {
    if (!market || !market.timezone || !Array.isArray(market.sessions)) continue;

    for (const dateKey of market.sessions) {
      const segments = buildSegments(marketName, market, dateKey);

      for (let index = 0; index < segments.length; index += 1) {
        const localOpen = segments[index][0];
        const openTimestamp = zonedTimeToUtcMs(dateKey, localOpen, market.timezone);

        if (openTimestamp < startMs || openTimestamp > endMs) continue;

        const sessionKey = `${slugify(marketName)}|${dateKey}|${localOpen}`;
        const alarmName = `${OPEN_ALARM_PREFIX}${encodeURIComponent(sessionKey)}`;

        openings.push({
          alarmName,
          sessionKey,
          marketName,
          displayName: MARKET_DISPLAY_NAMES[marketName] || marketName,
          label: market.label || marketName,
          exchangeCalendarCode: market.exchange_calendar_code || "",
          timezone: market.timezone,
          dateKey,
          localOpen,
          openTimestamp,
          segmentIndex: index
        });
      }
    }
  }

  return openings.sort((a, b) => a.openTimestamp - b.openTimestamp);
}

async function getSettings() {
  const stored = await chrome.storage.local.get("settings");
  return {
    ...SETTINGS_DEFAULTS,
    ...(stored.settings || {})
  };
}

async function ensureDefaultSettings() {
  const stored = await chrome.storage.local.get("settings");
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: SETTINGS_DEFAULTS });
  }
}

async function ensureRefreshAlarm() {
  const existing = await chrome.alarms.get(REFRESH_ALARM);
  if (existing) return;

  await chrome.alarms.create(REFRESH_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 360
  });
}

async function clearMarketOpenAlarms() {
  const alarms = await chrome.alarms.getAll();
  const marketAlarms = alarms.filter((alarm) => alarm.name.startsWith(OPEN_ALARM_PREFIX));

  await Promise.all(marketAlarms.map((alarm) => chrome.alarms.clear(alarm.name)));
}

function pruneHandledOpenings(handledOpenings, nowMs = Date.now()) {
  const output = {};

  for (const [sessionKey, record] of Object.entries(handledOpenings || {})) {
    const timestamp = Number(record && record.at) || 0;
    if (timestamp && nowMs - timestamp <= HANDLED_RETENTION_MS) {
      output[sessionKey] = record;
    }
  }

  return output;
}

async function ensureOffscreenDocument() {
  const path = "offscreen.html";
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: path,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play market session opening gongs in the background."
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function playGong(opening) {
  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "PLAY_OPENING_GONG",
    opening
  });

  if (!response || !response.ok) {
    throw new Error(response && response.error ? response.error : "Offscreen audio playback failed.");
  }

  return true;
}

async function showOpeningNotification(opening, settings) {
  const notificationId = `market-open:${opening.sessionKey}`;

  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/market-hours.svg"),
    title: "MARKET HOURS",
    message: `${opening.displayName} acabou de abrir`,
    contextMessage: `${opening.label} • ${opening.localOpen.slice(0, 5)} local`,
    eventTime: opening.openTimestamp,
    priority: 2,
    requireInteraction: Boolean(settings.requireInteraction),
    silent: true
  });

  return true;
}

async function showTestNotification(settings) {
  const now = new Date();
  const notificationId = `market-hours:test:${now.getTime()}`;

  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/market-hours.svg"),
    title: "MARKET HOURS",
    message: "Teste de notificação concluído",
    contextMessage: "Aberturas de mercado aparecerão desta forma.",
    eventTime: now.getTime(),
    priority: 2,
    requireInteraction: Boolean(settings.requireInteraction),
    silent: true
  });

  return true;
}

async function handleOpening(opening, source = "alarm") {
  if (!opening || !opening.sessionKey) return { ok: false, reason: "invalid-opening" };
  if (inFlightOpenings.has(opening.sessionKey)) return { ok: false, reason: "in-flight" };

  inFlightOpenings.add(opening.sessionKey);

  try {
    const nowMs = Date.now();
    if (opening.openTimestamp && nowMs - opening.openTimestamp > MAX_STALE_ALARM_MS) {
      return { ok: false, reason: "stale" };
    }

    const stored = await chrome.storage.local.get(["handledOpenings", "settings"]);
    const handledOpenings = pruneHandledOpenings(stored.handledOpenings || {}, nowMs);
    const settings = {
      ...SETTINGS_DEFAULTS,
      ...(stored.settings || {})
    };
    const record = handledOpenings[opening.sessionKey] || {
      at: nowMs,
      sound: false,
      notification: false
    };

    const result = {
      ok: true,
      source,
      sound: record.sound,
      notification: record.notification,
      errors: []
    };

    if (settings.notificationsEnabled && !record.notification) {
      try {
        await showOpeningNotification(opening, settings);
        record.notification = true;
        result.notification = true;
      } catch (error) {
        result.errors.push(`notification: ${error.message}`);
      }
    }

    if (settings.soundEnabled && !record.sound) {
      try {
        await playGong(opening);
        record.sound = true;
        result.sound = true;
      } catch (error) {
        result.errors.push(`sound: ${error.message}`);
      }
    }

    record.at = nowMs;
    handledOpenings[opening.sessionKey] = record;

    await chrome.storage.local.set({ handledOpenings });

    if (result.errors.length) {
      result.ok = false;
    }

    return result;
  } finally {
    inFlightOpenings.delete(opening.sessionKey);
  }
}

async function refreshSchedule() {
  const nowMs = Date.now();
  const response = await fetch(CALENDAR_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Calendar HTTP ${response.status}`);
  }

  const calendar = await response.json();
  const openings = buildOpenings(calendar, nowMs);

  await clearMarketOpenAlarms();

  const scheduledOpenings = {};
  const catchUpOpenings = [];
  let scheduledCount = 0;

  for (const opening of openings) {
    scheduledOpenings[opening.alarmName] = opening;

    if (opening.openTimestamp <= nowMs) {
      if (nowMs - opening.openTimestamp <= CATCH_UP_GRACE_MS) {
        catchUpOpenings.push(opening);
      }
      continue;
    }

    await chrome.alarms.create(opening.alarmName, {
      when: opening.openTimestamp
    });
    scheduledCount += 1;
  }

  const nextOpening = openings.find((opening) => opening.openTimestamp > nowMs) || null;
  const scheduleStatus = {
    updatedAt: new Date(nowMs).toISOString(),
    calendarGeneratedAt: calendar.generated_at_utc || null,
    scheduledCount,
    nextOpening,
    lastError: null
  };

  await chrome.storage.local.set({
    scheduledOpenings,
    scheduleStatus
  });

  for (const opening of catchUpOpenings) {
    await handleOpening(opening, "catch-up");
  }

  return scheduleStatus;
}

async function refreshScheduleSafely() {
  try {
    return await refreshSchedule();
  } catch (error) {
    const stored = await chrome.storage.local.get("scheduleStatus");
    const scheduleStatus = {
      ...(stored.scheduleStatus || {}),
      updatedAt: new Date().toISOString(),
      lastError: error.message
    };

    await chrome.storage.local.set({ scheduleStatus });
    throw error;
  }
}

async function bootstrap() {
  await ensureDefaultSettings();
  await ensureRefreshAlarm();
  await refreshScheduleSafely();
}

async function getPopupStatus() {
  const [stored, alarms, permissionLevel] = await Promise.all([
    chrome.storage.local.get(["settings", "scheduleStatus"]),
    chrome.alarms.getAll(),
    chrome.notifications.getPermissionLevel()
  ]);

  const activeMarketAlarms = alarms.filter((alarm) => alarm.name.startsWith(OPEN_ALARM_PREFIX));

  return {
    settings: {
      ...SETTINGS_DEFAULTS,
      ...(stored.settings || {})
    },
    scheduleStatus: stored.scheduleStatus || null,
    activeAlarmCount: activeMarketAlarms.length,
    notificationPermission: permissionLevel
  };
}

chrome.runtime.onInstalled.addListener(() => {
  bootstrap().catch((error) => console.error("Market Hours install bootstrap failed:", error));
});

chrome.runtime.onStartup.addListener(() => {
  bootstrap().catch((error) => console.error("Market Hours startup bootstrap failed:", error));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    refreshScheduleSafely().catch((error) => console.error("Market Hours schedule refresh failed:", error));
    return;
  }

  if (!alarm.name.startsWith(OPEN_ALARM_PREFIX)) return;

  chrome.storage.local.get("scheduledOpenings").then(({ scheduledOpenings = {} }) => {
    const opening = scheduledOpenings[alarm.name];

    if (!opening) {
      return refreshScheduleSafely();
    }

    return handleOpening(opening, "alarm");
  }).catch((error) => console.error("Market Hours opening alarm failed:", error));
});

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target === "offscreen") return false;

  (async () => {
    switch (message.type) {
      case "GET_STATUS":
        return getPopupStatus();

      case "SET_SETTINGS": {
        const current = await getSettings();
        const next = {
          ...current,
          ...(message.settings || {})
        };
        await chrome.storage.local.set({ settings: next });
        return getPopupStatus();
      }

      case "TEST_GONG":
        await playGong({
          sessionKey: `test|${Date.now()}`,
          displayName: "Teste",
          label: "Market Hours",
          localOpen: "--:--",
          openTimestamp: Date.now()
        });
        return { ok: true };

      case "TEST_NOTIFICATION": {
        const settings = await getSettings();
        await showTestNotification(settings);
        return { ok: true };
      }

      case "REFRESH_SCHEDULE":
        await refreshScheduleSafely();
        return getPopupStatus();

      default:
        return { ok: false, error: "Unknown message type." };
    }
  })()
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
