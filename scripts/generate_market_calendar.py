#!/usr/bin/env python3
"""Generate a JSON calendar of global stock exchange trading sessions."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta

import exchange_calendars as xcals
import pandas as pd


MARKETS = {
    "Tokyo": {
        "label": "Tokyo Stock Exchange",
        "exchange_calendar_code": "XTKS",
        "timezone": "Asia/Tokyo",
    },
    "Shanghai": {
        "label": "Shanghai Stock Exchange",
        "exchange_calendar_code": "XSHG",
        "timezone": "Asia/Shanghai",
    },
    "Taiwan": {
        "label": "Taiwan Stock Exchange",
        "exchange_calendar_code": "XTAI",
        "timezone": "Asia/Taipei",
    },
    "Korea": {
        "label": "Korea Exchange",
        "exchange_calendar_code": "XKRX",
        "timezone": "Asia/Seoul",
    },
    "Hong Kong": {
        "label": "Hong Kong Stock Exchange",
        "exchange_calendar_code": "XHKG",
        "timezone": "Asia/Hong_Kong",
    },
    "India": {
        "label": "Bombay Stock Exchange",
        "exchange_calendar_code": "XBOM",
        "timezone": "Asia/Kolkata",
    },
    "London": {
        "label": "London Stock Exchange",
        "exchange_calendar_code": "XLON",
        "timezone": "Europe/London",
    },
    "New York": {
        "label": "New York Stock Exchange",
        "exchange_calendar_code": "XNYS",
        "timezone": "America/New_York",
    },
}


def parse_args():
    parser = argparse.ArgumentParser(description="Generate market calendar JSON")
    parser.add_argument("--start", help="Start date YYYY-MM-DD (default: today UTC)")
    parser.add_argument("--end", help="End date YYYY-MM-DD (default: today UTC + 400 days)")
    return parser.parse_args()


def validate_calendar_codes():
    available = set(xcals.get_calendar_names())
    errors = []

    for name, info in MARKETS.items():
        code = info["exchange_calendar_code"]
        if code not in available:
            errors.append(f"  - '{code}' for {name} not found in exchange_calendars")

    if errors:
        print("ERROR: The following calendar codes are invalid:", file=sys.stderr)
        for e in errors:
            print(e, file=sys.stderr)
        sys.exit(1)


def get_special_times(calendar, sessions_set):
    """Extract special open/close times for sessions in range."""
    special_opens = {}
    special_closes = {}

    try:
        if hasattr(calendar, "special_opens_adhoc") and calendar.special_opens_adhoc:
            for times, dates in calendar.special_opens_adhoc:
                for d in pd.DatetimeIndex(dates):
                    date_str = d.strftime("%Y-%m-%d")
                    if date_str in sessions_set:
                        special_opens[date_str] = str(times)
    except Exception:
        pass

    try:
        if hasattr(calendar, "special_closes_adhoc") and calendar.special_closes_adhoc:
            for times, dates in calendar.special_closes_adhoc:
                for d in pd.DatetimeIndex(dates):
                    date_str = d.strftime("%Y-%m-%d")
                    if date_str in sessions_set:
                        special_closes[date_str] = str(times)
    except Exception:
        pass

    return special_opens, special_closes


def get_sessions_in_calendar_bounds(calendar):
    """Return sessions from the calendar's valid first session to last session.

    This prevents DateOutOfBounds when the requested start date is a weekend
    or holiday and the first valid session is later than the requested start.
    """
    try:
        first_session = pd.Timestamp(calendar.first_session).tz_localize(None).normalize()
        last_session = pd.Timestamp(calendar.last_session).tz_localize(None).normalize()

        if first_session > last_session:
            return pd.DatetimeIndex([])

        return calendar.sessions_in_range(first_session, last_session)

    except Exception as e:
        print(f"  Warning: failed to read sessions from calendar bounds: {e}")
        return pd.DatetimeIndex([])


def main():
    args = parse_args()

    today_utc = datetime.now(timezone.utc).date()

    start_date = (
        datetime.strptime(args.start, "%Y-%m-%d").date()
        if args.start
        else today_utc
    )

    end_date = (
        datetime.strptime(args.end, "%Y-%m-%d").date()
        if args.end
        else today_utc + timedelta(days=400)
    )

    if start_date > end_date:
        print("ERROR: --start must be before --end", file=sys.stderr)
        sys.exit(1)

    validate_calendar_codes()

    output = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "timezone_base": "UTC",
        "markets": {},
    }

    start_ts = pd.Timestamp(start_date)
    end_ts = pd.Timestamp(end_date)

    for market_name, info in MARKETS.items():
        code = info["exchange_calendar_code"]
        print(f"Processing {market_name} ({code})...")

        cal = None

        # Some calendars have a recorded-holidays upper bound; clamp end date if needed.
        cal_class = xcals.calendar_utils.global_calendar_dispatcher._calendar_factories[code]
        cal_end = end_ts

        try:
            bound_max = pd.Timestamp(cal_class.bound_max())
            if cal_end > bound_max:
                print(f"  Note: {code} holidays only recorded to {bound_max.date()}, capping end date.")
                cal_end = bound_max
        except Exception:
            pass

        try:
            cal = xcals.get_calendar(code, start=start_ts, end=cal_end)
            sessions_in_range = get_sessions_in_calendar_bounds(cal)
        except Exception as e:
            print(f"  Warning: failed to load calendar {market_name} ({code}): {e}")
            sessions_in_range = pd.DatetimeIndex([])

        sessions_set = {s.strftime("%Y-%m-%d") for s in sessions_in_range}
        sessions_list = sorted(sessions_set)

        # Weekdays (Mon-Fri) with no trading session = holidays or observed closures.
        business_days = pd.date_range(start=start_ts, end=cal_end, freq="B")
        holidays_or_closed = sorted(
            d.strftime("%Y-%m-%d")
            for d in business_days
            if d.strftime("%Y-%m-%d") not in sessions_set
        )

        special_opens, special_closes = (
            get_special_times(cal, sessions_set)
            if cal is not None
            else ({}, {})
        )

        output["markets"][market_name] = {
            "exchange_calendar_code": code,
            "holidays_or_closed_weekdays": holidays_or_closed,
            "label": info["label"],
            "sessions": sessions_list,
            "special_closes": special_closes,
            "special_opens": special_opens,
            "timezone": info["timezone"],
        }

    os.makedirs("docs", exist_ok=True)

    output_path = os.path.join("docs", "market_calendar.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, sort_keys=True, ensure_ascii=False)

    print(f"\nGenerated {output_path}")


if __name__ == "__main__":
    main()
