const el = {
  statusPill: document.getElementById("statusPill"),
  statusText: document.getElementById("statusText"),
  nextMarket: document.getElementById("nextMarket"),
  nextTime: document.getElementById("nextTime"),
  nextMeta: document.getElementById("nextMeta"),
  soundToggle: document.getElementById("soundToggle"),
  notificationToggle: document.getElementById("notificationToggle"),
  interactionToggle: document.getElementById("interactionToggle"),
  testGongButton: document.getElementById("testGongButton"),
  testNotificationButton: document.getElementById("testNotificationButton"),
  refreshButton: document.getElementById("refreshButton"),
  scheduleInfo: document.getElementById("scheduleInfo"),
  syncInfo: document.getElementById("syncInfo"),
  errorInfo: document.getElementById("errorInfo")
};

function setStatus(mode, text) {
  el.statusPill.className = `status-pill ${mode || ""}`.trim();
  el.statusText.textContent = text;
}

function setError(message) {
  el.errorInfo.hidden = !message;
  el.errorInfo.textContent = message || "";
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatSync(isoString) {
  if (!isoString) return "Nunca sincronizado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoString));
}

async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (response && response.ok === false && response.error) {
    throw new Error(response.error);
  }
  return response;
}

function render(status) {
  const settings = status && status.settings ? status.settings : {};
  const schedule = status && status.scheduleStatus ? status.scheduleStatus : null;
  const next = schedule && schedule.nextOpening ? schedule.nextOpening : null;

  el.soundToggle.checked = Boolean(settings.soundEnabled);
  el.notificationToggle.checked = Boolean(settings.notificationsEnabled);
  el.interactionToggle.checked = Boolean(settings.requireInteraction);

  if (schedule && schedule.lastError) {
    setStatus("error", "ERRO");
    setError(schedule.lastError);
  } else if (status && status.notificationPermission === "denied" && settings.notificationsEnabled) {
    setStatus("error", "BLOQUEADO");
    setError("O Chrome está bloqueando notificações para esta extensão.");
  } else {
    setStatus("ok", "ATIVO");
    setError("");
  }

  if (next) {
    el.nextMarket.textContent = next.displayName || next.marketName || "—";
    el.nextTime.textContent = formatTime(next.openTimestamp);
    el.nextMeta.textContent = `${next.label} • ${next.localOpen.slice(0, 5)} no horário local da bolsa`;
  } else {
    el.nextMarket.textContent = "—";
    el.nextTime.textContent = "—";
    el.nextMeta.textContent = "Nenhuma abertura futura encontrada.";
  }

  const count = Number(status && status.activeAlarmCount) || 0;
  el.scheduleInfo.textContent = `${count} alertas de abertura agendados`;
  el.syncInfo.textContent = `Última sincronização: ${formatSync(schedule && schedule.updatedAt)}`;
}

async function loadStatus() {
  try {
    setStatus("", "CARREGANDO");
    render(await send("GET_STATUS"));
  } catch (error) {
    setStatus("error", "ERRO");
    setError(error.message);
  }
}

async function saveSettings() {
  try {
    const status = await send("SET_SETTINGS", {
      settings: {
        soundEnabled: el.soundToggle.checked,
        notificationsEnabled: el.notificationToggle.checked,
        requireInteraction: el.interactionToggle.checked
      }
    });
    render(status);
  } catch (error) {
    setError(error.message);
  }
}

async function runAction(button, busyText, callback) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  setError("");
  try {
    await callback();
  } catch (error) {
    setStatus("error", "ERRO");
    setError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function testNotificationDirectly() {
  const permission = await chrome.notifications.getPermissionLevel();
  const now = new Date();
  const notificationId = `market-hours:popup-test:${now.getTime()}`;
  const iconUrl = chrome.runtime.getURL("icons/market-hours-128.png");

  if (permission !== "granted") {
    const diagnostic = {
      at: now.toISOString(),
      type: "popup-direct-notification-test",
      ok: false,
      permission,
      error: `Notification permission is ${permission}`
    };
    await chrome.storage.local.set({ lastNotificationTest: diagnostic });
    throw new Error(`Permissão de notificação: ${permission}`);
  }

  try {
    const createdId = await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl,
      title: "MARKET HOURS",
      message: "Teste de notificação concluído",
      contextMessage: "Aberturas de mercado aparecerão desta forma.",
      eventTime: now.getTime(),
      priority: 2,
      requireInteraction: Boolean(el.interactionToggle.checked),
      silent: true
    });

    const activeNotifications = await chrome.notifications.getAll();
    const diagnostic = {
      at: now.toISOString(),
      type: "popup-direct-notification-test",
      ok: true,
      permission,
      notificationId: createdId,
      activeInChrome: Boolean(activeNotifications[createdId]),
      iconUrl
    };

    await chrome.storage.local.set({ lastNotificationTest: diagnostic });
    setStatus("ok", "TESTE OK");
    el.syncInfo.textContent = diagnostic.activeInChrome
      ? "Teste OK: notificação criada e ativa no Chrome."
      : "Teste enviado: o Chrome criou a notificação, mas ela não ficou ativa.";

    return diagnostic;
  } catch (error) {
    const diagnostic = {
      at: now.toISOString(),
      type: "popup-direct-notification-test",
      ok: false,
      permission,
      iconUrl,
      error: error && error.message ? error.message : String(error)
    };

    await chrome.storage.local.set({ lastNotificationTest: diagnostic });
    throw error;
  }
}

el.soundToggle.addEventListener("change", saveSettings);
el.notificationToggle.addEventListener("change", saveSettings);
el.interactionToggle.addEventListener("change", saveSettings);

el.testGongButton.addEventListener("click", () => {
  runAction(el.testGongButton, "TESTANDO...", () => send("TEST_GONG"));
});

el.testNotificationButton.addEventListener("click", () => {
  runAction(el.testNotificationButton, "TESTANDO...", testNotificationDirectly);
});

el.refreshButton.addEventListener("click", () => {
  runAction(el.refreshButton, "ATUALIZANDO...", async () => {
    render(await send("REFRESH_SCHEDULE"));
  });
});

loadStatus();
