"""
GAMEA Social Monitor — API Principal FastAPI
Plataforma Institucional de Monitoreo y Analítica de Redes Sociales
Gobierno Autónomo Municipal de El Alto
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as aioredis
import structlog
from config import settings
from core.logging_config import (
    correlation_id_ctx,
    get_correlation_id,
    setup_logging,
)
from database import AsyncSessionLocal
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: inicialización y finalización."""
    setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
    logger.info(
        "app_startup",
        project=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        debug=settings.DEBUG,
    )
    yield
    logger.info("app_shutdown", project=settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API Institucional de Monitoreo y Analítica de Interacciones en Redes Sociales "
        "del Gobierno Autónomo Municipal de El Alto (GAMEA)."
    ),
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Middleware de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_logging_middleware(request: Request, call_next):
    """
    Middleware para Trazabilidad Extremo a Extremo (Principio XXII).
    Captura o genera el correlation_id y registra el ciclo de vida de la petición.
    """
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    token = correlation_id_ctx.set(correlation_id)

    start_time = time.perf_counter()
    logger.info(
        "http_request_start",
        method=request.method,
        path=request.url.path,
        query=str(request.query_params),
        client_host=request.client.host if request.client else None,
    )

    try:
        response: Response = await call_next(request)
        process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id

        logger.info(
            "http_request_end",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=process_time_ms,
        )
        return response
    except Exception as exc:
        process_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(
            "http_request_exception",
            method=request.method,
            path=request.url.path,
            duration_ms=process_time_ms,
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Error interno del servidor",
                "code": "INTERNAL_SERVER_ERROR",
                "correlation_id": correlation_id,
            },
            headers={"X-Correlation-ID": correlation_id},
        )
    finally:
        correlation_id_ctx.reset(token)


# -----------------------------------------------------------------------------
# Endpoints de Salud (Health Checks)
# -----------------------------------------------------------------------------

@app.get("/health/liveness", tags=["Health"])
async def health_liveness() -> dict[str, Any]:
    """Endpoint de liveness probe para orquestación de contenedores."""
    return {
        "status": "UP",
        "service": "gamea-social-monitor",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health/readiness", tags=["Health"])
async def health_readiness() -> JSONResponse:
    """
    Endpoint de readiness probe: valida conectividad con PostgreSQL y Redis.
    """
    checks: dict[str, Any] = {
        "postgres": {"status": "UNKNOWN"},
        "redis": {"status": "UNKNOWN"},
    }
    overall_healthy = True

    # 1. Comprobar PostgreSQL
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"]["status"] = "HEALTHY"
    except Exception as e:
        checks["postgres"] = {"status": "UNHEALTHY", "error": str(e)}
        overall_healthy = False

    # 2. Comprobar Redis
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        await redis_client.aclose()
        checks["redis"]["status"] = "HEALTHY"
    except Exception as e:
        checks["redis"] = {"status": "UNHEALTHY", "error": str(e)}
        overall_healthy = False

    http_status = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={
            "status": "HEALTHY" if overall_healthy else "UNHEALTHY",
            "correlation_id": get_correlation_id(),
            "checks": checks,
        },
    )


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Raíz del servicio API con enlace a la documentación."""
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/openapi.json",
        "status": "running",
    }


# -----------------------------------------------------------------------------
# Registro de Routers de Módulos
# -----------------------------------------------------------------------------
from core.audit.router import audit_router
from modules.employees.router import employees_router, org_units_router, positions_router
from modules.iam.router import auth_router, roles_router, users_router

# Fase 1: IAM + Auditoría
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(users_router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(roles_router, prefix=f"{settings.API_V1_STR}/roles", tags=["Roles"])
app.include_router(audit_router, prefix=f"{settings.API_V1_STR}/audit", tags=["Audit"])

# Fase 2: Directorio de Funcionarios y Organización
app.include_router(employees_router, prefix=f"{settings.API_V1_STR}/employees", tags=["Employees"])
app.include_router(org_units_router, prefix=f"{settings.API_V1_STR}/org-units", tags=["Organizational Units"])
app.include_router(positions_router, prefix=f"{settings.API_V1_STR}/positions", tags=["Positions"])


