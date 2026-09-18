"""
Jerarquía de Excepciones del Dominio — GAMEA Social Monitor
"""



class GameaException(Exception):
    """Excepción base del sistema."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", correlation_id: str | None = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.correlation_id = correlation_id


class EntityNotFoundException(GameaException):
    """Lanzada cuando un recurso no existe en el sistema."""
    def __init__(self, entity_name: str, entity_id: str, correlation_id: str | None = None):
        super().__init__(
            message=f"{entity_name} con ID '{entity_id}' no encontrado.",
            code="ENTITY_NOT_FOUND",
            correlation_id=correlation_id,
        )


class ValidationException(GameaException):
    """Lanzada cuando una regla de negocio falla."""
    def __init__(self, message: str, correlation_id: str | None = None):
        super().__init__(
            message=message,
            code="BUSINESS_RULE_VIOLATION",
            correlation_id=correlation_id,
        )


class AuthenticationException(GameaException):
    """Lanzada ante fallos de autenticación de credenciales o tokens."""
    def __init__(self, message: str = "Credenciales inválidas o token expirado.", correlation_id: str | None = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            correlation_id=correlation_id,
        )


class AuthorizationException(GameaException):
    """Lanzada cuando el usuario carece de permisos suficientes para la acción."""
    def __init__(self, message: str = "Permisos insuficientes para realizar esta acción.", correlation_id: str | None = None):
        super().__init__(
            message=message,
            code="FORBIDDEN_OPERATION",
            correlation_id=correlation_id,
        )


class RateLimitExceededException(GameaException):
    """Lanzada cuando un cliente supera la cuota permitida de peticiones."""
    def __init__(self, retry_after_seconds: int = 60, correlation_id: str | None = None):
        super().__init__(
            message=f"Límite de tasa excedido. Reintente en {retry_after_seconds} segundos.",
            code="RATE_LIMIT_EXCEEDED",
            correlation_id=correlation_id,
        )
        self.retry_after_seconds = retry_after_seconds


class IdempotencyConflictException(GameaException):
    """Lanzada cuando se detecta duplicación en un registro idempotente."""
    def __init__(self, message: str, correlation_id: str | None = None):
        super().__init__(
            message=message,
            code="IDEMPOTENCY_CONFLICT",
            correlation_id=correlation_id,
        )


class ImmutableAuditException(GameaException):
    """Lanzada si se intenta alterar o borrar un registro de auditoría."""
    def __init__(self, correlation_id: str | None = None):
        super().__init__(
            message="Violación de inmutabilidad: Los registros de auditoría no pueden ser modificados ni eliminados.",
            code="IMMUTABLE_AUDIT_VIOLATION",
            correlation_id=correlation_id,
        )


class InvalidStateTransitionException(GameaException):
    """Lanzada ante transiciones ilegales en la máquina de estados de sincronización (Principio XXIII)."""
    def __init__(self, current_state: str, new_state: str, correlation_id: str | None = None):
        super().__init__(
            message=f"Transición de estado inválida: no es posible pasar de '{current_state}' a '{new_state}'.",
            code="INVALID_STATE_TRANSITION",
            correlation_id=correlation_id,
        )
        self.current_state = current_state
        self.new_state = new_state
