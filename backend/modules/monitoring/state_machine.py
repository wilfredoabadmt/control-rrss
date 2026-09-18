"""
Máquina de Estados de Sincronización Externa — GAMEA Social Monitor
Principio XXIII: Estados Canónicos Estrictos
Principio XIV: Resiliencia
REQ-MON-002, BR-MON-004, BR-MON-005
"""


from database import utc_now
from modules.monitoring.models import ExternalSyncJob
from modules.shared.enums import SyncJobStatus
from modules.shared.exceptions import InvalidStateTransitionException

# Matriz canónica de transiciones permitidas (Principio XXIII & BR-MON-004)
VALID_TRANSITIONS: dict[SyncJobStatus, set[SyncJobStatus]] = {
    SyncJobStatus.PENDING: {
        SyncJobStatus.QUEUED,
        SyncJobStatus.CANCELLED,
    },
    SyncJobStatus.QUEUED: {
        SyncJobStatus.RUNNING,
        SyncJobStatus.CANCELLED,
    },
    SyncJobStatus.RUNNING: {
        SyncJobStatus.COMPLETED,
        SyncJobStatus.COMPLETED_WITH_WARNINGS,
        SyncJobStatus.PAUSED_RATE_LIMIT,
        SyncJobStatus.FAILED_RETRYABLE,
        SyncJobStatus.FAILED_FATAL,
        SyncJobStatus.CIRCUIT_BROKEN,
        SyncJobStatus.CANCELLED,
    },
    SyncJobStatus.PAUSED_RATE_LIMIT: {
        SyncJobStatus.QUEUED,
        SyncJobStatus.PENDING,
        SyncJobStatus.CANCELLED,
    },
    SyncJobStatus.FAILED_RETRYABLE: {
        SyncJobStatus.QUEUED,
        SyncJobStatus.FAILED_FATAL,
        SyncJobStatus.CIRCUIT_BROKEN,
        SyncJobStatus.CANCELLED,
    },
    SyncJobStatus.CIRCUIT_BROKEN: {
        SyncJobStatus.PENDING,
        SyncJobStatus.CANCELLED,
    },
    # Estados terminales: No permiten transición arbitraria sin nuevo ciclo
    SyncJobStatus.COMPLETED: set(),
    SyncJobStatus.COMPLETED_WITH_WARNINGS: set(),
    SyncJobStatus.FAILED_FATAL: set(),
    SyncJobStatus.CANCELLED: set(),
}

TERMINAL_STATES: set[SyncJobStatus] = {
    SyncJobStatus.COMPLETED,
    SyncJobStatus.COMPLETED_WITH_WARNINGS,
    SyncJobStatus.FAILED_FATAL,
    SyncJobStatus.CANCELLED,
}


class SyncStateMachine:
    """
    Controlador formal del ciclo de vida de los trabajos de sincronización externa.
    """

    @staticmethod
    def can_transition(current: str | SyncJobStatus, target: str | SyncJobStatus) -> bool:
        current_enum = SyncJobStatus(current)
        target_enum = SyncJobStatus(target)
        allowed = VALID_TRANSITIONS.get(current_enum, set())
        return target_enum in allowed

    @staticmethod
    def transition(
        job: ExternalSyncJob,
        new_status: str | SyncJobStatus,
        error_details: str | None = None,
    ) -> ExternalSyncJob:
        """
        Ejecuta y valida la transición de estado. Lanza InvalidStateTransitionException si es ilegal.
        """
        current_enum = SyncJobStatus(job.status)
        target_enum = SyncJobStatus(new_status)

        if not SyncStateMachine.can_transition(current_enum, target_enum):
            raise InvalidStateTransitionException(
                current_state=current_enum.value,
                new_state=target_enum.value,
                correlation_id=job.correlation_id,
            )

        job.status = target_enum.value

        if error_details:
            job.error_details = error_details

        if target_enum == SyncJobStatus.FAILED_RETRYABLE:
            job.retry_count = (job.retry_count or 0) + 1

        if target_enum in TERMINAL_STATES:
            job.completed_at = utc_now()

        return job
