# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Instalar únicamente dependencias mínimas de ejecución (curl y wget para probe de salud)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y cachear paquetes pip mediante Docker BuildKit
COPY backend/requirements.txt /app/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Development stage
FROM base AS development
COPY backend /app/backend
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY extras /app/extras
WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base AS production
COPY backend /app/backend
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY extras /app/extras
WORKDIR /app/backend

# Crear usuario no root y asignar permisos con directorios de runtime
RUN addgroup --system appgroup && adduser --system --group appuser \
    && mkdir -p /app/storage/evidences /app/storage/reports /backups /data /tmp \
    && chmod 1777 /tmp \
    && chown -R appuser:appgroup /app /backups /data
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
