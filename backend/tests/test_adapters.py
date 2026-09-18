"""
Pruebas de Adaptadores de Redes Sociales (Facebook & TikTok) — GAMEA Social Monitor
Fase 5: Adaptadores de Integración
Principio XII: Principio Abierto/Cerrado para Plataformas
Principio XIV: Resiliencia del Sistema
Principio V: No Inventar Datos
REQ-FBI-001 a REQ-FBI-006, REQ-TKI-001 a REQ-TKI-003
"""

import hashlib
import hmac

import pytest
from config import settings
from fastapi.testclient import TestClient
from main import app
from modules.facebook_adapter.fakes import FakeFacebookGraphClient
from modules.facebook_adapter.resilience import (
    CircuitBreaker,
    CircuitBreakerOpenException,
    CircuitState,
)
from modules.facebook_adapter.webhook import verify_facebook_signature
from modules.shared.enums import VerificationStatus
from modules.shared.exceptions import AuthenticationException, RateLimitExceededException
from modules.tiktok_adapter.client import TikTokClient
from modules.tiktok_adapter.fakes import FakeTikTokClient


@pytest.fixture
def client():
    return TestClient(app)


# -----------------------------------------------------------------------------
# T-501 & T-502: Adaptador Facebook — Graph API & Manejo de Privacidad
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_facebook_client_fetch_comments_with_author():
    """
    REQ-FBI-002: Fetch comments cuando Meta suministra el campo 'from'.
    """
    fake = FakeFacebookGraphClient(simulate_empty_from=False)
    comments, cursor = await fake.fetch_comments("post_123", "valid_token")

    assert len(comments) == 1
    comm = comments[0]
    assert comm["external_interaction_id"] == "post_123_comm_01"
    assert comm["external_author_id"] == "fb_user_112233"
    assert comm["external_author_name"] == "Funcionario Municipal"
    assert comm["content_text"] == "Felicidades alcaldesa, adelante El Alto"


@pytest.mark.asyncio
async def test_facebook_client_fetch_comments_with_empty_from():
    """
    REQ-FBI-002 & Principio V: Cuando Meta omite el campo 'from' por privacidad,
    el cliente preserva external_author_id=None sin inventar identidad.
    """
    fake = FakeFacebookGraphClient(simulate_empty_from=True)
    comments, cursor = await fake.fetch_comments("post_123", "valid_token")

    assert len(comments) == 1
    comm = comments[0]
    assert comm["external_author_id"] is None
    assert comm["external_author_name"] is None
    assert "privado" in comm["content_text"]


@pytest.mark.asyncio
async def test_facebook_client_rate_limiting_and_auth_exceptions():
    """
    REQ-FBI-006: Excepciones de límite de tasa (429) y autenticación (OAuthException).
    """
    fake_rate = FakeFacebookGraphClient(simulate_rate_limit=True)
    with pytest.raises(RateLimitExceededException) as exc_info:
        await fake_rate.fetch_comments("post_123", "token")
    assert exc_info.value.retry_after_seconds == 60

    fake_auth = FakeFacebookGraphClient(simulate_auth_error=True)
    with pytest.raises(AuthenticationException):
        await fake_auth.fetch_post_metadata("post_123", "invalid_token")


# -----------------------------------------------------------------------------
# T-503: Receptor de Webhooks de Meta (Facebook)
# -----------------------------------------------------------------------------

def test_facebook_webhook_subscription_verification(client: TestClient):
    """
    REQ-FBI-005: Verificación del endpoint GET de suscripción con token y challenge.
    """
    # 1. Token correcto -> Retorna challenge con 200 OK
    resp = client.get(
        f"{settings.API_V1_STR}/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": "1158201444",
            "hub.verify_token": settings.FACEBOOK_VERIFY_TOKEN,
        },
    )
    assert resp.status_code == 200
    assert resp.text == "1158201444"

    # 2. Token erróneo -> Retorna 403 Forbidden
    resp_err = client.get(
        f"{settings.API_V1_STR}/webhooks/facebook",
        params={
            "hub.mode": "subscribe",
            "hub.challenge": "1158201444",
            "hub.verify_token": "token_falso_no_autorizado",
        },
    )
    assert resp_err.status_code == 403


def test_facebook_webhook_signature_verification():
    """
    REQ-FBI-005: Validación de firma HMAC-SHA256 en X-Hub-Signature-256.
    """
    secret = "secret_app_gamea_test_2026"
    raw_payload = b'{"entry": [{"id": "page_123", "time": 1773576000}]}'

    mac = hmac.new(secret.encode("utf-8"), msg=raw_payload, digestmod=hashlib.sha256)
    valid_sig = f"sha256={mac.hexdigest()}"

    assert verify_facebook_signature(raw_payload, valid_sig, secret) is True
    assert verify_facebook_signature(raw_payload, "sha256=firma_invalida_adulterada", secret) is False
    assert verify_facebook_signature(raw_payload, None, secret) is False


# -----------------------------------------------------------------------------
# T-504: Resiliencia y Circuit Breaker
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_circuit_breaker_behavior():
    """
    REQ-FBI-006: Comportamiento del Circuit Breaker ante fallos sucesivos.
    """
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=0.1)
    assert cb.state == CircuitState.CLOSED

    async def faulty_remote_call():
        raise RuntimeError("Simulated external connection error")

    async def healthy_remote_call():
        return "success"

    # Fallar 3 veces consecutivas para abrir el circuito
    for _ in range(3):
        with pytest.raises(RuntimeError):
            await cb.execute(faulty_remote_call)

    assert cb.state == CircuitState.OPEN

    # Las siguientes llamadas deben ser bloqueadas inmediatamente por el breaker
    with pytest.raises(CircuitBreakerOpenException):
        await cb.execute(healthy_remote_call)


# -----------------------------------------------------------------------------
# T-506 & T-507: Adaptador TikTok — Display API y Restricción Epistémica
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tiktok_client_fetch_videos_and_metrics():
    """
    REQ-TKI-001: Consulta de videos institucionales y métricas agregadas.
    """
    fake = FakeTikTokClient()
    videos, cursor, has_more = await fake.fetch_videos("fake_tiktok_access_token")

    assert len(videos) == 1
    v = videos[0]
    assert v["external_post_id"] == "tt_video_778899"
    assert v["metrics"]["views"] == 25400
    assert v["metrics"]["likes"] == 3200
    assert v["metrics"]["comments"] == 410
    assert v["metrics"]["shares"] == 180


def test_tiktok_epistemic_restriction_status():
    """
    REQ-TKI-002 & Principio V: La API de TikTok no permite individualizar autores de comentarios.
    Debe reportar formalmente API_RESTRICTED.
    """
    status = TikTokClient.get_comment_epistemic_restriction_status()
    assert status == VerificationStatus.API_RESTRICTED.value
