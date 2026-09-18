"""
Enums Canónicos del Dominio — GAMEA Social Monitor
Principio V: Rigor Taxonómico
Principio XXIII: Tipos Canónicos Estrictos
"""

from enum import StrEnum


class DataOriginType(StrEnum):
    """
    Las 8 categorías canónicas de origen de datos (Principio V).
    Cada interacción DEBE clasificarse obligatoriamente en uno de estos orígenes.
    """
    OFFICIAL_ACCOUNT_POST = "OFFICIAL_ACCOUNT_POST"
    OFFICIAL_ACCOUNT_COMMENT = "OFFICIAL_ACCOUNT_COMMENT"
    OFFICIAL_ACCOUNT_REPLY = "OFFICIAL_ACCOUNT_REPLY"
    CITIZEN_POST_MENTIONING = "CITIZEN_POST_MENTIONING"
    CITIZEN_COMMENT_ON_OFFICIAL = "CITIZEN_COMMENT_ON_OFFICIAL"
    EMPLOYEE_INTERACTION_OFFICIAL = "EMPLOYEE_INTERACTION_OFFICIAL"
    THIRD_PARTY_OBSERVATION = "THIRD_PARTY_OBSERVATION"
    EXTERNAL_IMPORT_BATCH = "EXTERNAL_IMPORT_BATCH"


class SyncJobStatus(StrEnum):
    """
    Los 10 estados canónicos de trabajos de sincronización externa (Principio V).
    """
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PAUSED_RATE_LIMIT = "PAUSED_RATE_LIMIT"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_WARNINGS = "COMPLETED_WITH_WARNINGS"
    FAILED_RETRYABLE = "FAILED_RETRYABLE"
    FAILED_FATAL = "FAILED_FATAL"
    CANCELLED = "CANCELLED"
    CIRCUIT_BROKEN = "CIRCUIT_BROKEN"


class VerificationStatus(StrEnum):
    """
    Estados de verificación de cumplimiento de interacción institucional.
    """
    PENDING = "PENDING"
    VERIFIED_AUTOMATIC = "VERIFIED_AUTOMATIC"
    VERIFIED_MANUAL = "VERIFIED_MANUAL"
    REJECTED = "REJECTED"
    UNVERIFIABLE = "UNVERIFIABLE"
    EXEMPT = "EXEMPT"


class InteractionType(StrEnum):
    """
    Tipos de interacción en redes sociales.
    """
    LIKE = "LIKE"
    LOVE = "LOVE"
    CARE = "CARE"
    HAHA = "HAHA"
    WOW = "WOW"
    SAD = "SAD"
    ANGRY = "ANGRY"
    COMMENT = "COMMENT"
    REPLY = "REPLY"
    SHARE = "SHARE"
    REPOST = "REPOST"
    VIEW = "VIEW"
    OTHER = "OTHER"


class CaptureMethod(StrEnum):
    """
    Método técnico utilizado para capturar la interacción.
    """
    WEBHOOK = "WEBHOOK"
    POLLING = "POLLING"
    MANUAL_IMPORT = "MANUAL_IMPORT"
    BACKFILL = "BACKFILL"


class BindingStatus(StrEnum):
    """
    Estado de vinculación entre funcionario y cuenta de red social.
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    DISPUTED = "DISPUTED"


class EmployeeStatus(StrEnum):
    """
    Estado del funcionario en el Gobierno Municipal.
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"


class SocialPlatformType(StrEnum):
    """
    Plataformas de redes sociales soportadas.
    """
    FACEBOOK = "FACEBOOK"
    TIKTOK = "TIKTOK"


class UserRole(StrEnum):
    """
    Los 7 roles constitucionales del sistema (Principio XVII).
    """
    SUPER_ADMIN = "SUPER_ADMIN"
    AUDITOR = "AUDITOR"
    DIRECTOR = "DIRECTOR"
    COMMUNICATIONS_LEAD = "COMMUNICATIONS_LEAD"
    ANALYST = "ANALYST"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


class AuditAction(StrEnum):
    """
    Acciones registradas en el registro de auditoría append-only (Principio X).
    """
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    EXPORT = "EXPORT"
    EXECUTE = "EXECUTE"
    VERIFY = "VERIFY"
    CONFIG_CHANGE = "CONFIG_CHANGE"
