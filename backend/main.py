"""
GAMEA Social Monitor — API Principal FastAPI
Plataforma Institucional de Monitoreo y Analítica de Redes Sociales
Gobierno Autónomo Municipal de El Alto
"""

import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
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
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

# Directorio de frontend estático (dist / static)
STATIC_DIR = Path(__file__).resolve().parent / "static"
if not (STATIC_DIR / "index.html").exists():
    STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

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

    # Auto-sembrado seguro de roles, plataformas y superadmin inicial
    try:
        from core.security.password import hash_password
        from database import AsyncSessionLocal, Base, async_engine
        from modules.iam.models import Role, User
        from modules.iam.seed import seed_roles_and_permissions
        from modules.shared.enums import UserRole
        from modules.social_accounts.seed import seed_social_platforms
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with AsyncSessionLocal() as session:
            await seed_roles_and_permissions(session)
            await seed_social_platforms(session)

            admin_email = "admin@elalto.gob.bo"
            stmt = select(User).where(User.email == admin_email).options(selectinload(User.roles))
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                stmt_role = select(Role).where(Role.name == UserRole.SUPER_ADMIN.value)
                role_res = await session.execute(stmt_role)
                superadmin_role = role_res.scalar_one_or_none()
                admin_user = User(
                    email=admin_email,
                    full_name="Super Administrador GAMEA",
                    password_hash=hash_password("AdminGamea2026!"),
                    is_active=True,
                    roles=[superadmin_role] if superadmin_role else [],
                )
                session.add(admin_user)
                await session.commit()
                logger.info("superadmin_seeded_successfully", email=admin_email)
    except Exception as e:
        logger.warning("startup_seeding_skipped", error=str(e))

    yield
    logger.info("app_shutdown", project=settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "API Institucional de Monitoreo y Analítica de Interacciones en Redes Sociales "
        "del Gobierno Autónomo Municipal de El Alto (GAMEA)."
    ),
    version="1.0.0",
    docs_url="/docs" if (settings.ENVIRONMENT != "production" or settings.ENABLE_DOCS) else None,
    redoc_url="/redoc" if (settings.ENVIRONMENT != "production" or settings.ENABLE_DOCS) else None,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Middleware de Cabeceras de Seguridad HTTP (Constitución §Security.2)
from core.middleware.security import SecurityHeadersMiddleware

app.add_middleware(SecurityHeadersMiddleware)

# Rate Limiting (Principio XVI)
from core.security.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
async def root(request: Request) -> Any:
    """Raíz del servicio: entrega la SPA de React a navegadores o JSON a clientes API."""
    accept = request.headers.get("accept", "")
    if "text/html" in accept and (STATIC_DIR / "index.html").exists():
        return FileResponse(str(STATIC_DIR / "index.html"))
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

# Fase 3: Vinculación Social y Publicaciones
from modules.publications.router import campaigns_router, publications_router
from modules.social_accounts.router import social_accounts_router

app.include_router(social_accounts_router, prefix=f"{settings.API_V1_STR}/social-accounts", tags=["Social Accounts"])
app.include_router(publications_router, prefix=f"{settings.API_V1_STR}/publications", tags=["Publications"])
app.include_router(campaigns_router, prefix=f"{settings.API_V1_STR}/campaigns", tags=["Campaigns"])

# Fase 4: Interacciones y Verificación Epistémica
from modules.interactions.router import router as interactions_router
from modules.verification.router import router as verifications_router

app.include_router(interactions_router, prefix=settings.API_V1_STR)
app.include_router(verifications_router, prefix=settings.API_V1_STR)

# Fase 5: Adaptadores de Redes Sociales (Webhooks)
from modules.facebook_adapter.webhook import router as facebook_webhook_router

app.include_router(facebook_webhook_router, prefix=settings.API_V1_STR)

# Fase 6: Reportes y Dashboards
from modules.dashboard.router import router as dashboard_router
from modules.reporting.router import router as reporting_router

app.include_router(reporting_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

# Fase 8: Notificaciones y Alertas
from modules.notifications.router import router as notifications_router

app.include_router(notifications_router, prefix=settings.API_V1_STR)

# -----------------------------------------------------------------------------
# Integración y Montaje de Frontend SPA (React + Vite)
# -----------------------------------------------------------------------------
if (STATIC_DIR / "index.html").exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        fav = STATIC_DIR / "vite.svg"
        if fav.exists():
            return FileResponse(str(fav), media_type="image/svg+xml")
        return Response(status_code=204)

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Evitar interceptar rutas reservadas de backend
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("health")
        ):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        potential_file = STATIC_DIR / full_path
        if potential_file.is_file():
            return FileResponse(str(potential_file))
        return FileResponse(str(STATIC_DIR / "index.html"))







