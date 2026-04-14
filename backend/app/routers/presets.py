import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Preset
from app.schemas.presets import PresetCreate, PresetResponse

router = APIRouter()


@router.get("", response_model=list[PresetResponse])
def list_presets(db: Session = Depends(get_db)) -> list[PresetResponse]:
    rows = db.query(Preset).order_by(Preset.created_at.desc()).all()
    return [_to_response(p) for p in rows]


@router.post("", response_model=PresetResponse, status_code=201)
def create_preset(body: PresetCreate, db: Session = Depends(get_db)) -> PresetResponse:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Preset name must not be empty")
    preset = Preset(
        name=name,
        tools_json=json.dumps(body.tools),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return _to_response(preset)


@router.delete("/{preset_id}", status_code=204)
def delete_preset(preset_id: int, db: Session = Depends(get_db)) -> None:
    preset = db.get(Preset, preset_id)
    if preset is None:
        raise HTTPException(status_code=404, detail="Preset not found")
    db.delete(preset)
    db.commit()


def _to_response(p: Preset) -> PresetResponse:
    return PresetResponse(
        id=p.id,
        name=p.name,
        tools=json.loads(p.tools_json),
        created_at=p.created_at,
    )
