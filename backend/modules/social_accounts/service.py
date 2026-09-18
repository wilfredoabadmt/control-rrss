"""
Capa de Servicios de Cuentas Sociales — GAMEA Social Monitor
Principio VII: Identidad Única
REQ-SAB-001, REQ-SAB-002, REQ-SAB-003, REQ-PUB-001
"""

import uuid

from core.audit.service import record_audit_event
from core.logging_config import get_correlation_id
from core.security.encryption import encrypt_field
from modules.employees.models import Employee
from modules.iam.models import User
from modules.shared.enums import AuditAction, BindingStatus
from modules.shared.exceptions import EntityNotFoundException, ValidationException
from modules.social_accounts.models import (
    InstitutionalAccount,
    SocialAccount,
    SocialPlatform,
    UsernameHistory,
)
from modules.social_accounts.schemas import (
    BindSocialAccountRequest,
    InstitutionalAccountCreate,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class SocialAccountService:

    @staticmethod
    async def bind_account(
        db: AsyncSession,
        req: BindSocialAccountRequest,
        current_user: User,
    ) -> SocialAccount:
        """
        Vincula una cuenta de red social a un funcionario (REQ-SAB-001).
        Verifica unicidad en la plataforma.
        """
        cid = get_correlation_id()

        # 1. Validar que el funcionario exista
        stmt_emp = select(Employee).where(Employee.employee_id == req.employee_id)
        emp = (await db.execute(stmt_emp)).scalar_one_or_none()
        if not emp:
            raise EntityNotFoundException("Employee", req.employee_id)

        # 2. Validar que la plataforma exista
        stmt_plat = select(SocialPlatform).where(SocialPlatform.id == req.platform_id)
        plat = (await db.execute(stmt_plat)).scalar_one_or_none()
        if not plat:
            raise EntityNotFoundException("SocialPlatform", str(req.platform_id))

        # 3. Validar si el funcionario ya tiene cuenta activa en esta plataforma
        stmt_active = select(SocialAccount).where(
            SocialAccount.employee_id == req.employee_id,
            SocialAccount.platform_id == req.platform_id,
            SocialAccount.binding_status == BindingStatus.ACTIVE.value,
        )
        already_active = (await db.execute(stmt_active)).scalar_one_or_none()
        if already_active:
            raise ValidationException(
                f"El funcionario '{req.employee_id}' ya posee una cuenta activa vinculada en {plat.display_name}."
            )

        # 4. Validar unicidad del external_user_id si se proporciona
        if req.external_user_id:
            stmt_uniq_ext = select(SocialAccount).where(
                SocialAccount.platform_id == req.platform_id,
                SocialAccount.external_user_id == req.external_user_id,
                SocialAccount.binding_status == BindingStatus.ACTIVE.value,
            )
            existing_ext = (await db.execute(stmt_uniq_ext)).scalar_one_or_none()
            if existing_ext:
                raise ValidationException(
                    f"El identificador social '{req.external_user_id}' ya se encuentra vinculado a otro funcionario."
                )

        account = SocialAccount(
            employee_id=req.employee_id,
            platform_id=req.platform_id,
            external_user_id=req.external_user_id,
            current_username=req.current_username.strip(),
            profile_url=req.profile_url,
            binding_status=BindingStatus.ACTIVE.value,
        )
        db.add(account)
        await db.flush()

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="SocialAccount",
            entity_id=str(account.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={
                "employee_id": account.employee_id,
                "platform": plat.name,
                "username": account.current_username,
                "external_id": account.external_user_id,
            },
            correlation_id=cid,
        )
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def unbind_account(
        db: AsyncSession,
        account_id: uuid.UUID,
        reason: str,
        current_user: User,
    ) -> SocialAccount:
        """
        Desvincula una cuenta social preservando el historial previo (REQ-SAB-003).
        """
        stmt = select(SocialAccount).where(SocialAccount.id == account_id)
        account = (await db.execute(stmt)).scalar_one_or_none()
        if not account:
            raise EntityNotFoundException("SocialAccount", str(account_id))

        account.binding_status = BindingStatus.INACTIVE.value
        cid = get_correlation_id()

        await record_audit_event(
            db=db,
            action=AuditAction.DELETE,
            entity_name="SocialAccount",
            entity_id=str(account.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            details={"reason": reason, "operation": "UNBIND_ACCOUNT"},
            correlation_id=cid,
        )
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def update_username(
        db: AsyncSession,
        account_id: uuid.UUID,
        new_username: str,
        current_user: User,
    ) -> SocialAccount:
        """
        Actualiza el @username y registra en UsernameHistory (T-302 / REQ-SAB-002).
        """
        stmt = (
            select(SocialAccount)
            .where(SocialAccount.id == account_id)
            .options(selectinload(SocialAccount.username_history))
        )
        account = (await db.execute(stmt)).scalar_one_or_none()
        if not account:
            raise EntityNotFoundException("SocialAccount", str(account_id))

        new_val = new_username.strip()
        if new_val == account.current_username:
            return account

        prev_username = account.current_username
        account.current_username = new_val
        cid = get_correlation_id()

        history_entry = UsernameHistory(
            social_account_id=account.id,
            previous_username=prev_username,
            new_username=new_val,
            recorded_by_user_id=str(current_user.id),
            correlation_id=cid,
        )
        account.username_history.append(history_entry)
        db.add(history_entry)

        await record_audit_event(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="SocialAccount",
            entity_id=str(account.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            previous_state={"username": prev_username},
            new_state={"username": new_val},
            details={"operation": "USERNAME_CHANGE"},
            correlation_id=cid,
        )
        await db.commit()
        stmt_refreshed = (
            select(SocialAccount)
            .where(SocialAccount.id == account_id)
            .options(
                selectinload(SocialAccount.username_history),
                selectinload(SocialAccount.platform),
            )
            .execution_options(populate_existing=True)
        )
        return (await db.execute(stmt_refreshed)).scalar_one()

    @staticmethod
    async def create_institutional_account(
        db: AsyncSession,
        acc_in: InstitutionalAccountCreate,
        current_user: User,
    ) -> InstitutionalAccount:
        """Registra una cuenta oficial municipal para monitoreo (REQ-PUB-001)."""
        encrypted_token = encrypt_field(acc_in.access_token) if acc_in.access_token else None

        inst_acc = InstitutionalAccount(
            platform_id=acc_in.platform_id,
            external_page_id=acc_in.external_page_id.strip(),
            account_name=acc_in.account_name.strip(),
            handle=acc_in.handle.strip(),
            access_token_encrypted=encrypted_token,
            is_monitored=acc_in.is_monitored,
        )
        db.add(inst_acc)
        await db.flush()

        await record_audit_event(
            db=db,
            action=AuditAction.CREATE,
            entity_name="InstitutionalAccount",
            entity_id=str(inst_acc.id),
            user_id=str(current_user.id),
            user_email=current_user.email,
            new_state={"handle": inst_acc.handle, "page_id": inst_acc.external_page_id},
        )
        await db.commit()
        await db.refresh(inst_acc)
        return inst_acc
