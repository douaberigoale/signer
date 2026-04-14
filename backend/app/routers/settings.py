from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import UserSettings
from app.schemas.settings import SettingsResponse
from app.storage import get_signatures_dir

router = APIRouter()

MAX_SIGNATURE_SIZE = 5 * 1024 * 1024  # 5 MB
USER_ID = 1


def _get_user(db: Session) -> UserSettings:
    user = db.get(UserSettings, USER_ID)
    if user is None:
        user = UserSettings(id=USER_ID)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/signature", status_code=200)
async def upload_signature(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> SettingsResponse:
    if file.content_type != "image/png":
        raise HTTPException(status_code=400, detail="Only PNG files are accepted")

    data = await file.read()
    if len(data) > MAX_SIGNATURE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5 MB limit")

    sig_path = get_signatures_dir() / "user_1.png"
    sig_path.write_bytes(data)

    user = _get_user(db)
    user.signature_path = str(sig_path)
    user.signature_uploaded_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(user)
    return SettingsResponse.model_validate(user)


@router.get("/signature")
def get_signature(db: Session = Depends(get_db)) -> FileResponse:
    user = _get_user(db)
    if not user.signature_path:
        raise HTTPException(status_code=404, detail="No signature uploaded")
    sig_path = Path(user.signature_path)
    if not sig_path.exists():
        raise HTTPException(status_code=404, detail="Signature file not found")
    return FileResponse(str(sig_path), media_type="image/png")


@router.get("")
def get_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    user = _get_user(db)
    return SettingsResponse.model_validate(user)
