# Signer

A browser-based tool for stamping text and images onto PDF files.
Upload one or more PDFs, place text/signature tools visually on the preview, and download a ZIP of all annotated files.

## Features

- **Visual placement** — click anywhere on the PDF preview to anchor a tool; drag to reposition, resize with the corner handle
- **Text tools** — static text or date placeholders (`{dd.MM.YYYY}`, `{HH:mm}`, etc.)
- **Image tools** — stamp your saved signature or a custom PNG/JPEG
- **Batch processing** — annotate many PDFs with the same tool layout in one click
- **Presets** — save and reload tool configurations across sessions

## Quick start

```bash
# 1. Copy environment template
cp .env.example .env   # edit if needed

# 2. Start all services
docker compose up -d

# 3. Open the app
open http://localhost:5173
```

The first run applies database migrations automatically.

## Services

| Service  | Port | Description            |
|----------|------|------------------------|
| frontend | 5173 | Vite + React dev server |
| backend  | 8000 | FastAPI + uvicorn       |
| db       | 5432 | PostgreSQL 16           |

## Environment variables

| Variable             | Default                                           | Description                   |
|----------------------|---------------------------------------------------|-------------------------------|
| `POSTGRES_USER`      | `pdfuser`                                         | Database user                 |
| `POSTGRES_PASSWORD`  | `pdfpassword`                                     | Database password             |
| `POSTGRES_DB`        | `pdfdb`                                           | Database name                 |
| `STORAGE_DIR`        | `/storage`                                        | Directory for uploaded files  |
| `SESSION_TTL_SECONDS`| `3600`                                            | Session expiry (seconds)      |

## Development

```bash
# Backend only (requires a running Postgres)
cd backend
pip install -e ".[test]"
alembic upgrade head
uvicorn app.main:app --reload

# Frontend only (proxies /api to localhost:8000)
cd frontend
npm install
npm run dev
```

## Tech stack

- **Backend** — Python 3.12, FastAPI, SQLAlchemy, Alembic, PyMuPDF
- **Frontend** — React 18, TypeScript, Vite, react-pdf, Zustand
- **Database** — PostgreSQL 16
