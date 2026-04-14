"""Tests for the PDF processor using an in-memory generated sample PDF."""
import io
import os
import tempfile
from datetime import datetime

import fitz
import pytest

from app.services.pdf_processor import TextTool, ImageTool, apply_tools


def _make_sample_pdf(num_pages: int = 2) -> bytes:
    """Create a minimal multi-page PDF in memory."""
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)  # A4
        page.insert_text((50, 50), f"Page {i + 1}")
    return doc.tobytes()


def _make_png_1x1() -> bytes:
    """Return a minimal 1x1 white PNG."""
    import struct, zlib
    def chunk(name, data):
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\xff\xff"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture()
def sample_pdf(tmp_path):
    path = tmp_path / "sample.pdf"
    path.write_bytes(_make_sample_pdf())
    return path


@pytest.fixture()
def signature_png(tmp_path):
    path = tmp_path / "sig.png"
    path.write_bytes(_make_png_1x1())
    return path


def test_text_tool_applies(sample_pdf):
    tools = [TextTool(page=0, x_pct=0.1, y_pct=0.1, text="Hello")]
    result = apply_tools(str(sample_pdf), tools, None, datetime(2024, 3, 5))
    doc = fitz.open(stream=result, filetype="pdf")
    text = doc[0].get_text()
    assert "Hello" in text


def test_text_tool_placeholder(sample_pdf):
    tools = [TextTool(page=0, x_pct=0.1, y_pct=0.2, text="{dd.MM.YYYY}")]
    result = apply_tools(str(sample_pdf), tools, None, datetime(2024, 3, 5))
    doc = fitz.open(stream=result, filetype="pdf")
    text = doc[0].get_text()
    assert "05.03.2024" in text


def test_image_tool_skipped_without_signature(sample_pdf):
    tools = [ImageTool(page=0, x_pct=0.5, y_pct=0.5, source="signature")]
    # Should not raise even without signature
    result = apply_tools(str(sample_pdf), tools, None, datetime(2024, 3, 5))
    assert len(result) > 0


def test_image_tool_with_signature(sample_pdf, signature_png):
    tools = [ImageTool(page=0, x_pct=0.0, y_pct=0.0, width_pct=0.3, height_pct=0.1, source="signature")]
    result = apply_tools(str(sample_pdf), tools, str(signature_png), datetime(2024, 3, 5))
    assert len(result) > 0


def test_out_of_range_page_skipped(sample_pdf):
    tools = [TextTool(page=99, x_pct=0.1, y_pct=0.1, text="Ghost")]
    result = apply_tools(str(sample_pdf), tools, None, datetime(2024, 3, 5))
    doc = fitz.open(stream=result, filetype="pdf")
    assert len(doc) == 2  # original page count preserved


def test_second_page_tool(sample_pdf):
    tools = [TextTool(page=1, x_pct=0.5, y_pct=0.5, text="PageTwo")]
    result = apply_tools(str(sample_pdf), tools, None, datetime(2024, 3, 5))
    doc = fitz.open(stream=result, filetype="pdf")
    text = doc[1].get_text()
    assert "PageTwo" in text
