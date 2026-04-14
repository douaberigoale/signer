from datetime import datetime
from pydantic import BaseModel


class SettingsResponse(BaseModel):
    id: int
    signature_path: str | None
    signature_uploaded_at: datetime | None

    class Config:
        from_attributes = True
