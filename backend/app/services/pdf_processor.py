"""Core PDF annotation engine using PyMuPDF (fitz)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Union

import fitz  # PyMuPDF
from pydantic import BaseModel

from app.services.placeholders import resolve


class TextTool(BaseModel):
    type: Literal["text"] = "text"
    page: int  # 0-based page index
    x_pct: float
    y_pct: float
    text: str
    font_size: float = 12.0
    color: tuple[float, float, float] = (0.0, 0.0, 0.0)


class ImageTool(BaseModel):
    type: Literal["image"] = "image"
    page: int  # 0-based page index
    x_pct: float
    y_pct: float
    width_pct: float = 0.2
    height_pct: float = 0.1
    source: Literal["signature", "custom"] = "signature"
    custom_image_path: str | None = None


Tool = Union[TextTool, ImageTool]


def apply_tools(
    pdf_path: str,
    tools: list[Tool],
    signature_path: str | None,
    now: datetime,
) -> bytes:
    """Apply annotation tools to a PDF and return the modified bytes."""
    doc = fitz.open(pdf_path)

    for tool in tools:
        page_idx = tool.page
        if page_idx < 0 or page_idx >= len(doc):
            continue

        page = doc[page_idx]
        pw = page.rect.width
        ph = page.rect.height
        x = pw * tool.x_pct
        y = ph * tool.y_pct

        if isinstance(tool, TextTool):
            resolved_text = resolve(tool.text, now)
            r, g, b = tool.color
            # insert_text places the baseline at (x, y).  Offset y down by the
            # font ascender so the *top* of the glyphs lands at the anchor point
            # (matching the frontend preview which uses top-left positioning).
            ascender_offset = fitz.Font("helv").ascender * tool.font_size
            page.insert_text(
                (x, y + ascender_offset),
                resolved_text,
                fontsize=tool.font_size,
                color=(r, g, b),
            )

        elif isinstance(tool, ImageTool):
            img_path: str | None = None
            if tool.source == "signature":
                img_path = signature_path
            elif tool.source == "custom":
                img_path = tool.custom_image_path

            if not img_path:
                continue

            w = pw * tool.width_pct
            h = ph * tool.height_pct
            rect = fitz.Rect(x, y, x + w, y + h)
            page.insert_image(rect, filename=img_path)

    return doc.tobytes()
