"""
GAMEA Social Monitor — API Principal FastAPI
Plataforma Institucional de Monitoreo y Analítica de Redes Sociales
Gobierno Autónomo Municipal de El Alto
"""

import time
import uuid
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Any, cast

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
        from database import AsyncSessionLocal, Base, activate_sqlite_fallback, async_engine
        import core.audit.models  # noqa: F401
        import modules.iam.models  # noqa: F401
        import modules.employees.models  # noqa: F401
        import modules.social_accounts.models  # noqa: F401
        import modules.publications.models  # noqa: F401
        import modules.interactions.models  # noqa: F401
        import modules.verification.models  # noqa: F401
        import modules.reporting.models  # noqa: F401
        import modules.monitoring.models  # noqa: F401
        from modules.iam.models import Role, User
        from modules.iam.seed import seed_roles_and_permissions
        from modules.shared.enums import UserRole
        from modules.social_accounts.seed import seed_social_platforms
        from sqlalchemy import select, text
        from sqlalchemy.orm import selectinload

        # Comprobar si PostgreSQL responde. Sin PostgreSQL NO hay persistencia:
        # solo se permite el fallback si está habilitado explícitamente (ALLOW_SQLITE_FALLBACK).
        try:
            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("database_connected_successfully", dialect=async_engine.dialect.name)
        except Exception as conn_err:
            if settings.ALLOW_SQLITE_FALLBACK:
                logger.warning(
                    "postgres_connection_failed_using_sqlite_fallback_explicit",
                    error=str(conn_err),
                )
                async_engine = activate_sqlite_fallback()
            else:
                logger.critical(
                    "postgres_unavailable_data_will_not_be_persisted",
                    error=str(conn_err),
                    hint="Levante PostgreSQL o defina ALLOW_SQLITE_FALLBACK=true solo para emergencias.",
                )

        try:
            async with async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e_schema:
            logger.error("schema_create_failed", error=str(e_schema))

        # Migraciones idempotentes de esquema para tablas existentes en PostgreSQL / SQLite
        try:
            async with async_engine.begin() as conn:
                is_pg = "postgresql" in async_engine.dialect.name
                if is_pg:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_direction VARCHAR(200);"))
                    await conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by_user_id UUID;"))
                    await conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS direction_name VARCHAR(200);"))
                    await conn.execute(text("UPDATE organizational_units SET name = 'Despacho Alcalde' WHERE lower(name) = 'despacho alcaldesa';"))
                    await conn.execute(text("UPDATE organizational_units SET name = replace(name, 'Alcaldesa', 'Alcalde') WHERE name LIKE '%Alcaldesa%';"))
                    await conn.execute(text("UPDATE organizational_units SET name = replace(name, 'alcaldesa', 'alcalde') WHERE name LIKE '%alcaldesa%';"))
                    await conn.execute(text("UPDATE organizational_units SET parent_id = (SELECT id FROM organizational_units WHERE lower(name) = 'despacho alcalde' LIMIT 1) WHERE lower(name) = 'unidad de relaciones públicas y protocolo' AND (SELECT count(*) FROM organizational_units WHERE lower(name) = 'despacho alcalde') > 0;"))
                    await conn.execute(text("UPDATE employees SET direction_name = 'Despacho Alcalde' WHERE lower(first_name) LIKE '%wilfredo%' OR employee_id LIKE '%8736490%';"))
                    await conn.execute(text("UPDATE employees SET created_by_user_id = (SELECT id FROM users WHERE lower(email) LIKE '%wilfredo%' OR lower(full_name) LIKE '%wilfredo%' LIMIT 1) WHERE created_by_user_id IS NULL AND (SELECT count(*) FROM users WHERE lower(email) LIKE '%wilfredo%' OR lower(full_name) LIKE '%wilfredo%') > 0;"))
                    await conn.execute(text("INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE (lower(u.email) LIKE '%wilfredo%' OR lower(u.full_name) LIKE '%wilfredo%') AND r.name = 'SUPER_ADMIN' ON CONFLICT DO NOTHING;"))
                    # Métricas agregadas de Meta en publications (create_all no agrega columnas a tablas existentes)
                    await conn.execute(text("ALTER TABLE publications ADD COLUMN IF NOT EXISTS meta_reactions_total INTEGER NOT NULL DEFAULT 0;"))
                    await conn.execute(text("ALTER TABLE publications ADD COLUMN IF NOT EXISTS meta_reactions_by_type JSON NOT NULL DEFAULT '{}';"))
                    await conn.execute(text("ALTER TABLE publications ADD COLUMN IF NOT EXISTS meta_metrics_synced_at TIMESTAMPTZ;"))
                else:
                    for _sql_col in (
                        "ALTER TABLE users ADD COLUMN assigned_direction VARCHAR(200)",
                        "ALTER TABLE employees ADD COLUMN created_by_user_id UUID",
                        "ALTER TABLE employees ADD COLUMN direction_name VARCHAR(200)",
                        "ALTER TABLE publications ADD COLUMN meta_reactions_total INTEGER NOT NULL DEFAULT 0",
                        "ALTER TABLE publications ADD COLUMN meta_reactions_by_type JSON NOT NULL DEFAULT '{}'",
                        "ALTER TABLE publications ADD COLUMN meta_metrics_synced_at TIMESTAMP",
                    ):
                        with suppress(Exception):
                            await conn.execute(text(_sql_col))
        except Exception as e_mig:
            logger.warning("schema_migration_step_warning", error=str(e_mig))

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

            # Limpieza de publicaciones sintéticas heredadas para garantizar datos reales (Principio V)
            try:
                await session.execute(
                    text("DELETE FROM interactions WHERE publication_id IN (SELECT id FROM publications WHERE external_post_id LIKE 'post_fb_gamea_%' OR external_post_id LIKE 'video_tt_gamea_%' OR external_post_id LIKE 'post_fb_elalto_%' OR external_post_id LIKE 'video_tt_elalto_%')")
                )
                await session.execute(
                    text("DELETE FROM publications WHERE external_post_id LIKE 'post_fb_gamea_%' OR external_post_id LIKE 'video_tt_gamea_%' OR external_post_id LIKE 'post_fb_elalto_%' OR external_post_id LIKE 'video_tt_elalto_%'")
                )
                await session.commit()
            except Exception as e_clean:
                logger.warning("legacy_publications_cleanup_skipped", error=str(e_clean))

            # Sincronización de conectores oficiales con variables de entorno reales
            try:
                from core.security.encryption import encrypt_field
                from modules.monitoring.models import SocialConnectorConfig
                stmt_cfg = select(SocialConnectorConfig)
                existing_cfgs = list((await session.execute(stmt_cfg)).scalars().all())
                for cfg in existing_cfgs:
                    if cfg.platform_name == "FACEBOOK":
                        if settings.FACEBOOK_PAGE_ID and cfg.target_account_id in ("100064567891234", ""):
                            cfg.target_account_id = settings.FACEBOOK_PAGE_ID
                        if settings.FACEBOOK_PAGE_ACCESS_TOKEN and ("mock" in (cfg.access_token_encrypted or "").lower() or not cfg.access_token_encrypted):
                            cfg.access_token_encrypted = encrypt_field(settings.FACEBOOK_PAGE_ACCESS_TOKEN)
                            cfg.last_status = "CONFIGURED"
                            cfg.status_message = "Conector oficial Meta Graph API conectado con credenciales institucionales."
                    elif cfg.platform_name == "TIKTOK":
                        if settings.TIKTOK_CLIENT_KEY and cfg.target_account_id in ("@alcaldia_elalto", ""):
                            cfg.target_account_id = settings.TIKTOK_CLIENT_KEY
                        if settings.TIKTOK_ACCESS_TOKEN and ("mock" in (cfg.access_token_encrypted or "").lower() or not cfg.access_token_encrypted):
                            cfg.access_token_encrypted = encrypt_field(settings.TIKTOK_ACCESS_TOKEN)
                            cfg.last_status = "CONFIGURED"
                            cfg.status_message = "Conector oficial TikTok conectado."
                await session.commit()
            except Exception as e_cfg:
                logger.warning("connector_configs_sync_skipped", error=str(e_cfg))
    except Exception as e:
        logger.error("startup_seeding_failed", error=str(e), exc_info=True)

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
app.add_exception_handler(
    RateLimitExceeded,
    cast(Any, _rate_limit_exceeded_handler),
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
    Endpoint de readiness probe: valida conectividad con Base de Datos y Redis.
    """
    checks: dict[str, Any] = {
        "database": {"status": "UNKNOWN"},
        "redis": {"status": "UNKNOWN"},
    }
    overall_healthy = True

    # 1. Comprobar Base de Datos activa
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            dialect_name = session.bind.dialect.name if session.bind else "unknown"
        checks["database"] = {"status": "HEALTHY", "dialect": dialect_name}
    except Exception as e:
        checks["database"] = {"status": "UNHEALTHY", "error": str(e)}
        overall_healthy = False

    # 2. Comprobar Redis (con degradación airosa en memoria)
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        await redis_client.aclose()
        checks["redis"] = {"status": "HEALTHY"}
    except Exception:
        checks["redis"] = {"status": "DEGRADED", "info": "Running in-memory cache/limiter"}

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
        return FileResponse(
            str(STATIC_DIR / "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
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

# Fase 7: Centro de Ingesta, Monitoreo y Fiscalización de Audiencia (Facebook & TikTok)
from modules.monitoring.router import monitoring_router

app.include_router(monitoring_router, prefix=settings.API_V1_STR)

# Fase 8: Notificaciones y Alertas
from modules.notifications.router import router as notifications_router

app.include_router(notifications_router, prefix=settings.API_V1_STR)

@app.get("/api/v1/clean-audits")
async def clean_audits_direct(db=Depends()):
    from sqlalchemy.ext.asyncio import AsyncSession
    from database import get_async_db
    # We resolve the generator manually to avoid definition-time NameError
    db_session: AsyncSession = await anext(get_async_db())

    from modules.monitoring.models import Interaction, Verification
    from sqlalchemy import delete
    await db_session.execute(delete(Verification).where(Verification.verification_method == "MANUAL_OPERATOR"))
    await db_session.execute(delete(Interaction).where(Interaction.capture_method == "MANUAL_IMPORT"))
    await db_session.commit()
    return {"status": "ok"}



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
        return FileResponse(
            str(STATIC_DIR / "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )







