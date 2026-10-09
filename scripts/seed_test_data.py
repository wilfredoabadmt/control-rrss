#!/usr/bin/env python
"""
Script de seed para poblar datos de prueba en la base de datos local.
Permite validar el flujo completo: funcionarios -> cuentas sociales -> publicaciones -> interacciones -> verificación.
Ejecutar desde la raíz del proyecto: uv run python scripts/seed_test_data.py
"""
import asyncio
import sys
import os
from pathlib import Path

# Agregar backend al path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# Forzar SQLite fallback ANTES de importar config/database
os.environ["ALLOW_SQLITE_FALLBACK"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./gamea_local.db"
os.environ["DATABASE_URL_SYNC"] = "sqlite:///./gamea_local.db"

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
import json

from config import settings
from core.security.encryption import encrypt_field, hash_blind_index
from database import AsyncSessionLocal, Base, async_engine, activate_sqlite_fallback
from modules.employees.models import Employee, OrganizationalUnit, Position
from modules.iam.models import Role, User
from modules.iam.seed import seed_roles_and_permissions
from modules.interactions.models import Interaction
from modules.monitoring.models import SocialConnectorConfig
from modules.publications.models import Publication
from modules.shared.enums import (
    BindingStatus,
    CaptureMethod,
    DataOriginType,
    EmployeeStatus,
    InteractionType,
    SocialPlatformType,
    VerificationStatus,
)
from modules.social_accounts.models import SocialAccount, SocialPlatform
from modules.verification.models import Verification
from sqlalchemy import select, text


async def seed_test_data():
    # Activar SQLite fallback explícitamente usando la misma ruta que el backend
    import tempfile
    db_path = os.path.join(tempfile.gettempdir(), "gamea_local.db")
    activate_sqlite_fallback(db_path)
    
    # Crear tablas si no existen
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Migraciones para SQLite (columnas que existen en PG pero no en SQLite)
        # direction_name en employees
        try:
            await conn.execute(text("ALTER TABLE employees ADD COLUMN direction_name VARCHAR(200)"))
        except Exception:
            pass
        # created_by_user_id en employees
        try:
            await conn.execute(text("ALTER TABLE employees ADD COLUMN created_by_user_id UUID"))
        except Exception:
            pass
        # meta_reactions_total en publications
        try:
            await conn.execute(text("ALTER TABLE publications ADD COLUMN meta_reactions_total INTEGER NOT NULL DEFAULT 0"))
        except Exception:
            pass
        # meta_reactions_by_type en publications
        try:
            await conn.execute(text("ALTER TABLE publications ADD COLUMN meta_reactions_by_type JSON NOT NULL DEFAULT '{}'"))
        except Exception:
            pass
        # meta_metrics_synced_at en publications
        try:
            await conn.execute(text("ALTER TABLE publications ADD COLUMN meta_metrics_synced_at TIMESTAMP"))
        except Exception:
            pass
    
    async with AsyncSessionLocal() as db:
        # 1. Asegurar plataformas sociales
        fb_platform = await ensure_facebook_platform(db)
        tt_platform = await ensure_tiktok_platform(db)

        # 2. Unidades Organizacionales
        ou_despacho = await get_or_create_ou(db, "Despacho Alcalde", "DESP-ALC")
        ou_comunicacion = await get_or_create_ou(db, "Secretaría Municipal de Comunicación", "SEC-COM")
        ou_planificacion = await get_or_create_ou(db, "Secretaría Municipal de Planificación", "SEC-PLA")
        ou_obras = await get_or_create_ou(db, "Secretaría Municipal de Obras Públicas", "SEC-OBR")

        # 3. Cargos
        pos_asesor = await get_or_create_position(db, "Asesor de Comunicación", "POS-ASE-COM")
        pos_dir_com = await get_or_create_position(db, "Director de Comunicación", "POS-DIR-COM")
        pos_analista = await get_or_create_position(db, "Analista de Redes Sociales", "POS-ANA-RRS")
        pos_jefe_u = await get_or_create_position(db, "Jefe de Unidad", "POS-JEF-UNI")
        pos_tecnico = await get_or_create_position(db, "Técnico Municipal", "POS-TEC-MUN")

        # 4. Funcionarios de prueba
        employees_data = [
            {
                "employee_id": "8736490",
                "first_name": "Wilfredo",
                "last_name": "Abad Mamani",
                "ou": ou_despacho,
                "position": pos_asesor,
                "fb_handle": "wilfredo.abad.123",
            },
            {
                "employee_id": "5432109",
                "first_name": "María",
                "last_name": "Gonzales Flores",
                "ou": ou_comunicacion,
                "position": pos_dir_com,
                "fb_handle": "maria.gonzales.456",
            },
            {
                "employee_id": "9876543",
                "first_name": "Carlos",
                "last_name": "Mamani Quispe",
                "ou": ou_comunicacion,
                "position": pos_analista,
                "fb_handle": "carlos.mamani.789",
            },
            {
                "employee_id": "1122334",
                "first_name": "Ana",
                "last_name": "Lopez Condori",
                "ou": ou_planificacion,
                "position": pos_jefe_u,
                "fb_handle": "ana.lopez.101",
            },
            {
                "employee_id": "5566778",
                "first_name": "Roberto",
                "last_name": "Huanca Ticona",
                "ou": ou_obras,
                "position": pos_tecnico,
                "fb_handle": "roberto.huanca.202",
            },
            {
                "employee_id": "9988776",
                "first_name": "Patricia",
                "last_name": "Quispe Mamani",
                "ou": ou_comunicacion,
                "position": pos_tecnico,
                "fb_handle": "patricia.quispe.303",
            },
            {
                "employee_id": "4433221",
                "first_name": "Gonzalo",
                "last_name": "Aruquipa Mamani",
                "ou": ou_despacho,
                "position": pos_tecnico,
                "fb_handle": "gonzalo.aruquipa.404",
            },
        ]

        created_employees = []
        for emp_data in employees_data:
            emp = await get_or_create_employee(db, emp_data, fb_platform)
            created_employees.append(emp)

        # 5. Publicaciones de prueba
        publications_data = [
            {
                "external_post_id": "1612864202296619_1417185383929434",
                "post_url": "https://www.facebook.com/AlcaldiaElAlto/posts/1417185383929434",
                "content_text": "🏛️ El Gobierno Autónomo Municipal de El Alto invita a la ciudadanía a participar de la Audiencia Pública de Rendición de Cuentas 2025. Tu voz es importante para la transparencia municipal. #ElAlto #Transparencia #RendicionDeCuentas",
                "published_at": datetime(2026, 9, 15, 10, 30, tzinfo=UTC),
            },
            {
                "external_post_id": "1612864202296619_1417186590595980",
                "post_url": "https://www.facebook.com/AlcaldiaElAlto/posts/1417186590595980",
                "content_text": "🚧 ¡Avanzamos con las obras! La Av. 6 de Marzo presenta un 75% de avance en su rehabilitación integral. Mejorando la movilidad urbana para todos los alteños. #ObrasPúblicas #ElAlto #Avance",
                "published_at": datetime(2026, 9, 20, 14, 0, tzinfo=UTC),
            },
            {
                "external_post_id": "1612864202296619_1417187897262517",
                "post_url": "https://www.facebook.com/AlcaldiaElAlto/posts/1417187897262517",
                "content_text": "🎉 Celebración del Aniversario de El Alto. Agradecemos a todos los funcionarios y ciudadanía por hacer de nuestra ciudad un ejemplo de organización y participación. ¡Juntos seguimos construyendo! #AniversarioElAlto #OrgulloAlteño",
                "published_at": datetime(2026, 9, 25, 9, 0, tzinfo=UTC),
            },
        ]

        created_publications = []
        for pub_data in publications_data:
            pub = await get_or_create_publication(db, pub_data, fb_platform)
            created_publications.append(pub)

        # 6. Interacciones y Verificaciones (simulan reacciones reales)
        # Publicación 1: Audiencia Pública - varias reacciones
        await create_interactions_for_publication(
            db,
            created_publications[0],
            created_employees,
            [
                # Reacciones registradas (como si vinieron del "Pegar Reacciones")
                {"emp_idx": 0, "reaction": "LIKE", "shared": False, "comment": None},
                {"emp_idx": 1, "reaction": "LOVE", "shared": True, "comment": None},
                {"emp_idx": 2, "reaction": "CARE", "shared": False, "comment": "Excelente iniciativa, participaré."},
                {"emp_idx": 3, "reaction": "LIKE", "shared": False, "comment": None},
                # Empleados 4, 5, 6 SIN interacción (para probar "Sin Interacción")
            ],
        )

        # Publicación 2: Obras Av. 6 de Marzo
        await create_interactions_for_publication(
            db,
            created_publications[1],
            created_employees,
            [
                {"emp_idx": 0, "reaction": "LIKE", "shared": False, "comment": None},
                {"emp_idx": 1, "reaction": "LIKE", "shared": False, "comment": "Buen trabajo en la avenida."},
                {"emp_idx": 4, "reaction": "WOW", "shared": True, "comment": None},
                {"emp_idx": 5, "reaction": "HAHA", "shared": False, "comment": None},
                # Empleados 2, 3, 6 SIN interacción
            ],
        )

        # Publicación 3: Aniversario
        await create_interactions_for_publication(
            db,
            created_publications[2],
            created_employees,
            [
                {"emp_idx": 0, "reaction": "LOVE", "shared": True, "comment": "¡Feliz aniversario mi ciudad!"},
                {"emp_idx": 1, "reaction": "LIKE", "shared": False, "comment": None},
                {"emp_idx": 2, "reaction": "LIKE", "shared": False, "comment": None},
                {"emp_idx": 3, "reaction": "CARE", "shared": False, "comment": None},
                {"emp_idx": 4, "reaction": "LIKE", "shared": True, "comment": None},
                {"emp_idx": 5, "reaction": "LIKE", "shared": False, "comment": "Orgullosa de mi ciudad."},
                {"emp_idx": 6, "reaction": "WOW", "shared": False, "comment": None},
                # Todos interactuaron - 100% participación
            ],
        )

        # 7. Conector Facebook configurado
        await ensure_facebook_connector(db)

        await db.commit()
        print("Seed completado exitosamente")
        print(f"   Funcionarios: {len(created_employees)}")
        print(f"   Publicaciones: {len(created_publications)}")
        print(f"   Interacciones + Verificaciones: creadas")
        print(f"   Conector Facebook: configurado")

        # Resumen para testing
        print("\nDATOS DE PRUEBA PARA TESTING:")
        print("   Publicacion 1 (Audiencia Publica): 4/7 interactuaron")
        print("   Publicacion 2 (Obras Av. 6 Marzo): 4/7 interactuaron")
        print("   Publicacion 3 (Aniversario): 7/7 interactuaron (100%)")
        print("\nCuentas Facebook vinculadas:")
        for emp in created_employees:
            print(f"   - {emp.first_name} {emp.last_name} (CI: {emp.employee_id}) -> @{emp.fb_handle}")


async def ensure_facebook_platform(db):
    stmt = select(SocialPlatform).where(SocialPlatform.name == SocialPlatformType.FACEBOOK.value)
    platform = (await db.execute(stmt)).scalar_one_or_none()
    if not platform:
        platform = SocialPlatform(
            name=SocialPlatformType.FACEBOOK.value,
            display_name="Facebook",
            is_active=True,
            api_version="v26.0",
        )
        db.add(platform)
        await db.flush()
    return platform


async def ensure_tiktok_platform(db):
    stmt = select(SocialPlatform).where(SocialPlatform.name == SocialPlatformType.TIKTOK.value)
    platform = (await db.execute(stmt)).scalar_one_or_none()
    if not platform:
        platform = SocialPlatform(
            name=SocialPlatformType.TIKTOK.value,
            display_name="TikTok",
            is_active=True,
            api_version="v2.0",
        )
        db.add(platform)
        await db.flush()
    return platform


async def get_or_create_ou(db, name, code):
    stmt = select(OrganizationalUnit).where(OrganizationalUnit.name == name)
    ou = (await db.execute(stmt)).scalar_one_or_none()
    if not ou:
        ou = OrganizationalUnit(name=name, code=code, status="ACTIVE")
        db.add(ou)
        await db.flush()
    return ou


async def get_or_create_position(db, title, code):
    stmt = select(Position).where(Position.title == title)
    pos = (await db.execute(stmt)).scalar_one_or_none()
    if not pos:
        pos = Position(title=title, code=code, status="ACTIVE")
        db.add(pos)
        await db.flush()
    return pos


async def get_or_create_employee(db, emp_data, fb_platform):
    stmt = select(Employee).where(Employee.employee_id == emp_data["employee_id"])
    emp = (await db.execute(stmt)).scalar_one_or_none()

    if not emp:
        emp = Employee(
            employee_id=emp_data["employee_id"],
            document_number_encrypted=encrypt_field(emp_data["employee_id"]),
            document_hash=hash_blind_index(emp_data["employee_id"]),
            first_name=emp_data["first_name"],
            last_name=emp_data["last_name"],
            organizational_unit_id=emp_data["ou"].id,
            position_id=emp_data["position"].id,
            status=EmployeeStatus.ACTIVE.value,
        )
        db.add(emp)
        await db.flush()
    else:
        emp.first_name = emp_data["first_name"]
        emp.last_name = emp_data["last_name"]
        emp.organizational_unit_id = emp_data["ou"].id
        emp.position_id = emp_data["position"].id
        emp.status = EmployeeStatus.ACTIVE.value

    # Cuenta Facebook
    fb_handle = emp_data["fb_handle"]
    stmt_sa = select(SocialAccount).where(
        SocialAccount.employee_id == emp.employee_id,
        SocialAccount.platform_id == fb_platform.id,
    )
    sa = (await db.execute(stmt_sa)).scalar_one_or_none()
    if not sa:
        sa = SocialAccount(
            employee_id=emp.employee_id,
            platform_id=fb_platform.id,
            current_username=fb_handle,
            profile_url=f"https://facebook.com/{fb_handle}",
            binding_status=BindingStatus.ACTIVE.value,
            verified_at=datetime.now(UTC),
        )
        db.add(sa)
    else:
        sa.current_username = fb_handle
        sa.profile_url = f"https://facebook.com/{fb_handle}"
        sa.binding_status = BindingStatus.ACTIVE.value
        sa.verified_at = datetime.now(UTC)

    # Guardar handle en employee para referencia rápida
    emp.fb_handle = fb_handle
    await db.flush()
    return emp


async def get_or_create_publication(db, pub_data, fb_platform):
    stmt = select(Publication).where(Publication.external_post_id == pub_data["external_post_id"])
    pub = (await db.execute(stmt)).scalar_one_or_none()

    if not pub:
        pub = Publication(
            platform_id=fb_platform.id,
            external_post_id=pub_data["external_post_id"],
            post_url=pub_data["post_url"],
            content_text=pub_data["content_text"],
            published_at=pub_data["published_at"],
            is_monitored=True,
            media_type="TEXT",
        )
        db.add(pub)
        await db.flush()
    return pub


async def create_interactions_for_publication(db, publication, employees, interactions_config):
    """Crea interacciones y verificaciones para una publicación según la configuración."""
    for config in interactions_config:
        emp = employees[config["emp_idx"]]
        reaction = config["reaction"]
        shared = config["shared"]
        comment = config["comment"]

        # Determinar interaction_type principal
        if comment:
            interaction_type = InteractionType.COMMENT.value
        elif reaction:
            interaction_type = InteractionType.LIKE.value
        elif shared:
            interaction_type = InteractionType.SHARE.value
        else:
            continue

        # External ID único para idempotencia
        ext_id = f"seed_{publication.id}_{emp.employee_id}"

        # Buscar interacción existente
        stmt = select(Interaction).where(
            Interaction.publication_id == publication.id,
            Interaction.external_author_id == emp.employee_id,
        )
        interaction = (await db.execute(stmt)).scalars().first()

        payload = {
            "seed": True,
            "reaction_type": reaction,
            "shared": shared,
            "comment_text": comment,
            "source": "SEED_TEST_DATA",
        }

        if not interaction:
            interaction = Interaction(
                publication_id=publication.id,
                platform_id=publication.platform_id,
                interaction_type=interaction_type,
                external_interaction_id=ext_id,
                external_post_id=publication.external_post_id,
                external_author_id=emp.employee_id,
                external_author_name=f"{emp.first_name} {emp.last_name}",
                reaction_type=reaction,
                content_text=comment,
                captured_at=datetime.now(UTC),
                capture_method=CaptureMethod.MANUAL_IMPORT.value,
                data_origin_type=DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value,
                source_platform="FACEBOOK",
                raw_payload_ref=json.dumps(payload),
            )
            db.add(interaction)
            await db.flush()
        else:
            interaction.reaction_type = reaction
            interaction.content_text = comment
            interaction.interaction_type = interaction_type
            interaction.raw_payload_ref = json.dumps(payload)

        # Verificación
        stmt_v = select(Verification).where(
            Verification.interaction_id == interaction.id,
            Verification.employee_id == emp.employee_id,
        )
        verification = (await db.execute(stmt_v)).scalars().first()

        if not verification:
            verification = Verification(
                interaction_id=interaction.id,
                employee_id=emp.employee_id,
                verification_status=VerificationStatus.CONFIRMED.value,
                verification_method="SEED_TEST_DATA",
                verified_at=datetime.now(UTC),
                verified_by_user_id="seed-script",
                explanation=f"Dato de prueba: reacción {reaction}" + (f", comentario: {comment}" if comment else "") + (f", compartido" if shared else ""),
            )
            db.add(verification)
        else:
            verification.verification_status = VerificationStatus.CONFIRMED.value
            verification.verified_at = datetime.now(UTC)
            verification.verified_by_user_id = "seed-script"
            verification.explanation = f"Dato de prueba actualizado: reacción {reaction}"


async def ensure_facebook_connector(db):
    """Configura el conector Facebook con credenciales de entorno si existen."""
    stmt = select(SocialConnectorConfig).where(SocialConnectorConfig.platform_name == "FACEBOOK")
    cfg = (await db.execute(stmt)).scalar_one_or_none()

    if not cfg:
        cfg = SocialConnectorConfig(
            platform_name="FACEBOOK",
            target_account_id=settings.FACEBOOK_PAGE_ID or "100064567891234",
            display_name="Gobierno Autónomo Municipal de El Alto (Facebook Oficial)",
            access_token_encrypted=encrypt_field(settings.FACEBOOK_PAGE_ACCESS_TOKEN) if settings.FACEBOOK_PAGE_ACCESS_TOKEN else "",
            api_secret_encrypted=encrypt_field(settings.FACEBOOK_APP_SECRET) if settings.FACEBOOK_APP_SECRET else "",
            api_version=settings.FACEBOOK_GRAPH_VERSION,
            extraction_mode="OFFICIAL_API",
            rate_limit_per_minute=60,
            max_posts_per_sync=25,
            max_comments_per_post=200,
            is_active=bool(settings.FACEBOOK_PAGE_ACCESS_TOKEN),
            last_status="CONFIGURED" if settings.FACEBOOK_PAGE_ACCESS_TOKEN else "NOT_CONFIGURED",
            status_message="Conector configurado por seed script" if settings.FACEBOOK_PAGE_ACCESS_TOKEN else "Pendiente de credenciales reales",
        )
        db.add(cfg)
    else:
        # Actualizar con credenciales de entorno si existen
        if settings.FACEBOOK_PAGE_ID:
            cfg.target_account_id = settings.FACEBOOK_PAGE_ID
        if settings.FACEBOOK_PAGE_ACCESS_TOKEN:
            cfg.access_token_encrypted = encrypt_field(settings.FACEBOOK_PAGE_ACCESS_TOKEN)
            cfg.last_status = "CONFIGURED"
            cfg.status_message = "Credenciales de entorno aplicadas"
            cfg.is_active = True
        if settings.FACEBOOK_APP_SECRET:
            cfg.api_secret_encrypted = encrypt_field(settings.FACEBOOK_APP_SECRET)
    await db.flush()


if __name__ == "__main__":
    import json
    asyncio.run(seed_test_data())