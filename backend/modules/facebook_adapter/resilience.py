"""
Políticas de Resiliencia, Reintentos y Circuit Breaker — GAMEA Social Monitor
Principio XIV: Resiliencia del Sistema
REQ-FBI-006
"""

import time
from collections.abc import Callable
from enum import StrEnum
from typing import Any, TypeVar

from modules.shared.exceptions import GameaException

T = TypeVar("T")


class CircuitState(StrEnum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenException(GameaException):
    def __init__(self, message: str = "Circuit Breaker is OPEN. Conexión externa suspendida temporalmente."):
        super().__init__(message=message, code="CIRCUIT_BREAKER_OPEN")


class CircuitBreaker:
    """
    Implementación del patrón Circuit Breaker para llamadas a APIs externas.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 30.0,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: float = 0.0

    def record_success(self) -> None:
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            elapsed = time.time() - self.last_failure_time
            if elapsed >= self.recovery_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                return True
            return False

        # HALF_OPEN permite una prueba
        return True

    async def execute(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        if not self.can_execute():
            raise CircuitBreakerOpenException()

        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise
