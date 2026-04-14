import os
import shutil
import time
from pathlib import Path

from app.config import settings


def get_signatures_dir() -> Path:
    return Path(settings.storage_dir) / "signatures"


def get_tmp_dir() -> Path:
    return Path(settings.storage_dir) / "tmp"


def get_session_dir(session_id: str) -> Path:
    return get_tmp_dir() / session_id


def ensure_storage_dirs() -> None:
    get_signatures_dir().mkdir(parents=True, exist_ok=True)
    get_tmp_dir().mkdir(parents=True, exist_ok=True)


def cleanup_expired_sessions() -> None:
    tmp_dir = get_tmp_dir()
    if not tmp_dir.exists():
        return
    cutoff = time.time() - settings.session_ttl_seconds
    for entry in tmp_dir.iterdir():
        if entry.is_dir():
            try:
                mtime = entry.stat().st_mtime
                if mtime < cutoff:
                    shutil.rmtree(entry, ignore_errors=True)
            except OSError:
                pass


def delete_session(session_id: str) -> None:
    session_dir = get_session_dir(session_id)
    if session_dir.exists():
        shutil.rmtree(session_dir, ignore_errors=True)
