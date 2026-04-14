from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    signature_path: Mapped[str | None] = mapped_column(String, nullable=True)
    signature_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Preset(Base):
    __tablename__ = "presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tools_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )
