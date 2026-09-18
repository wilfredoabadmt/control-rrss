"""
Seguridad Criptográfica de Contraseñas — GAMEA Social Monitor
ADR-004: Argon2id para Hashing de Contraseñas
Principio XVI: Seguridad por Diseño
"""

import re

from passlib.context import CryptContext

# Contexto de hashing con Argon2id como esquema principal
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",       # Argon2id: resistente a side-channel y GPU
    argon2__memory_cost=65536, # 64 MB
    argon2__time_cost=3,      # 3 iteraciones
    argon2__parallelism=4,    # 4 hilos
)


def hash_password(password: str) -> str:
    """Genera un hash Argon2id seguro para la contraseña."""
    return str(pwd_context.hash(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash almacenado."""
    return bool(pwd_context.verify(plain_password, hashed_password))


def validate_password_complexity(password: str) -> tuple[bool, str | None]:
    """
    Valida la política constitucional de contraseñas (BR-IAM-004):
    - Longitud mínima: 12 caracteres.
    - Al menos una letra mayúscula.
    - Al menos una letra minúscula.
    - Al menos un número.
    - Al menos un carácter especial (@$!%*?&#/.-_).
    """
    if len(password) < 12:
        return False, "La contraseña debe tener al menos 12 caracteres."
    if not re.search(r"[A-Z]", password):
        return False, "La contraseña debe contener al menos una letra mayúscula."
    if not re.search(r"[a-z]", password):
        return False, "La contraseña debe contener al menos una letra minúscula."
    if not re.search(r"\d", password):
        return False, "La contraseña debe contener al menos un número."
    if not re.search(r"[@$!%*?&#/.\-_]", password):
        return False, "La contraseña debe contener al menos un carácter especial (@$!%*?&#/.-_)."
    return True, None
