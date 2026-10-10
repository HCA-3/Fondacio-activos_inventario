# Imagen única: FastAPI sirve la API y el frontend estático.

FROM python:3.13-slim AS dependencias
COPY --from=ghcr.io/astral-sh/uv:0.11.14 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev


FROM python:3.13-slim
# FORWARDED_ALLOW_IPS: Render termina el HTTPS en su proxy y reenvía la petición al contenedor.
ENV PYTHONUNBUFFERED=1 \
    PATH="/app/backend/.venv/bin:$PATH" \
    FORWARDED_ALLOW_IPS="*"
RUN useradd --system --no-create-home app
WORKDIR /app/backend
COPY --from=dependencias /app/backend/.venv .venv
COPY backend/ ./
COPY frontend/ /app/frontend/
USER app
EXPOSE 8000
# Render define PORT; en local se usa el 8000.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
