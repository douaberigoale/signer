"""Session store: maps session_id to ordered list of PDF file paths."""
import threading
from pathlib import Path

_lock = threading.Lock()
_sessions: dict[str, list[Path]] = {}


def register_session(session_id: str, files: list[Path]) -> None:
    with _lock:
        _sessions[session_id] = files


def get_session_files(session_id: str) -> list[Path] | None:
    with _lock:
        return _sessions.get(session_id)


def remove_session(session_id: str) -> None:
    with _lock:
        _sessions.pop(session_id, None)
