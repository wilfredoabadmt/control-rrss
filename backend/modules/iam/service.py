"""
Capa de Servicios de IAM — GAMEA Social Monitor
Implementación de Reglas de Negocio Constitucionales (BR-IAM-001 a BR-IAM-013)
"""

import uuid
from datetime import UTC, datetime, timedelta

from config import settings
from core.audit.service import record_audit_event
from core.security.password import (
    hash_password,
    validate_password_complexity,
    verify_password,
)
from core.security.tokens import create_access_token, create_refresh_token, decode_token
from modules.iam.models import Role, User
from modules.iam.schemas import TokenResponse, UserCreate, UserResponse, UserUpdate
from modules.shared.enums import AuditAction, UserRole
from modules.shared.exceptions import (
    AuthenticationException,
    EntityNotFoundException,
    ValidationException,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class IAMService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
        stmt = (
            select(User)
            .where(User.email == email.lower().strip())
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.roles).selectinload(Role.permissions))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        """
        Autentica credenciales respetando bloqueo por intentos fallidos (BR-IAM-002).
        """
        user = await IAMService.get_user_by_email(db, email)

        if not user:
            # Registrar intento fallido para usuario inexistente sin filtrar existencia
            await record_audit_event(
                db=db,
                action=AuditAction.LOGIN_FAILED,
                entity_name="User",
                entity_id=None,
                details={"email": email, "reason": "user_not_found"},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise AuthenticationException("Credenciales inválidas.")

        # Verificar bloqueo por intentos fallidos
        if user.is_locked():
            await record_audit_event(
                db=db,
                action=AuditAction.LOGIN_FAILED,
                entity_name="User",
                entity_id=str(user.id),
                user_id=str(user.id),
                user_email=user.email,
                details={"reason": "account_locked", "locked_until": user.locked_until.isoformat() if user.locked_until else None},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            raise AuthenticationException(
                f"Cuenta bloqueada temporalmente por intentos fallidos. Reintente después de {user.locked_until} UTC."
            )

        # Verificar si la cuenta está activa
        if not user.is_active:
            raise AuthenticationException("Cuenta institucional inactiva. Contacte al Administrador.")

        # Validar contraseña con Argon2id
        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            # Bloquear si alcanza 5 intentos consecutivos (BR-IAM-002)
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
                await record_audit_event(
                    db=db,
                    action=AuditAction.CONFIG_CHANGE,
                    entity_name="User",
                    entity_id=str(user.id),
                    user_id=str(user.id),
                    user_email=user.email,
                    details={"event": "ACCOUNT_LOCKED", "failed_attempts": user.failed_login_attempts},
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
            await record_audit_event(
                db=db,
                action=AuditAction.LOGIN_FAILED,
                entity_name="User",
                entity_id=str(user.id),
                user_id=str(user.id),
                user_email=user.email,
                details={"failed_attempts": user.failed_login_attempts},
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await db.commit()
            raise AuthenticationException("Credenciales inválidas.")

        # Autenticación Exitosa: Resetear contador y registrar timestamp
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.now(UTC)

        role_names = [role.name for role in user.roles]
        access_token = create_access_token(
            subject=str(user.id),
            roles=role_names,
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        await record_audit_event(
            db=db,
            action=AuditAction.LOGIN,
            entity_name="User",
            entity_id=str(user.id),
            user_id=str(user.id),
            user_email=user.email,
            details={"roles": role_names},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> TokenResponse:
        """Renueva el Access Token utilizando un Refresh Token válido."""
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationException("Token no es de tipo refresh.")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise AuthenticationException("Token no contiene identificador de usuario.")

        user = await IAMService.get_user_by_id(db, uuid.UUID(user_id_str))
        if not user or not user.is_active:
            raise AuthenticationException("Usuario no encontrado o inactivo.")

        role_names = [role.name for role in user.roles]
        new_access_token = create_access_token(subject=str(user.id), roles=role_names)
        new_refresh_token = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_in: UserCreate,
        current_user: User | None = None,
    ) -> User:
        """Crea un nuevo usuario con validación de complejidad y auditoría."""
        # Validar si correo ya existe
        existing = await IAMService.get_user_by_email(db, user_in.email)
        if existing:
            raise ValidationException(f"El correo '{user_in.email}' ya se encuentra registrado.")

        # Validar política constitucional de contraseñas (BR-IAM-004)
        valid, err_msg = validate_password_complexity(user_in.password)
        if not valid:
            raise ValidationException(err_msg or "Contraseña no cumple los requisitos de seguridad.")

        # Asignar roles solicitados
        roles = []
        for r_name in user_in.role_names:
            stmt = select(Role).where(Role.name == r_name)
            result = await db.execute(stmt)
            role = result.scalar_one_or_none()
            if role:
                roles.append(role)

        if not roles:
            # Asignar rol VIEWER por defecto (BR-IAM-007)
            stmt = select(Role).where(Role.name == UserRole.VIEWER.value)
            result = await db.execute(stmt)
            default_role = result.scalar_one_or_none()
            if default_role:
                roles.append(default_role)

        new_user = User(
            email=user_in.email.lower().strip(),
            full_name=user_in.full_name.strip(),
            password_hash=hash_password(user_in.password),
            is_active=user_in.is_active,
            roles=roles,
        )
        db.add(new_user)
        await db.flush()

        # Registrar auditoría (BR-IAM-010)
        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="User",
            entity_id=str(new_user.id),
            user_id=str(current_user.id) if current_user else None,
            user_email=current_user.email if current_user else None,
            new_state={"email": new_user.email, "full_name": new_user.full_name, "roles": [r.name for r in roles]},
        )
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: uuid.UUID,
        user_in: UserUpdate,
        current_user: User,
    ) -> User:
        """Actualiza atributos de usuario con auditoría de cambios."""
        user = await IAMService.get_user_by_id(db, user_id)
        if not user:
            raise EntityNotFoundException("User", str(user_id))

        previous_state = {"full_name": user.full_name, "is_active": user.is_active}

        if user_in.full_name is not None:
            user.full_name = user_in.full_name.strip()
        if user_in.is_active is not None:
            user.is_active = user_in.is_active

        new_state = {"full_name": user.full_name, "is_active": user.is_active}

        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="User",
            entity_id=str(user.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            previous_state=previous_state,
            new_state=new_state,
        )
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def assign_roles(
        db: AsyncSession,
        user_id: uuid.UUID,
        role_names: list[str],
        current_user: User,
    ) -> User:
        """Asigna roles a un usuario. Exclusivo para SUPER_ADMIN (BR-IAM-008)."""
        user = await IAMService.get_user_by_id(db, user_id)
        if not user:
            raise EntityNotFoundException("User", str(user_id))

        old_roles = [r.name for r in user.roles]

        # Cargar los nuevos roles
        stmt = select(Role).where(Role.name.in_(role_names))
        result = await db.execute(stmt)
        new_roles = list(result.scalars().all())

        if not new_roles:
            raise ValidationException("Al menos un rol válido debe ser asignado.")

        user.roles = new_roles

        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="User",
            entity_id=str(user.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            previous_state={"roles": old_roles},
            new_state={"roles": [r.name for r in new_roles]},
            details={"operation": "ASSIGN_ROLES"},
        )
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def deactivate_user(
        db: AsyncSession,
        user_id: uuid.UUID,
        current_user: User,
    ) -> User:
        """Baja lógica de usuario (BR-IAM-009). No elimina físicamente."""
        user = await IAMService.get_user_by_id(db, user_id)
        if not user:
            raise EntityNotFoundException("User", str(user_id))

        user.is_active = False

        await record_audit_event(
            db=db,
            action=AuditAction.DELETE,
            entity_name="User",
            entity_id=str(user.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            details={"operation": "DEACTIVATE_USER", "is_active": False},
        )
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def list_users(
        db: AsyncSession,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[User], int]:
        """Consulta paginada de usuarios."""
        total_stmt = select(func.count()).select_from(User)
        total_result = await db.execute(total_stmt)
        total = total_result.scalar_one()

        stmt = (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        users = list(result.scalars().all())
        return users, total
