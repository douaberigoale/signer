"""Placeholder resolver for date/time tokens.

Tokens use the form {pattern} where pattern is composed of:
  dd   → %d   (zero-padded day)
  MM   → %m   (zero-padded month)
  YYYY → %Y   (4-digit year)
  YY   → %y   (2-digit year)
  HH   → %H   (zero-padded 24h hour)
  mm   → %M   (zero-padded minute)
  ss   → %S   (zero-padded second)

Any separator characters between these tokens pass through literally.
Unrecognised patterns (not composed solely of the above tokens) pass
through without replacement, curly braces included.
"""
import re
from datetime import datetime


# Map token names to strftime directives (order matters: longer tokens first)
_TOKEN_MAP = [
    ("YYYY", "%Y"),
    ("YY",   "%y"),
    ("MM",   "%m"),
    ("HH",   "%H"),
    ("dd",   "%d"),
    ("mm",   "%M"),
    ("ss",   "%S"),
]

# Build a regex that matches any known token
_TOKEN_PATTERN = re.compile("|".join(re.escape(t) for t, _ in _TOKEN_MAP))
_BRACE_PATTERN = re.compile(r"\{([^}]*)\}")


def _to_strftime(pattern: str) -> str | None:
    """Convert a brace-contents pattern to a strftime format string.

    Returns None if the pattern contains characters not covered by known tokens.
    """
    remaining = pattern
    result = ""
    while remaining:
        m = _TOKEN_PATTERN.match(remaining)
        if m:
            token = m.group(0)
            result += dict(_TOKEN_MAP)[token]
            remaining = remaining[len(token):]
        elif remaining[0] in ".-/:_T ,":
            # Allowed separator
            result += remaining[0]
            remaining = remaining[1:]
        else:
            return None  # Unknown character — do not replace
    return result


def resolve(text: str, now: datetime) -> str:
    """Replace {pattern} placeholders in *text* with formatted datetime values."""
    def replacer(m: re.Match) -> str:
        inner = m.group(1)
        fmt = _to_strftime(inner)
        if fmt is None:
            return m.group(0)  # pass through unchanged
        return now.strftime(fmt)

    return _BRACE_PATTERN.sub(replacer, text)
