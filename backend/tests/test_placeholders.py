from datetime import datetime

from app.services.placeholders import resolve


def _dt(year=2024, month=3, day=5, hour=9, minute=7, second=3):
    return datetime(year, month, day, hour, minute, second)


def test_no_placeholders():
    assert resolve("FIXEDTEXT", _dt()) == "FIXEDTEXT"


def test_date_placeholder():
    now = _dt(year=2024, month=3, day=5)
    assert resolve("{dd.MM.YYYY}", now) == "05.03.2024"


def test_mixed():
    now = _dt(year=2024, month=3, day=5, hour=9, minute=7, second=3)
    assert resolve("Signed on {dd.MM.YYYY} at {HH:mm}", now) == "Signed on 05.03.2024 at 09:07"


def test_two_digit_year():
    assert resolve("{dd.MM.YY}", _dt(year=2024, month=1, day=1)) == "01.01.24"


def test_unknown_pattern_passes_through():
    assert resolve("{foobar}", _dt()) == "{foobar}"


def test_time_placeholder():
    now = _dt(hour=14, minute=30, second=45)
    assert resolve("{HH:mm:ss}", now) == "14:30:45"


def test_empty_braces_pass_through():
    assert resolve("{}", _dt()) == "{}"


def test_no_braces():
    assert resolve("Hello World", _dt()) == "Hello World"
