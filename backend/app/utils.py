"""Мелкие помощники для работы со временем клиники."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.config import settings


def clinic_tz() -> ZoneInfo:
    return ZoneInfo(settings.clinic_timezone)


def clinic_today() -> date:
    return datetime.now(clinic_tz()).date()


def clinic_now() -> datetime:
    return datetime.now(clinic_tz())


def day_bounds(d: date) -> tuple[datetime, datetime]:
    """Границы суток [начало, следующий день) по часовому поясу клиники."""
    tz = clinic_tz()
    return (
        datetime.combine(d, time.min, tz),
        datetime.combine(d + timedelta(days=1), time.min, tz),
    )
