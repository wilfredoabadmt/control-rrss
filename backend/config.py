"""
Módulo de Configuración Centralizada — GAMEA Social Monitor
Principio XXXI: Configuración Externalizada
"""

from functools import lru_cache

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Entorno y Proyecto
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    ENABLE_DOCS: bool = Field(default=True)
    PROJECT_NAME: str = Field(default="GAMEA Social Monitor")
    API_V1_STR: str = Field(default="/api/v1")

    # Servidor
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=3000)
    PORT: int = Field(default=3000)
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:80",
            "https://control-social.89.116.29.168.sslip.io",
            "http://control-social.89.116.29.168.sslip.io",
            "*",
        ]
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            import json
            if isinstance(v, str):
                parsed = json.loads(v)
                return [str(item) for item in parsed]
            return [str(item) for item in v]
        return []

    # PostgreSQL
    POSTGRES_SERVER: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    POSTGRES_DB: str = Field(default="gamea_social_monitor")
    POSTGRES_USER: str = Field(default="gamea_admin")
    POSTGRES_PASSWORD: str = Field(default="gamea_secure_password_dev_change_in_prod")
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://gamea_admin:gamea_secure_password_dev_change_in_prod@localhost:5432/gamea_social_monitor"
    )
    DATABASE_URL_SYNC: str = Field(default="")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_db_url(cls, v: str | None) -> str:
        if not v:
            return "postgresql+asyncpg://gamea_admin:gamea_secure_password_dev_change_in_prod@localhost:5432/gamea_social_monitor"
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def assemble_sync_db_url(cls, v: str | None, info: ValidationInfo) -> str:
        if v:
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg2://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg2://", 1)
            return v
        async_url = info.data.get("DATABASE_URL")
        if async_url and "postgresql+asyncpg://" in str(async_url):
            return str(async_url).replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
        return "postgresql+psycopg2://gamea_admin:gamea_secure_password_dev_change_in_prod@localhost:5432/gamea_social_monitor"


    # Redis & Celery
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_PASSWORD: str = Field(default="")
    REDIS_DB: int = Field(default=0)
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/1")

    # Seguridad y Criptografía (Principio XX)
    JWT_SECRET_KEY: str = Field(default="dev_secret_key_change_in_production_min_32_bytes_long_ok")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    FIELD_ENCRYPTION_KEY: str = Field(default="dGhpcy1pcy1hLXNhbXBsZS1mZXJuZXQta2V5LTMyYnl0ZXM=")

    # Redes Sociales — Facebook Graph API
    FACEBOOK_APP_ID: str = Field(default="mock_facebook_app_id")
    FACEBOOK_APP_SECRET: str = Field(default="mock_facebook_app_secret")
    FACEBOOK_VERIFY_TOKEN: str = Field(default="gamea_meta_webhook_verify_token")
    FACEBOOK_GRAPH_VERSION: str = Field(default="v20.0")

    # Redes Sociales — TikTok
    TIKTOK_CLIENT_KEY: str = Field(default="mock_tiktok_client_key")
    TIKTOK_CLIENT_SECRET: str = Field(default="mock_tiktok_client_secret")

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = Field(default="100/minute")
    RATE_LIMIT_AUTH: str = Field(default="10/minute")

    # Logging & Observabilidad (Principio XXII)
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")


@lru_cache
def get_settings() -> Settings:
    """Retorna la instancia singleton de la configuración del sistema."""
    return Settings()


settings = get_settings()
