"""
Configuración de Rate Limiting — GAMEA Social Monitor
Principio XVI: Defensa en Profundidad y Resiliencia
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Inicializa el limiter con clave basada en la IP de origen
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300/minute"],
    headers_enabled=True,
)
