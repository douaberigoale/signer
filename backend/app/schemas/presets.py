from datetime import datetime
from pydantic import BaseModel


class PresetCreate(BaseModel):
    name: str
    tools: list[dict]


class PresetResponse(BaseModel):
    id: int
    name: str
    tools: list[dict]
    created_at: datetime

    model_config = {"from_attributes": True}
