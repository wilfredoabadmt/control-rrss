"""
Script de Sembrado de Datos Iniciales (Superadmin, Roles y Plataformas)
Ejecución: python scripts/seed_admin.py
"""
import asyncio
import sys
from pathlib import Path

# Añadir backend al sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from config import settings  # noqa: E402
from core.security.password import hash_password  # noqa: E402
from database import AsyncSessionLocal, Base, async_engine  # noqa: E402
from modules.iam.models import Role, User  # noqa: E402
from modules.iam.seed import seed_roles_and_permissions  # noqa: E402
from modules.shared.enums import UserRole  # noqa: E402
from modules.social_accounts.seed import seed_social_platforms  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402


async def seed_all():
    print("🚀 Iniciando inicialización y sembrado de base de datos...")

    # 1. Crear tablas si no existen
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de base de datos verificadas/creadas.")

    async with AsyncSessionLocal() as session:
        # 2. Sembrar Roles y Permisos
        roles = await seed_roles_and_permissions(session)
        print(f"✅ {len(roles)} roles constitucionales verificados.")

        # 3. Sembrar Plataformas Sociales
        platforms = await seed_social_platforms(session)
        print(f"✅ {len(platforms)} plataformas sociales verificadas.")

        # 4. Crear Superadministrador por defecto
        admin_email = "admin@elalto.gob.bo"
        admin_pass = "AdminGamea2026!"
        admin_name = "Super Administrador GAMEA"

        stmt = select(User).where(User.email == admin_email).options(selectinload(User.roles))
        res = await session.execute(stmt)
        existing_admin = res.scalar_one_or_none()

        if not existing_admin:
            # Obtener rol superadmin
            stmt_role = select(Role).where(Role.name == UserRole.SUPER_ADMIN.value)
            role_res = await session.execute(stmt_role)
            superadmin_role = role_res.scalar_one_or_none()

            admin_user = User(
                email=admin_email,
                full_name=admin_name,
                password_hash=hash_password(admin_pass),
                is_active=True,
                roles=[superadmin_role] if superadmin_role else [],
            )
            session.add(admin_user)
            await session.commit()
            print(f"🎉 Superadministrador creado exitosamente:")
            print(f"   - Usuario/Email: {admin_email}")
            print(f"   - Contraseña:    {admin_pass}")
            print(f"   - Rol:           {UserRole.SUPER_ADMIN.value}")
        else:
            print(f"ℹ️  El superadministrador '{admin_email}' ya existe.")

    print("🏁 Inicialización finalizada con éxito.")


if __name__ == "__main__":
    asyncio.run(seed_all())
