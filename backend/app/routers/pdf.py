import io
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

import fitz  # PyMuPDF
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import UserSettings
from app.schemas.pdf import SessionResponse, PageSize
from app.services import session_store
from app.services.pdf_processor import apply_tools, Tool, TextTool, ImageTool
from app.storage import get_session_dir, delete_session, cleanup_expired_sessions

router = APIRouter()

USER_ID = 1


def _get_signature_path(db: Session) -> str | None:
    user = db.get(UserSettings, USER_ID)
    return user.signature_path if user else None


# ─── Session upload ───────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    files: Annotated[list[UploadFile], File(...)],
    db: Session = Depends(get_db),
) -> SessionResponse:
    cleanup_expired_sessions()

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    session_id = str(uuid.uuid4())
    session_dir = get_session_dir(session_id)
    session_dir.mkdir(parents=True, exist_ok=True)

    saved: list[Path] = []
    for idx, upload in enumerate(files):
        safe_name = Path(upload.filename or "document.pdf").name
        dest = session_dir / f"{idx:04d}_{safe_name}"
        data = await upload.read()
        dest.write_bytes(data)
        saved.append(dest)

    session_store.register_session(session_id, saved)

    # Read page sizes from first PDF
    first_pdf_pages: list[PageSize] = []
    if saved:
        try:
            doc = fitz.open(str(saved[0]))
            for page in doc:
                first_pdf_pages.append(PageSize(width=page.rect.width, height=page.rect.height))
            doc.close()
        except Exception:
            first_pdf_pages = []

    return SessionResponse(
        session_id=session_id,
        file_count=len(saved),
        first_pdf_pages=first_pdf_pages,
    )


# ─── Preview ─────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/preview")
def get_preview(session_id: str) -> FileResponse:
    files = session_store.get_session_files(session_id)
    if not files:
        raise HTTPException(status_code=404, detail="Session not found")
    first = files[0]
    if not first.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(str(first), media_type="application/pdf")


# ─── Delete session ───────────────────────────────────────────────────────────

@router.delete("/sessions/{session_id}", status_code=204)
def remove_session(session_id: str) -> None:
    session_store.remove_session(session_id)
    delete_session(session_id)


# ─── Asset upload (stretch task 13) ──────────────────────────────────────────

@router.post("/sessions/{session_id}/assets")
async def upload_asset(session_id: str, file: UploadFile = File(...)) -> dict:
    files = session_store.get_session_files(session_id)
    if files is None:
        raise HTTPException(status_code=404, detail="Session not found")

    if file.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(status_code=400, detail="Only PNG/JPEG files are accepted")

    session_dir = get_session_dir(session_id)
    assets_dir = session_dir / "assets"
    assets_dir.mkdir(exist_ok=True)

    asset_id = str(uuid.uuid4())
    ext = ".jpg" if file.content_type == "image/jpeg" else ".png"
    dest = assets_dir / f"{asset_id}{ext}"
    data = await file.read()
    dest.write_bytes(data)

    return {"asset_id": asset_id, "path": str(dest)}


# ─── Batch processing ─────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/process")
async def process_session(
    session_id: str,
    body: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    files = session_store.get_session_files(session_id)
    if files is None:
        raise HTTPException(status_code=404, detail="Session not found")

    raw_tools = body.get("tools", [])
    tools: list[Tool] = []
    for t in raw_tools:
        tool_type = t.get("type")
        if tool_type == "text":
            tools.append(TextTool(**{k: v for k, v in t.items() if k != "type"}))
        elif tool_type == "image":
            tools.append(ImageTool(**{k: v for k, v in t.items() if k != "type"}))

    signature_path = _get_signature_path(db)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Resolve asset_id → file path for custom image tools
    session_dir = get_session_dir(session_id)
    resolved_tools: list[Tool] = [
        tool.model_copy(update={"custom_image_path": _resolve_asset(session_dir, tool.custom_image_path)})
        if isinstance(tool, ImageTool) and tool.source == "custom" and tool.custom_image_path
        else tool
        for tool in tools
    ]

    def generate_zip():
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for pdf_path in files:
                try:
                    annotated = apply_tools(str(pdf_path), resolved_tools, signature_path, now)
                    orig_name = pdf_path.name.split("_", 1)[1] if "_" in pdf_path.name else pdf_path.name
                    zf.writestr(orig_name.replace(".pdf", "_annotated.pdf"), annotated)
                except Exception as exc:
                    zf.writestr(pdf_path.name + ".error.txt", str(exc))
        buf.seek(0)
        yield from iter(lambda: buf.read(65536), b"")

    # Clean up session tmp dir after streaming completes (or if it errors)
    background_tasks.add_task(session_store.remove_session, session_id)
    background_tasks.add_task(delete_session, session_id)

    return StreamingResponse(
        generate_zip(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="annotated_{session_id}.zip"'},
    )


def _resolve_asset(session_dir: Path, value: str) -> str:
    """Return a file path for an asset_id or pass through if already a path."""
    assets_dir = session_dir / "assets"
    for ext in (".png", ".jpg", ".jpeg"):
        candidate = assets_dir / f"{value}{ext}"
        if candidate.exists():
            return str(candidate)
    return value
