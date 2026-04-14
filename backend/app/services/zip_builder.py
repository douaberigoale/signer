"""ZIP streaming helper."""
import io
import zipfile
from collections.abc import Iterator


def stream_zip(entries: dict[str, bytes]) -> Iterator[bytes]:
    """Yield chunks of a ZIP archive containing the given name→bytes mapping."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, data in entries.items():
            zf.writestr(name, data)
    buf.seek(0)
    while True:
        chunk = buf.read(65536)
        if not chunk:
            break
        yield chunk
