from pydantic import BaseModel


class PageSize(BaseModel):
    width: float
    height: float


class SessionResponse(BaseModel):
    session_id: str
    file_count: int
    first_pdf_pages: list[PageSize]
