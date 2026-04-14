from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.storage import ensure_storage_dirs
from app.db import SessionLocal
from app.models import UserSettings

# Resolved at import time so it works regardless of cwd
_STATIC_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    ensure_storage_dirs()
    _seed_user()
    yield
    # Shutdown (nothing to do)


def _seed_user() -> None:
    db = SessionLocal()
    try:
        user = db.get(UserSettings, 1)
        if user is None:
            db.add(UserSettings(id=1))
            db.commit()
    finally:
        db.close()


app = FastAPI(title="Signer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://frontend:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.routers import settings as settings_router  # noqa: E402
from app.routers import pdf as pdf_router  # noqa: E402
from app.routers import presets as presets_router  # noqa: E402

app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
app.include_router(pdf_router.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(presets_router.router, prefix="/api/presets", tags=["presets"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the built React app when the dist directory is present (production image).
# This catch-all must come last so all /api routes take priority.
# - Known static files (JS, CSS, assets) are served directly.
# - Everything else (React routes) returns index.html so the SPA router takes over.
if _STATIC_DIR.is_dir():
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str) -> FileResponse:
        candidate = _STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_STATIC_DIR / "index.html")
