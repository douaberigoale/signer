# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --cache /tmp/npm-cache --registry https://registry.npmjs.org

COPY frontend/ ./
RUN npm run build          # outputs to /app/dist


# ── Stage 2: Python backend + static frontend ─────────────────────────────────
FROM python:3.12-slim AS app

WORKDIR /app

# Install backend
COPY backend/pyproject.toml backend/
RUN pip install --no-cache-dir ./backend

COPY backend/ ./backend/

# Embed the built frontend
COPY --from=frontend-build /app/dist ./frontend/dist

EXPOSE 8000

CMD ["sh", "-c", "cd /app/backend && until alembic upgrade head; do echo 'DB not ready, retrying in 3s...'; sleep 3; done && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
