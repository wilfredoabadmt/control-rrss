"""
Seed de Roles y Permisos Constitucionales — GAMEA Social Monitor
Principio XVII: Los 7 roles constitucionales del sistema
"""


from modules.iam.models import Permission, Role
from modules.shared.enums import UserRole
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

CONSTITUTIONAL_ROLES = [
    {
        "name": UserRole.SUPER_ADMIN.value,
        "description": "Super Administrador con control total sobre infraestructura, auditoría y roles",
        "is_system": True,
    },
    {
        "name": UserRole.AUDITOR.value,
        "description": "Auditor Institucional independiente con acceso a trazas y registros inmutables",
        "is_system": True,
    },
    {
        "name": UserRole.DIRECTOR.value,
        "description": "Director / Autoridad con acceso a dashboards ejecutivos y reportes gerenciales",
        "is_system": True,
    },
    {
        "name": UserRole.COMMUNICATIONS_LEAD.value,
        "description": "Responsable de Comunicación Institucional, gestión de campañas y cuentas oficiales",
        "is_system": True,
    },
    {
        "name": UserRole.ANALYST.value,
        "description": "Analista de interacciones, verificaciones asistidas y métricas operativas",
        "is_system": True,
    },
    {
        "name": UserRole.OPERATOR.value,
        "description": "Operador técnico de monitoreo y sincronización de publicaciones",
        "is_system": True,
    },
    {
        "name": UserRole.VIEWER.value,
        "description": "Visor de solo lectura para cuadros de mando consolidados sin PII",
        "is_system": True,
    },
]

INITIAL_PERMISSIONS = [
    # Usuarios & IAM
    {"code": "users:read", "description": "Consultar usuarios del sistema"},
    {"code": "users:create", "description": "Crear nuevos usuarios"},
    {"code": "users:update", "description": "Modificar información de usuarios"},
    {"code": "users:deactivate", "description": "Desactivar usuarios (baja lógica)"},
    {"code": "users:assign_roles", "description": "Asignar roles a usuarios"},
    # Auditoría
    {"code": "audit:read", "description": "Consultar trazas y eventos de auditoría"},
    {"code": "audit:export", "description": "Exportar registros de auditoría"},
    # Funcionarios
    {"code": "employees:read", "description": "Consultar directorio de funcionarios"},
    {"code": "employees:manage", "description": "Gestionar funcionarios y vinculaciones"},
    {"code": "employees:import", "description": "Importar nómina de funcionarios"},
    # Campañas y Publicaciones
    {"code": "campaigns:manage", "description": "Crear y gestionar campañas de monitoreo"},
    {"code": "publications:read", "description": "Consultar publicaciones monitoreadas"},
    {"code": "publications:manage", "description": "Gestionar publicaciones y objetivos"},
    # Verificaciones & Analítica
    {"code": "verifications:execute", "description": "Realizar verificaciones manuales"},
    {"code": "reports:generate", "description": "Generar y descargar reportes institucionales"},
    {"code": "dashboard:view_executive", "description": "Visualizar dashboard ejecutivo consolidado"},
    {"code": "dashboard:view_operational", "description": "Visualizar dashboard operativo detallado"},
    # Configuración del Sistema
    {"code": "system:configure", "description": "Modificar parámetros del sistema y conectores"},
]


async def seed_roles_and_permissions(session: AsyncSession) -> list[Role]:
    """Crea los roles y permisos constitucionales si aún no existen."""
    # 1. Sembrar Permisos
    db_permissions = {}
    for perm_data in INITIAL_PERMISSIONS:
        stmt = select(Permission).where(Permission.code == perm_data["code"])
        result = await session.execute(stmt)
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(**perm_data)
            session.add(perm)
            await session.flush()
        db_permissions[perm.code] = perm

    # 2. Sembrar Roles Constitucionales
    seeded_roles = []
    for role_data in CONSTITUTIONAL_ROLES:
        stmt = select(Role).where(Role.name == role_data["name"])
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
        if not role:
            role = Role(**role_data)
            session.add(role)
            await session.flush()
        seeded_roles.append(role)

    await session.commit()
    return seeded_roles
