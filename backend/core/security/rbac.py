"""
Control de Acceso Basado en Roles (RBAC) — GAMEA Social Monitor
Principio XVII: Control de Acceso Basado en Roles (RBAC) en Backend
"""

from collections.abc import Callable

from core.security.auth import get_current_user
from fastapi import Depends, HTTPException, status
from modules.iam.models import User
from modules.shared.enums import UserRole


def require_roles(*allowed_roles: UserRole) -> Callable:
    """
    Factory de dependencia para verificar que el usuario actual posea al menos
    uno de los roles permitidos. El rol SUPER_ADMIN siempre posee acceso pleno.
    """
    allowed_role_names = {r.value for r in allowed_roles}
    # Incluir SUPER_ADMIN por defecto como rol con acceso irrestricto
    allowed_role_names.add(UserRole.SUPER_ADMIN.value)

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_names = {role.name for role in current_user.roles}

        # Verificar si hay intersección de roles
        if not user_role_names.intersection(allowed_role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes: Se requiere uno de los siguientes roles: "
                       f"{', '.join(sorted(allowed_role_names))}",
            )
        return current_user

    return role_checker


def require_permissions(*required_permissions: str) -> Callable:
    """
    Factory de dependencia para verificar que el usuario posea los permisos específicos.
    """
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # SUPER_ADMIN bypass
        user_role_names = {role.name for role in current_user.roles}
        if UserRole.SUPER_ADMIN.value in user_role_names:
            return current_user

        # Recolectar todos los códigos de permisos de los roles del usuario
        user_permission_codes = set()
        for role in current_user.roles:
            for perm in role.permissions:
                user_permission_codes.add(perm.code)

        for perm_code in required_permissions:
            if perm_code not in user_permission_codes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permiso insuficiente: Se requiere la capacidad '{perm_code}'.",
                )
        return current_user

    return permission_checker
