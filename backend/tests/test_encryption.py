"""
Pruebas Unitarias de Cifrado de PII — GAMEA Social Monitor
Principio XX: Protección de Datos Personales
"""

from core.security.encryption import decrypt_field, encrypt_field, hash_blind_index


def test_encrypt_and_decrypt_field():
    """Valida el ciclo de cifrado y descifrado de un documento de identidad."""
    original_ci = "4839201-LP"
    encrypted = encrypt_field(original_ci)

    assert encrypted != original_ci
    assert len(encrypted) > 20

    decrypted = decrypt_field(encrypted)
    assert decrypted == original_ci


def test_blind_index_is_deterministic():
    """Valida que el índice ciego HMAC-SHA256 sea determinista."""
    ci1 = "8492011"
    ci2 = "8492011 "
    ci3 = "9999999"

    hash1 = hash_blind_index(ci1)
    hash2 = hash_blind_index(ci2)
    hash3 = hash_blind_index(ci3)

    assert hash1 == hash2  # Normalizado con strip
    assert hash1 != hash3
    assert len(hash1) == 64
