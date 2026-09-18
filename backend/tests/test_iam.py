"""
Pruebas Unitarias de IAM — GAMEA Social Monitor
Principio XVI: Seguridad por Diseño
Principio XVII: RBAC en Backend
"""

import uuid
from datetime import timedelta

import pytest
from core.security.password import (
    hash_password,
    validate_password_complexity,
    verify_password,
)
from core.security.tokens import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from modules.shared.enums import UserRole
from modules.shared.exceptions import AuthenticationException


def test_argon2id_hashing_and_verification():
    """Valida que el hashing Argon2id funcione correctamente."""
    plain = "SuperPassword2026!#Gamea"
    hashed = hash_password(plain)

    assert hashed.startswith("$argon2id$")
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_complexity_rules():
    """Valida la política BR-IAM-004 de complejidad de contraseñas."""
    # Menor a 12 caracteres
    ok, err = validate_password_complexity("Short1!Aa")
    assert ok is False
    assert "12 caracteres" in err

    # Sin mayúscula
    ok, err = validate_password_complexity("lowercase12345!@#")
    assert ok is False
    assert "mayúscula" in err

    # Sin minúscula
    ok, err = validate_password_complexity("UPPERCASE12345!@#")
    assert ok is False
    assert "minúscula" in err

    # Sin número
    ok, err = validate_password_complexity("NoNumbersHere!@#$")
    assert ok is False
    assert "número" in err

    # Sin carácter especial
    ok, err = validate_password_complexity("NoSpecialChars12345")
    assert ok is False
    assert "carácter especial" in err

    # Contraseña constitucionalmente válida
    ok, err = validate_password_complexity("ElAltoSeguro2026!#")
    assert ok is True
    assert err is None


def test_jwt_access_and_refresh_token_lifecycle():
    """Valida creación, decodificación y expiración de tokens JWT."""
    user_id = str(uuid.uuid4())
    roles = [UserRole.SUPER_ADMIN.value, UserRole.AUDITOR.value]
    cid = "test-correlation-token-lifecycle"

    # Access Token
    access_token = create_access_token(
        subject=user_id,
        roles=roles,
        correlation_id=cid,
        expires_delta=timedelta(minutes=10),
    )
    payload = decode_token(access_token)

    assert payload["sub"] == user_id
    assert payload["roles"] == roles
    assert payload["cid"] == cid
    assert payload["type"] == "access"
    assert payload["exp"] > payload["iat"]

    # Refresh Token
    refresh_token = create_refresh_token(subject=user_id)
    refresh_payload = decode_token(refresh_token)

    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"

    # Token con firma inválida
    with pytest.raises(AuthenticationException):
        decode_token("invalid.jwt.token.string")
