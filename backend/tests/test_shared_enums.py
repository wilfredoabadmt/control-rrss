"""
Pruebas Unitarias de Enums Canónicos — GAMEA Social Monitor
Principio V: Rigor Taxonómico
Principio XXIII: Tipos Canónicos
"""

from modules.shared.enums import (
    CaptureMethod,
    DataOriginType,
    InteractionType,
    SocialPlatformType,
    SyncJobStatus,
    UserRole,
    VerificationStatus,
)


def test_data_origin_type_has_exact_eight_canonical_categories():
    """Principio V: Debe contener exactamente las 8 categorías canónicas."""
    expected_categories = {
        "OFFICIAL_ACCOUNT_POST",
        "OFFICIAL_ACCOUNT_COMMENT",
        "OFFICIAL_ACCOUNT_REPLY",
        "CITIZEN_POST_MENTIONING",
        "CITIZEN_COMMENT_ON_OFFICIAL",
        "EMPLOYEE_INTERACTION_OFFICIAL",
        "THIRD_PARTY_OBSERVATION",
        "EXTERNAL_IMPORT_BATCH",
    }
    actual_categories = {e.value for e in DataOriginType}
    assert len(DataOriginType) == 8
    assert actual_categories == expected_categories


def test_sync_job_status_has_exact_ten_canonical_states():
    """Principio V: Debe contener exactamente los 10 estados canónicos."""
    expected_states = {
        "PENDING",
        "QUEUED",
        "RUNNING",
        "PAUSED_RATE_LIMIT",
        "COMPLETED",
        "COMPLETED_WITH_WARNINGS",
        "FAILED_RETRYABLE",
        "FAILED_FATAL",
        "CANCELLED",
        "CIRCUIT_BROKEN",
    }
    actual_states = {e.value for e in SyncJobStatus}
    assert len(SyncJobStatus) == 10
    assert actual_states == expected_states


def test_user_roles_has_exact_seven_constitutional_roles():
    """Principio XVII: Los 7 roles de acceso del sistema."""
    expected_roles = {
        "SUPER_ADMIN",
        "AUDITOR",
        "DIRECTOR",
        "COMMUNICATIONS_LEAD",
        "ANALYST",
        "OPERATOR",
        "VIEWER",
    }
    actual_roles = {e.value for e in UserRole}
    assert len(UserRole) == 7
    assert actual_roles == expected_roles


def test_interaction_types_contains_standard_actions():
    """Verifica presencia de reacciones y acciones clave."""
    assert InteractionType.LIKE.value == "LIKE"
    assert InteractionType.LOVE.value == "LOVE"
    assert InteractionType.COMMENT.value == "COMMENT"
    assert InteractionType.SHARE.value == "SHARE"
    assert InteractionType.REPOST.value == "REPOST"


def test_social_platform_types():
    """Verifica plataformas iniciales de monitoreo."""
    assert SocialPlatformType.FACEBOOK.value == "FACEBOOK"
    assert SocialPlatformType.TIKTOK.value == "TIKTOK"


def test_verification_status():
    """Verifica estados de verificación."""
    assert VerificationStatus.VERIFIED_AUTOMATIC.value == "VERIFIED_AUTOMATIC"
    assert VerificationStatus.VERIFIED_MANUAL.value == "VERIFIED_MANUAL"
    assert VerificationStatus.REJECTED.value == "REJECTED"


def test_capture_methods():
    """Verifica métodos de captura técnica."""
    expected_methods = {"WEBHOOK", "POLLING", "MANUAL_IMPORT", "BACKFILL"}
    assert {e.value for e in CaptureMethod} == expected_methods
