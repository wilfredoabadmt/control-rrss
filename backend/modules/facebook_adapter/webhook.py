"""
Receptor de Webhooks de Meta (Facebook / Instagram) — GAMEA Social Monitor
Principio XIV: Resiliencia
Principio XV: Ingesta Idempotente
REQ-FBI-005
"""

import hashlib
import hmac
import json
from typing import Any

from config import settings
from core.logging_config import get_logger
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response, status

logger = get_logger(__name__)

router = APIRouter(prefix="/webhooks/facebook", tags=["Webhooks"])


def verify_facebook_signature(payload: bytes, signature_header: str | None, app_secret: str) -> bool:
    """
    Valida la firma HMAC-SHA256 enviada por Meta en el encabezado X-Hub-Signature-256.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_signature = signature_header[7:]
    mac = hmac.new(app_secret.encode("utf-8"), msg=payload, digestmod=hashlib.sha256)
    computed_signature = mac.hexdigest()

    return hmac.compare_digest(computed_signature, expected_signature)


@router.get("", include_in_schema=False)
@router.get("/", summary="Verificación de suscripción a Webhooks de Meta (REQ-FBI-005)")
async def verify_webhook_subscription(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    """
    Endpoint de desafío (challenge) para registro y verificación de webhooks en Meta Developers.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.FACEBOOK_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain", status_code=status.HTTP_200_OK)

    logger.warning("facebook_webhook_subscription_failed", hub_mode=hub_mode)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token de verificación inválido")


@router.post("", include_in_schema=False)
@router.post("/", summary="Recepción de eventos asíncronos de Meta (REQ-FBI-005)")
async def receive_facebook_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Recepción de notificaciones de publicaciones, comentarios y reacciones en tiempo real.
    """
    raw_body = await request.body()

    # Validar firma si app_secret está configurado
    if (
        settings.FACEBOOK_APP_SECRET
        and settings.FACEBOOK_APP_SECRET != "mock_facebook_app_secret"
        and not verify_facebook_signature(raw_body, x_hub_signature_256, settings.FACEBOOK_APP_SECRET)
    ):
        logger.error("facebook_webhook_invalid_signature")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Firma criptográfica de webhook inválida",
        )

    try:
        payload: dict[str, Any] = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        logger.error("facebook_webhook_payload_decode_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload no es un JSON válido",
        ) from exc

    # Procesar entradas
    entries = payload.get("entry", [])
    logger.info("facebook_webhook_received", entries_count=len(entries))

    # Retornar 200 OK inmediatamente a Meta conforme a los requisitos de su protocolo
    return {"status": "EVENT_RECEIVED", "entries_count": len(entries)}
