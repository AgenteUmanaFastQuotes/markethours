# Market Hours Alerts Chrome Extension

Manifest V3 extension that keeps market-opening alerts independent from the dashboard tab.

## What it does

- Reads the public Market Hours calendar JSON.
- Schedules each upcoming session opening with `chrome.alarms`.
- Plays the same opening gong in an offscreen audio document.
- Shows a Chrome/system notification for each opening.
- Supports split sessions, special opens, special closes and market holidays.
- Uses a 60-second catch-up window after extension startup or schedule refresh.
- Ignores alarms that arrive more than five minutes late to avoid stale notifications after long sleep periods.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository folder `chrome-extension`.
5. Pin **Market Hours Alerts** to the Chrome toolbar.

## Test from the popup

The popup includes:

- **TESTAR GONG**
- **TESTAR NOTIFICAÇÃO**
- **ATUALIZAR HORÁRIOS**
- toggles for background gong, visual notifications and persistent notifications
- next market opening and number of active opening alarms

## Data source

The extension fetches:

`https://agenteumanafastquotes.github.io/markethours/market_calendar.json`

The generator now emits `regular_sessions` for every market. Until a freshly generated JSON with that field is published, the extension has an internal fallback matching the dashboard's current regular sessions.

## Architecture

```text
market_calendar.json
        ↓
service-worker.js
        ↓
chrome.alarms
        ↓
market opening event
        ├── chrome.notifications
        └── offscreen.html → offscreen.js → Web Audio gong
```

## Limitations

- Chrome must be running.
- The computer must be awake for the alert to fire at the intended time.
- Chrome may delay alarms; the extension rejects alerts more than five minutes late to avoid stale notifications.
- Actual notification appearance depends on Chrome and operating-system notification settings.
