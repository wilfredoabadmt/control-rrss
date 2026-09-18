"""
Cifrado a Nivel de Aplicación para Datos PII — GAMEA Social Monitor
Principio XX: Protección de Datos Personales y Cifrado
"""

import base64
import hashlib
import hmac

from config import settings
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    """Obtiene la instancia de Fernet con la clave configurada."""
    key = settings.FIELD_ENCRYPTION_KEY
    # Asegurar que la clave tenga formato base64 de 32 bytes
    if isinstance(key, str) and len(key.encode("utf-8")) != 44:
        derived = hashlib.sha256(key.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(derived).decode("utf-8")
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)


def encrypt_field(plain_text: str) -> str:
    """Cifra un campo sensible (PII) usando Fernet/AES-256."""
    if not plain_text:
        return ""
    f = _get_fernet()
    encrypted_bytes = f.encrypt(plain_text.strip().encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_field(encrypted_text: str) -> str:
    """Descifra un campo sensible previamente cifrado."""
    if not encrypted_text:
        return ""
    f = _get_fernet()
    decrypted_bytes = f.decrypt(encrypted_text.strip().encode("utf-8"))
    return decrypted_bytes.decode("utf-8")


def hash_blind_index(value: str) -> str:
    """
    Genera un índice ciego (blind index) determinista con HMAC-SHA256.
    Permite búsquedas exactas por documento sin descifrar la base de datos.
    """
    if not value:
        return ""
    key = settings.JWT_SECRET_KEY.encode("utf-8")
    norm_val = value.strip().upper().encode("utf-8")
    return hmac.new(key, norm_val, hashlib.sha256).hexdigest()
