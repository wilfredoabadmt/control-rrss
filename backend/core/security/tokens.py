"""
Gestión de Tokens JWT — GAMEA Social Monitor
Principio XVI: Seguridad por Diseño
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from config import settings
from jose import JWTError, jwt
from modules.shared.exceptions import AuthenticationException


def create_access_token(
    subject: str,
    roles: list[str],
    correlation_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Genera un Access Token JWT con roles y correlation_id."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "roles": roles,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if correlation_id:
        payload["cid"] = correlation_id

    return str(jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM))


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Genera un Refresh Token JWT de mayor duración para renovar credenciales."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return str(jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM))


def decode_token(token: str) -> dict[str, Any]:
    """Decodifica y valida la firma y expiración de un token JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return dict(payload)
    except JWTError as exc:
        raise AuthenticationException("Token inválido o expirado.") from exc
