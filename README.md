# markethours

A Python-based generator for a global stock exchange market calendar JSON, automatically updated daily and published via GitHub Pages.

## Covered Markets

| Market | Exchange | Calendar Code | Timezone |
|--------|----------|---------------|----------|
| Tokyo | Tokyo Stock Exchange | XTKS | Asia/Tokyo |
| Shanghai | Shanghai Stock Exchange | XSHG | Asia/Shanghai |
| Taiwan | Taiwan Stock Exchange | XTAI | Asia/Taipei |
| Korea | Korea Exchange | XKRX | Asia/Seoul |
| Hong Kong | Hong Kong Stock Exchange | XHKG | Asia/Hong_Kong |
| India | Bombay Stock Exchange | XBOM | Asia/Kolkata |
| London | London Stock Exchange | XLON | Europe/London |
| New York | New York Stock Exchange | XNYS | America/New_York |

## JSON Structure

```json
{
  "generated_at_utc": "2025-01-01T07:00:00+00:00",
  "start_date": "2025-01-01",
  "end_date": "2026-02-05",
  "timezone_base": "UTC",
  "markets": {
    "New York": {
      "label": "New York Stock Exchange",
      "exchange_calendar_code": "XNYS",
      "timezone": "America/New_York",
      "sessions": ["2025-01-02", "2025-01-03"],
      "holidays_or_closed_weekdays": ["2025-01-01"],
      "special_opens": {},
      "special_closes": {}
    }
  }
}
```

**Fields:**
- `sessions`: trading days (market open) in `YYYY-MM-DD` format
- `holidays_or_closed_weekdays`: weekdays (Mon–Fri) with no trading session
- `special_opens` / `special_closes`: date → time string for non-standard open/close times

## Run Locally

```bash
pip install -r requirements.txt
python scripts/generate_market_calendar.py

# Optional: specify a custom date range
python scripts/generate_market_calendar.py --start 2025-01-01 --end 2025-12-31
```

The output is written to `docs/market_calendar.json`.

## Activate GitHub Pages

1. Go to **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select branch: **main**, folder: **/docs**
4. Click **Save**

After a few minutes, the JSON will be publicly available at:

```
https://agenteumanafastquotes.github.io/markethours/market_calendar.json
```

## Run the Workflow Manually

1. Go to **Actions → Update Market Calendar JSON**
2. Click **Run workflow**
3. Select branch `main` and click **Run workflow**

The workflow also runs automatically every day at 07:00 UTC.
