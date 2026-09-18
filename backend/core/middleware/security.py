"""
Middleware de Cabeceras de Seguridad HTTP — GAMEA Social Monitor
Constitución §Security.2: Endurecimiento de Transporte HTTP y Protección OWASP
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevención de ataques MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevención de Clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Protección XSS heredada en navegadores antiguos
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Política de Transporte Estricto HTTPS (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Política de Referencias
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy restrictiva
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

        # Restricción de capacidades de hardware
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

        return response
