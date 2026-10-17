"""
Servicio del Módulo 16: Analítica de Reacciones y Fiscalización Interactiva (SDD)
Cumple Principios V, VII, VIII, IX, XX, XXX y ADR-008.
Soporta filtrado jerárquico tridimensional: Secretaría -> Dirección -> Unidad.
"""

import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from modules.analytics.schemas import (
    AnalyticsKPIs,
    AnalyticsOverviewResponse,
    DirectionRankingItem,
    EmployeeAnalyticsItem,
    EmployeeCommentDetail,
    AnalyticsEmployeesPageResponse,
    PlatformComparison,
    PlatformComparisonItem,
    PostCommentAuthorDetail,
    PostCommentItem,
    PostCommentsPageResponse,
    ReactionTypeCount,
    TimelinePoint,
)
from modules.employees.models import Employee, OrganizationalUnit
from modules.iam.models import User
from modules.interactions.matcher import InteractionMatcher, MatchStatus
from modules.interactions.models import Interaction
from modules.monitoring.service import MonitoringHubService
from modules.shared.enums import BindingStatus, DataOriginType, VerificationStatus
from modules.social_accounts.models import SocialAccount
from modules.verification.models import Verification
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# Catálogo oficial de metadatos de reacciones
REACTION_METADATA: dict[str, dict[str, str]] = {
    "LIKE": {"label": "Me gusta", "color": "#3b82f6"},
    "LOVE": {"label": "Me encanta", "color": "#ef4444"},
    "CARE": {"label": "Me importa", "color": "#f59e0b"},
    "HAHA": {"label": "Me divierte", "color": "#eab308"},
    "WOW": {"label": "Me asombra", "color": "#8b5cf6"},
    "SAD": {"label": "Me entristece", "color": "#06b6d4"},
    "ANGRY": {"label": "Me enoja", "color": "#f97316"},
    "COMMENT": {"label": "Comentarios", "color": "#10b981"},
    "SHARE": {"label": "Compartidos", "color": "#6366f1"},
}

# Estructura jerárquica canónica del GAMEA (Secretaría -> Direcciones -> Unidades)
ORGANIGRAMA_HIERARCHY: list[dict[str, Any]] = [
    {
        "secretaria": "Despacho Alcalde",
        "direcciones": {
            "Dirección de Comunicación": [
                "Unidad de Prensa",
                "Unidad de Imagen Corporativa",
                "Unidad de Comunicación Digital",
                "Prensa",
                "Post Producción",
                "Dicom",
                "Dirección Central de Comunicación",
            ],
            "Dirección General de Asesoría Legal": [
                "Unidad de Transparencia y Lucha Contra la Corrupción",
                "Unidad de Normas Municipales y Asuntos Administrativos",
                "Unidad de Asuntos Jurisdiccionales",
                "Unidad de Defensa y Regularización de Bienes de Dominio Municipal",
            ],
            "Dirección de Planificación": [
                "Unidad de Planificación Estratégica",
                "Unidad de Programación de Operaciones",
                "Unidad de Inversión Pública y Seguimiento",
                "Unidad de Ordenamiento Territorial",
            ],
            "Despacho Central del Alcalde": [
                "Unidad de Relaciones Públicas y Protocolo",
                "Unidad Sumariante",
                "Unidad de Auditoria Interna",
                "Despacho Central del Alcalde",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Gestión Institucional",
        "direcciones": {
            "Dirección de Atención Ciudadana": [
                "Unidad de Coordinación con Sub Alcaldías",
                "Unidad de Archivo Central",
                "Unidad de Prevención de Conflictos",
                "Unidad de Sistema Único de Trámites",
            ],
            "Secretaría Central de Gestión Institucional": [
                "Unidad del Observatorio Municipal",
                "Unidad de Gestión Social",
                "Secretaría Central de Gestión Institucional",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Movilidad Urbana",
        "direcciones": {
            "Dirección de Regulación de la Movilidad Urbana": [
                "Unidad de Regulación del Transporte",
                "Unidad de Señalización y Semaforización",
            ],
            "Dirección Municipal de Transporte Público – Bus Municipal": [
                "Unidad de Mantenimiento",
                "Unidad de Operaciones",
                "Unidad de Administración y Recaudo",
            ],
            "Secretaría Central de Movilidad Urbana": [
                "Unidad de Planificación de la Movilidad Urbana Sostenible",
                "Unidad Guardia Municipal de Transporte",
                "Secretaría Central de Movilidad Urbana",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Administración y Finanzas",
        "direcciones": {
            "Dirección de Contrataciones": [
                "Unidad de Adquisiciones y Contrataciones Menores",
                "Unidad Jurídica de Contrataciones",
                "Unidad de Licitaciones",
            ],
            "Dirección Administrativa": [
                "Unidad de Activos Fijos",
                "Unidad de Servicios Generales y Mantenimiento",
                "Unidad de Almacenes",
                "Unidad de Administración de Sistemas de Información",
            ],
            "Dirección de Talento Humano": [
                "Unidad de Registro",
                "Unidad de Asesoría Legal DTH",
                "Unidad de Planillas y Control",
                "Unidad de Selección y Contratación",
                "Unidad de Capacitación y Evaluación",
                "Unidad de Desarrollo Organizacional",
            ],
            "Dirección del Tesoro Municipal": [
                "Unidad de Tesorería",
                "Unidad de Presupuesto",
                "Unidad de Contabilidad",
                "Unidad de Crédito Público y Gestión de Financiamiento",
            ],
            "Dirección de Administración Tributaria Municipal": [
                "Unidad de Ingresos y Control Tributario",
                "Unidad de Asesoría Jurídica y Cobranza Coactiva",
                "Unidad de Fiscalización y Recaudaciones",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Educación y Cultura",
        "direcciones": {
            "Dirección de Deportes": [
                "Unidad de Infraestructura",
                "Unidad de Fortalecimiento Deportivo",
            ],
            "Dirección de Cultura Escuela Municipal de Artes": [
                "Unidad de Fomento a Iniciativas Artísticas y Culturales",
                "Unidad de Administración de Espacios Culturales",
            ],
            "Dirección de Atención Servicios de Educación": [
                "Unidad de Programas Educativos",
            ],
            "Dirección de Adm. y Mejora de la Infraestructura y Equipamiento Educativo": [
                "Unidad de Mejora de la Infraestructura y Equipamiento Educativo",
                "Unidad de Regularización Bienes Inmuebles Sector de Educación",
            ],
            "Secretaría Central de Educación y Cultura": [
                "Unidad de Turismo",
                "Secretaría Central de Educación y Cultura",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Desarrollo Humano y Social Integral",
        "direcciones": {
            "Dirección de Niñez Género y Atención Social": [
                "Unidad de la Mujer",
                "Unidad de la Infancia Niñez y Adolescencia",
                "Unidad de Atención Integral a la Familia",
            ],
            "Dirección de Desarrollo Integral": [
                "Unidad de Adultos Mayores",
                "Unidad de la Juventud",
                "Unidad de Atención a Personas con Discapacidad",
            ],
            "Dirección de Seguridad Pública Programas de Seguridad Ciudadana y Soluciones Tecnológicas": [
                "Intendencia Guardia y Banda Municipal",
                "Unidad de Programas de Seguridad Ciudadana y Soluciones Tecnológicas",
            ],
            "Secretaría Central de Desarrollo Humano": [
                "Unidad de Poblaciones Diversas",
                "Secretaría Central de Desarrollo Humano",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Salud",
        "direcciones": {
            "Dirección de Gestión en Salud": [
                "Unidad de Promoción y Prevención",
                "Unidad de Epidemiología",
            ],
            "Dirección de Gestión Servicios de Salud Nivel Desconcentrado": [
                "Unidad de Programas y Proyectos",
            ],
            "Dirección de Establecimientos de Salud de Primer Nivel": [
                "Unidad de Planificación Municipal en Salud",
            ],
            "Secretaría Central de Salud": [
                "Unidad Técnica de Administración del S.U.S.",
                "Secretaría Central de Salud",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Infraestructura Pública",
        "direcciones": {
            "Dirección de Proyectos Municipales": [
                "Unidad de Proyectos Municipales",
                "Unidad de Proyectos Estratégicos",
            ],
            "Dirección de Supervisión de Obras": [
                "Unidad de Supervisión de Obras Municipales",
                "Unidad de Supervisión de Obras Estratégicas",
                "Unidad de Cierre de Proyectos",
            ],
            "Dirección de Fiscalización de Obras": [
                "Unidad de Fiscalización de Proyectos Estratégicos",
                "Unidad de Fiscalización de Proyectos Municipales",
            ],
            "Dirección de Obras Municipales": [
                "Unidad de Infraestructura Vial",
                "Unidad de Infraestructura Municipal",
                "Unidad de Pavimentos",
                "Unidad de Mantenimiento y Bacheo",
                "Unidad de Administración de Maquinarias",
            ],
            "Dirección de Alumbrado Público": [
                "Unidad de Programas y Proyectos de Alumbrado Público",
                "Unidad Operativa de Alumbrado Público",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Agua Saneamiento Gestión Ambiental y Riesgos",
        "direcciones": {
            "Dirección de Gestión Integral de Residuos": [
                "Unidad de Gestión de Residuos",
                "Unidad de Seguimiento y Control",
            ],
            "Dirección de Saneamiento Básico Recursos Hídricos y Control Ambiental": [
                "Unidad de Saneamiento Básico",
                "Unidad de Recursos Hídricos y Drenaje Pluvial",
                "Unidad de Control y Monitoreo Ambiental",
            ],
            "Dirección de Gestión de Riesgos": [
                "Unidad de Prevención de Riesgos",
                "Centro de Operaciones de Emergencia",
            ],
            "Dirección de Forestación y Áreas Protegidas": [
                "Unidad de Áreas Verdes Protegidas y Bofedales",
                "Unidad de Forestación",
            ],
            "Secretaría Central de Agua y Gestión Ambiental": [
                "Unidad de Prevención y Calidad Ambiental",
                "Secretaría Central de Agua y Gestión Ambiental",
            ],
        },
    },
    {
        "secretaria": "Secretaría Municipal de Desarrollo Económico",
        "direcciones": {
            "Dirección de Desarrollo Productivo Artesanal": [
                "Unidad de Promoción Artesanal",
                "Unidad de Desarrollo Productivo Artesanal",
            ],
            "Dirección de Agropecuaria y Seguridad Alimentaria": [
                "Unidad de Fortalecimiento Agropecuario",
                "Unidad de Gestión de Proyectos Agropecuarios",
            ],
            "Dirección de Desarrollo Productivo de Pequeñas y Medianas Empresas": [
                "Unidad de Competitividad y Productividad",
                "Unidad de Innovación y Emprendimiento",
            ],
            "Dirección de Servicios Municipales e Iniciativas Económicas": [
                "Unidad de Administración de Servicios Municipales",
                "Unidad de Iniciativas Económicas",
            ],
            "Dirección de Ferias y Mercados": [
                "Unidad de Ferias",
                "Unidad de Mercados",
            ],
            "Dirección de Administración Territorial y Catastro": [
                "Unidad de Catastro Municipal y Cartografía",
                "Unidad de Vialidad",
                "Unidad de Administración Territorial",
                "Unidad Jurídica de Administración Territorial",
                "Unidad de Límites",
            ],
        },
    },
    {
        "secretaria": "Subalcaldías",
        "direcciones": {
            "Subalcaldía Distrito Municipal 1": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 2": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 3": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 4": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 5": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 6": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 7": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
                "Hospital Municipal Modelo Corea",
                "Terminal Metropolitana El Alto",
            ],
            "Subalcaldía Distrito Municipal 8": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
                "Hospital Municipal Boliviano Holandés",
            ],
            "Subalcaldía Distrito Municipal 9": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
                "Hospital Municipal Modelo Boliviano Japonés",
                "Hospital Municipal Qullañ Uta",
            ],
            "Subalcaldía Distrito Municipal 10": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
                "Laboratorio Industrial de Oxígeno Medicinal GAMEA",
            ],
            "Subalcaldía Distrito Municipal 11": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 12": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 13": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
            "Subalcaldía Distrito Municipal 14": [
                "Asesoría Jurídica",
                "Unidad de Finanzas y Administración",
                "Unidad de Infraestructura Pública",
                "Unidad de Desarrollo Humano",
            ],
        },
    },
]

ALL_SECRETARIAS: list[str] = [sec["secretaria"] for sec in ORGANIGRAMA_HIERARCHY]


def resolve_org_hierarchy(direction_name: str | None, unit_name: str | None) -> tuple[str, str, str]:
    """
    Resuelve la tríada (secretaría, dirección, unidad) a partir de los datos disponibles del funcionario.
    """
    d_clean = (direction_name or "").strip()
    u_clean = (unit_name or "").strip()

    # 1. Intentar resolver por el nombre de la dirección si está especificado
    if d_clean and d_clean.lower() not in ("otras direcciones", "no especificada", "none", ""):
        d_norm = d_clean.lower()
        for sec_item in ORGANIGRAMA_HIERARCHY:
            if d_norm == sec_item["secretaria"].lower():
                return sec_item["secretaria"], "Dirección Central", u_clean or "Sin Unidad Asignada"
            for dir_nombre, unidades in sec_item["direcciones"].items():
                if d_norm == dir_nombre.lower() or d_norm in dir_nombre.lower() or dir_nombre.lower() in d_norm:
                    return sec_item["secretaria"], dir_nombre, u_clean or "Sin Unidad Asignada"

    # 2. Intentar resolver por el nombre de la unidad
    if u_clean and u_clean.lower() not in ("no asignada", "sin unidad asignada", "none", ""):
        u_norm = u_clean.lower()
        for sec_item in ORGANIGRAMA_HIERARCHY:
            for dir_nombre, unidades in sec_item["direcciones"].items():
                if any(u_norm == u.lower() or u_norm in u.lower() or u.lower() in u_norm for u in unidades):
                    return sec_item["secretaria"], dir_nombre, u_clean

    # 3. Detección especial de menciones a Subalcaldías / Distritos
    text_to_check = f"{d_clean} {u_clean}".lower()
    if "subalcal" in text_to_check or "sub alcal" in text_to_check or "distrito" in text_to_check:
        for i in range(1, 15):
            if (
                f"distrito municipal {i}" in text_to_check
                or f"distrito municipal - {i}" in text_to_check
                or f"distrito {i}" in text_to_check
                or f"d-{i}" in text_to_check
                or f"d{i}" in text_to_check
            ):
                return "Subalcaldías", f"Subalcaldía Distrito Municipal {i}", u_clean or "Sin Unidad Asignada"
        return "Subalcaldías", "Subalcaldía Distrito Municipal 1", u_clean or "Sin Unidad Asignada"

    # 4. Fallback inteligente
    resolved_dir = d_clean or u_clean or "Dirección de Comunicación"
    resolved_sec = "Despacho Alcalde"
    # Verificar si coincide con alguna secretaría conocida
    for sec_item in ORGANIGRAMA_HIERARCHY:
        if resolved_dir.lower() in sec_item["secretaria"].lower():
            resolved_sec = sec_item["secretaria"]
            break

    return resolved_sec, resolved_dir, u_clean or "Sin Unidad Asignada"


class AnalyticsService:

    @classmethod
    async def get_overview(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        secretaria: str | None = None,
        direction: str | None = None,
        unit: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
        days: int | None = None,
    ) -> AnalyticsOverviewResponse:
        """
        Calcula y expone el resumen estadístico multidimensional con rigor epistémico y filtrado jerárquico.
        """
        if days and days > 0:
            date_to = datetime.now(UTC)
            date_from = date_to - timedelta(days=days)

        # 1. Obtener matriz de actividad
        matrix = await MonitoringHubService.get_activity_matrix(
            db=db,
            publication_id=publication_id,
            platform_name=platform_name,
            current_user=current_user,
            max_posts=50,
        )

        all_rows = matrix.rows or []

        # 2. Cargar mapeo de empleados desde la base de datos para máxima precisión
        stmt_emps = (
            select(Employee)
            .options(
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
            )
        )
        emp_records = list((await db.execute(stmt_emps)).scalars().all())
        emp_db_map: dict[str, tuple[str, str, str]] = {}
        for emp in emp_records:
            u_name = emp.organizational_unit.name if emp.organizational_unit else ""
            parent_name = emp.organizational_unit.parent.name if emp.organizational_unit and emp.organizational_unit.parent else ""
            d_name = emp.direction_name or parent_name or u_name
            emp_db_map[emp.employee_id] = resolve_org_hierarchy(d_name, u_name)

        # 3. Filtrar filas de funcionarios según la jerarquía solicitada
        filtered_rows = []
        for r in all_rows:
            sec_res, dir_res, unit_res = emp_db_map.get(
                r.employee_id, resolve_org_hierarchy(r.department, r.department)
            )

            # Filtro por Secretaría
            if secretaria and secretaria != "ALL":
                sec_target = secretaria.strip().lower()
                matches_sec = (sec_res.lower() == sec_target) or (
                    "subalcal" in sec_res.lower() and "subalcal" in sec_target
                )
                if not matches_sec:
                    continue

            # Filtro por Dirección
            if direction and direction != "ALL":
                d_target = direction.strip().lower()
                matches_dir = (
                    dir_res.lower() == d_target
                    or r.department.lower() == d_target
                    or (
                        ("subalcal" in dir_res.lower() or "distrito" in dir_res.lower())
                        and ("subalcal" in d_target or "distrito" in d_target)
                        and any(
                            f" {i}" in dir_res.lower() and f" {i}" in d_target
                            for i in range(1, 15)
                        )
                    )
                )
                if not matches_dir:
                    continue

            # Filtro por Unidad
            if unit and unit != "ALL":
                u_target = unit.strip().lower()
                if unit_res.lower() != u_target and r.department.lower() != u_target:
                    continue

            filtered_rows.append((r, sec_res, dir_res, unit_res))

        # 4. Extraer conjunto de publicaciones evaluadas
        unique_posts_dict: dict[uuid.UUID, Any] = {}
        for r, _, _, _ in filtered_rows:
            for p in r.posts:
                if p.publication_id not in unique_posts_dict:
                    unique_posts_dict[p.publication_id] = p
        pubs = list(unique_posts_dict.values())

        if date_from or date_to:
            filtered_pub_ids = set()
            for p in pubs:
                p_dt = p.published_at or getattr(p, "created_at", None)
                if not p_dt:
                    filtered_pub_ids.add(p.publication_id)
                    continue
                if p_dt.tzinfo is None:
                    p_dt = p_dt.replace(tzinfo=UTC)
                if date_from and p_dt < date_from:
                    continue
                if date_to and p_dt > date_to:
                    continue
                filtered_pub_ids.add(p.publication_id)
            if filtered_pub_ids:
                pubs = [p for p in pubs if p.publication_id in filtered_pub_ids]

        total_employees = len(filtered_rows)
        observable_employees = len([r for r, _, _, _ in filtered_rows if r.facebook_handle or r.tiktok_handle])
        total_pubs = len(pubs)

        active_pub_ids = {p.publication_id for p in pubs}
        participating_set = set()
        employees_with_comments_set: set[str] = set()
        employees_with_reactions_set: set[str] = set()
        total_reactions = 0
        total_comments = 0
        total_shares = 0
        reactions_by_type_agg: dict[str, int] = {}
        dir_stats: dict[str, dict[str, Any]] = {}
        timeline_agg: dict[str, dict[str, int]] = {}
        platform_stats = {
            "FACEBOOK": {"reactions": 0, "comments": 0, "shares": 0},
            "TIKTOK": {"reactions": 0, "comments": 0, "shares": 0},
        }

        for p in pubs:
            d_str = (p.published_at.strftime("%Y-%m-%d") if p.published_at else "Sin fecha")
            timeline_agg.setdefault(d_str, {"reactions": 0, "comments": 0, "shares": 0})

        all_directions_set: set[str] = set()

        is_area_filtered = bool(
            (secretaria and secretaria != "ALL")
            or (direction and direction != "ALL")
            or (unit and unit != "ALL")
        )

        if unit and unit != "ALL":
            ranking_dimension = "FUNCIONARIO"
            ranking_title = f"Desempeño de Funcionarios — {unit}"
        elif direction and direction != "ALL":
            ranking_dimension = "UNIDAD"
            ranking_title = f"Ranking de Unidades Operativas — {direction}"
        elif secretaria and secretaria != "ALL":
            ranking_dimension = "DIRECCION"
            ranking_title = f"Ranking de Direcciones — {secretaria}"
        else:
            ranking_dimension = "DIRECCION"
            ranking_title = "Ranking de Participación por Dirección"

        for r, _, dir_res, unit_res in filtered_rows:
            d_name = dir_res or r.department or "Otras Direcciones"
            all_directions_set.add(d_name)

            if ranking_dimension == "FUNCIONARIO":
                rank_key = f"{r.full_name} ({r.position or 'Funcionario'})"
            elif ranking_dimension == "UNIDAD":
                rank_key = unit_res if (unit_res and unit_res.strip().lower() not in ("sin unidad asignada", "no asignada", "none", "")) else "Unidad Central / Despacho"
            else:
                rank_key = d_name

            dir_entry = dir_stats.setdefault(rank_key, {
                "total": 0,
                "participating": 0,
                "reactions": 0,
            })
            dir_entry["total"] += 1

            row_had_activity = False

            for p_post in r.posts:
                if active_pub_ids and p_post.publication_id not in active_pub_ids:
                    continue

                has_reaction = bool(p_post.reaction_type)
                has_comment = bool(p_post.comment_text)
                has_shared = bool(p_post.shared)
                has_verified = p_post.verification_status in [
                    "CONFIRMED", "DECLARED_CONFIRMED", "VERIFIED_AUTOMATIC", "VERIFIED_MANUAL"
                ]

                # Si está confirmado formalmente y no es comentario ni compartido, es una reacción confirmada
                if not has_reaction and has_verified and not has_comment and not has_shared:
                    has_reaction = True
                    p_post.reaction_type = "LIKE"

                is_active_interaction = has_reaction or has_comment or has_shared or has_verified

                if is_active_interaction:
                    row_had_activity = True

                if has_reaction:
                    employees_with_reactions_set.add(r.employee_id)
                    r_type = (p_post.reaction_type or "LIKE").upper().strip()
                    reactions_by_type_agg[r_type] = reactions_by_type_agg.get(r_type, 0) + 1
                    total_reactions += 1
                    dir_entry["reactions"] += 1

                    plat_name = (p_post.platform or "FACEBOOK").upper().strip()
                    if plat_name in platform_stats:
                        platform_stats[plat_name]["reactions"] += 1

                    d_str = (p_post.published_at.strftime("%Y-%m-%d") if p_post.published_at else "Sin fecha")
                    if d_str in timeline_agg:
                        timeline_agg[d_str]["reactions"] += 1

                if has_comment:
                    employees_with_comments_set.add(r.employee_id)
                    total_comments += 1
                    reactions_by_type_agg["COMMENT"] = reactions_by_type_agg.get("COMMENT", 0) + 1
                    plat_name = (p_post.platform or "FACEBOOK").upper().strip()
                    if plat_name in platform_stats:
                        platform_stats[plat_name]["comments"] += 1

                if has_shared:
                    total_shares += 1
                    reactions_by_type_agg["SHARE"] = reactions_by_type_agg.get("SHARE", 0) + 1
                    plat_name = (p_post.platform or "FACEBOOK").upper().strip()
                    if plat_name in platform_stats:
                        platform_stats[plat_name]["shares"] += 1

            if row_had_activity:
                participating_set.add(r.employee_id)
                dir_entry["participating"] += 1

        participating_employees = len(participating_set)
        participation_rate = round(
            (participating_employees / total_employees * 100.0) if total_employees > 0 else 0.0, 1
        )
        avg_reactions = round((total_reactions / total_pubs) if total_pubs > 0 else 0.0, 1)

        # Contabilizar comentarios totales en BD (incluyendo ciudadanos)
        total_comments_in_db = 0
        if active_pub_ids:
            stmt_comments_count = select(func.count(Interaction.id)).where(
                Interaction.publication_id.in_(active_pub_ids),
                or_(
                    Interaction.interaction_type.in_(["COMMENT", "REPLY"]),
                    Interaction.content_text.isnot(None),
                ),
            )
            total_comments_in_db = (await db.execute(stmt_comments_count)).scalar_one() or 0

        total_citizen_comments = max(0, total_comments_in_db - total_comments)
        employees_with_comments = len(employees_with_comments_set)
        employees_with_both = len(employees_with_comments_set & employees_with_reactions_set)
        comment_part_rate = round(
            (employees_with_comments / total_employees * 100.0) if total_employees > 0 else 0.0, 1
        )

        if is_area_filtered:
            # En modo área seleccionada (Secretaría, Dirección o Unidad):
            # No se muestran totales generales ni comentarios externos ajenos.
            reported_total_comments = total_comments
            reported_citizen_comments = 0
        else:
            # En modo global municipal general:
            reported_total_comments = max(total_comments_in_db, total_comments)
            reported_citizen_comments = total_citizen_comments

        kpis = AnalyticsKPIs(
            total_employees=total_employees,
            observable_employees=observable_employees,
            total_publications=total_pubs,
            total_reactions=total_reactions,
            total_comments=reported_total_comments,
            total_employee_comments=total_comments,
            total_citizen_comments=reported_citizen_comments,
            employees_with_comments=employees_with_comments,
            employees_with_both=employees_with_both,
            comment_participation_rate=comment_part_rate,
            total_shares=total_shares,
            participating_employees=participating_employees,
            participation_rate=participation_rate,
            average_reactions_per_post=avg_reactions,
        )

        # 5. Desglose de reacciones
        reactions_breakdown: list[ReactionTypeCount] = []
        total_type_items = max(1, sum(reactions_by_type_agg.values()))
        for r_code, count in sorted(reactions_by_type_agg.items(), key=lambda x: x[1], reverse=True):
            meta = REACTION_METADATA.get(r_code, {"label": r_code.title(), "color": "#94a3b8"})
            pct = round((count / total_type_items) * 100.0, 1)
            reactions_breakdown.append(
                ReactionTypeCount(
                    type=r_code,
                    label=meta["label"],
                    count=count,
                    percentage=pct,
                    color=meta["color"],
                )
            )

        if not reactions_breakdown and total_reactions == 0:
            reactions_breakdown = [
                ReactionTypeCount(type="LIKE", label="Me gusta", count=0, percentage=0.0, color="#3b82f6"),
                ReactionTypeCount(type="LOVE", label="Me encanta", count=0, percentage=0.0, color="#ef4444"),
                ReactionTypeCount(type="COMMENT", label="Comentarios", count=0, percentage=0.0, color="#06b6d4"),
            ]

        # 6. Rankings por Dirección / Unidad / Funcionario según jerarquía
        direction_rankings: list[DirectionRankingItem] = []
        for d_name, d_val in dir_stats.items():
            tot = d_val["total"]
            part = d_val["participating"]
            pct = round((part / tot * 100.0) if tot > 0 else 0.0, 1)
            direction_rankings.append(
                DirectionRankingItem(
                    direction=d_name,
                    total_employees=tot,
                    participating_employees=part,
                    total_reactions=d_val["reactions"],
                    participation_rate=pct,
                )
            )
        direction_rankings.sort(key=lambda x: (x.participation_rate, x.total_reactions), reverse=True)

        # 7. Serie temporal
        timeline_series: list[TimelinePoint] = []
        for d_key in sorted(timeline_agg.keys()):
            pt = timeline_agg[d_key]
            timeline_series.append(
                TimelinePoint(
                    date=d_key,
                    reactions=pt["reactions"],
                    comments=pt["comments"],
                    shares=pt["shares"],
                    total=pt["reactions"] + pt["comments"] + pt["shares"],
                )
            )

        # 8. Comparativa de Plataformas
        total_fb = platform_stats["FACEBOOK"]["reactions"]
        total_tt = platform_stats["TIKTOK"]["reactions"]
        total_plat_sum = max(1, total_fb + total_tt)

        platform_comparison = PlatformComparison(
            facebook=PlatformComparisonItem(
                total_reactions=total_fb,
                percentage=round((total_fb / total_plat_sum) * 100.0, 1),
                total_comments=platform_stats["FACEBOOK"]["comments"],
                total_shares=platform_stats["FACEBOOK"]["shares"],
            ),
            tiktok=PlatformComparisonItem(
                total_reactions=total_tt,
                percentage=round((total_tt / total_plat_sum) * 100.0, 1),
                total_comments=platform_stats["TIKTOK"]["comments"],
                total_shares=platform_stats["TIKTOK"]["shares"],
            ),
        )

        # 9. Listas disponibles para los selectores en cascada
        available_secretarias = ALL_SECRETARIAS[:]
        available_directions = sorted(list(all_directions_set)) if all_directions_set else (sorted(list(dir_stats.keys())) if dir_stats else [])
        available_units = sorted(list({unit_res for _, _, _, unit_res in filtered_rows if unit_res}))

        return AnalyticsOverviewResponse(
            kpis=kpis,
            reactions_breakdown=reactions_breakdown,
            direction_rankings=direction_rankings,
            timeline_series=timeline_series,
            platform_comparison=platform_comparison,
            available_secretarias=available_secretarias,
            available_directions=available_directions,
            available_units=available_units,
            ranking_dimension=ranking_dimension,
            ranking_title=ranking_title,
        )

    @classmethod
    async def get_employees_table(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        search: str | None = None,
        secretaria: str | None = None,
        direction: str | None = None,
        unit: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
        participation_status: str | None = "ALL",
        page: int = 1,
        page_size: int = 20,
    ) -> AnalyticsEmployeesPageResponse:
        """
        Retorna la tabla paginada y detallada de funcionarios con filtrado jerárquico tridimensional.
        """
        matrix = await MonitoringHubService.get_activity_matrix(
            db=db,
            publication_id=publication_id,
            platform_name=platform_name,
            search=search,
            current_user=current_user,
            max_posts=50,
        )

        all_rows = matrix.rows or []

        # Cargar mapeo de empleados desde la base de datos
        stmt_emps = (
            select(Employee)
            .options(
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
            )
        )
        emp_records = list((await db.execute(stmt_emps)).scalars().all())
        emp_db_map: dict[str, tuple[str, str, str]] = {}
        for emp in emp_records:
            u_name = emp.organizational_unit.name if emp.organizational_unit else ""
            parent_name = emp.organizational_unit.parent.name if emp.organizational_unit and emp.organizational_unit.parent else ""
            d_name = emp.direction_name or parent_name or u_name
            emp_db_map[emp.employee_id] = resolve_org_hierarchy(d_name, u_name)

        unique_posts_dict: dict[uuid.UUID, Any] = {}
        for r in all_rows:
            for p in r.posts:
                if p.publication_id not in unique_posts_dict:
                    unique_posts_dict[p.publication_id] = p
        pubs = list(unique_posts_dict.values())
        total_available_posts = len(pubs)
        active_pub_ids = {p.publication_id for p in pubs}

        items: list[EmployeeAnalyticsItem] = []
        for r in all_rows:
            sec_res, dir_res, unit_res = emp_db_map.get(
                r.employee_id, resolve_org_hierarchy(r.department, r.department)
            )

            # Filtros jerárquicos
            if secretaria and secretaria != "ALL":
                sec_target = secretaria.strip().lower()
                matches_sec = (sec_res.lower() == sec_target) or (
                    "subalcal" in sec_res.lower() and "subalcal" in sec_target
                )
                if not matches_sec:
                    continue
            if direction and direction != "ALL":
                d_target = direction.strip().lower()
                matches_dir = (
                    dir_res.lower() == d_target
                    or r.department.lower() == d_target
                    or (
                        ("subalcal" in dir_res.lower() or "distrito" in dir_res.lower())
                        and ("subalcal" in d_target or "distrito" in d_target)
                        and any(
                            f" {i}" in dir_res.lower() and f" {i}" in d_target
                            for i in range(1, 15)
                        )
                    )
                )
                if not matches_dir:
                    continue
            if unit and unit != "ALL":
                u_target = unit.strip().lower()
                if unit_res.lower() != u_target and r.department.lower() != u_target:
                    continue

            user_reacts = 0
            user_comments = 0
            user_shares = 0
            user_by_type: dict[str, int] = {}
            user_comments_list: list[EmployeeCommentDetail] = []
            interacted_posts_count = 0
            has_part = False

            for p_post in r.posts:
                if active_pub_ids and p_post.publication_id not in active_pub_ids:
                    continue

                has_reaction = bool(p_post.reaction_type)
                has_comment = bool(p_post.comment_text)
                has_shared = bool(p_post.shared)
                has_verified = p_post.verification_status in [
                    "CONFIRMED", "DECLARED_CONFIRMED", "VERIFIED_AUTOMATIC", "VERIFIED_MANUAL"
                ]

                if not has_reaction and has_verified and not has_comment and not has_shared:
                    has_reaction = True
                    p_post.reaction_type = "LIKE"

                is_active_interaction = has_reaction or has_comment or has_shared or has_verified
                if is_active_interaction:
                    has_part = True
                    interacted_posts_count += 1

                if has_reaction or p_post.reaction_type:
                    r_type = (p_post.reaction_type or "LIKE").upper().strip()
                    user_by_type[r_type] = user_by_type.get(r_type, 0) + 1
                    user_reacts += 1

                if p_post.comment_text:
                    user_comments += 1
                    user_by_type["COMMENT"] = user_by_type.get("COMMENT", 0) + 1
                    c_time_str = p_post.comment_created_at.isoformat() if getattr(p_post, "comment_created_at", None) else None
                    user_comments_list.append(
                        EmployeeCommentDetail(
                            interaction_id=f"{p_post.publication_id}_{r.employee_id}",
                            publication_id=str(p_post.publication_id),
                            post_title=p_post.post_title or "Publicación Oficial",
                            post_url=p_post.post_url,
                            comment_text=p_post.comment_text,
                            created_at=c_time_str,
                            associated_reaction=p_post.reaction_type,
                        )
                    )

                if p_post.shared:
                    user_shares += 1
                    user_by_type["SHARE"] = user_by_type.get("SHARE", 0) + 1

            has_comm = user_comments > 0
            has_both = user_reacts > 0 and user_comments > 0

            # Filtros de participación ampliados (reacción, comentario, ambos)
            if participation_status == "PARTICIPATED" and not has_part:
                continue
            if participation_status == "WITH_REACTION" and user_reacts == 0:
                continue
            if participation_status == "WITH_COMMENT" and not has_comm:
                continue
            if participation_status == "WITH_BOTH" and not has_both:
                continue
            if participation_status == "NO_REACTION" and user_reacts > 0:
                continue
            if participation_status == "NO_ACTIVITY" and has_part:
                continue

            part_rate = round(
                (interacted_posts_count / total_available_posts * 100.0) if total_available_posts > 0 else 0.0,
                1,
            )

            items.append(
                EmployeeAnalyticsItem(
                    employee_id=r.employee_id,
                    full_name=r.full_name,
                    document_number=r.employee_id,
                    secretaria=sec_res,
                    direction=dir_res,
                    unit=unit_res,
                    position=r.position or "Funcionario",
                    facebook_account=r.facebook_handle,
                    tiktok_account=r.tiktok_handle,
                    total_reactions=user_reacts,
                    total_comments=user_comments,
                    total_shares=user_shares,
                    reactions_by_type=user_by_type,
                    participated_posts_count=interacted_posts_count,
                    total_available_posts=total_available_posts,
                    participation_rate=part_rate,
                    has_participated=has_part,
                    has_commented=has_comm,
                    has_both=has_both,
                    comments=user_comments_list,
                )
            )

        items.sort(key=lambda x: (x.participation_rate, x.total_reactions, x.full_name), reverse=True)

        total_records = len(items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = items[start_idx:end_idx]
        total_pages = max(1, (total_records + page_size - 1) // page_size)

        return AnalyticsEmployeesPageResponse(
            items=paginated_items,
            total=total_records,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @classmethod
    async def export_excel(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        secretaria: str | None = None,
        direction: str | None = None,
        unit: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
    ) -> bytes:
        """
        Genera un informe Excel (.xlsx) oficial con carátula ejecutiva y detalle analítico por secretaría y dirección.
        """
        overview = await cls.get_overview(
            db=db,
            current_user=current_user,
            secretaria=secretaria,
            direction=direction,
            unit=unit,
            publication_id=publication_id,
            platform_name=platform_name,
        )

        emp_table = await cls.get_employees_table(
            db=db,
            current_user=current_user,
            secretaria=secretaria,
            direction=direction,
            unit=unit,
            publication_id=publication_id,
            platform_name=platform_name,
            page=1,
            page_size=10000,
        )

        wb = Workbook()

        # Estilos corporativos oficiales del GAMEA
        font_title = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
        font_section = Font(name="Calibri", size=12, bold=True, color="1E293B")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        font_kpi_label = Font(name="Calibri", size=10, bold=True, color="475569")
        font_kpi_value = Font(name="Calibri", size=14, bold=True, color="0891B2")

        fill_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        fill_accent = PatternFill(start_color="0891B2", end_color="0891B2", fill_type="solid")
        fill_kpi_bg = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        thin_side = Side(border_style="thin", color="CBD5E1")
        thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

        # 1. Hoja Resumen Ejecutivo
        ws_kpis = wb.active
        ws_kpis.title = "Resumen Ejecutivo"

        ws_kpis.merge_cells("A1:G1")
        cell_head = ws_kpis["A1"]
        cell_head.value = "GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO — ANALÍTICA DE REACCIONES Y ACOMPAÑAMIENTO"
        cell_head.font = font_title
        cell_head.fill = fill_header
        cell_head.alignment = Alignment(horizontal="center", vertical="center")
        ws_kpis.row_dimensions[1].height = 36

        ws_kpis["A2"] = f"Generado: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')} | Filtros: Secretaría={secretaria or 'Todas'}, Dirección={direction or 'Todas'}, Unidad={unit or 'Todas'}"
        ws_kpis["A2"].font = Font(name="Calibri", size=9, italic=True, color="64748B")

        # KPIs clave
        kpis_list = [
            ("Funcionarios Totales", overview.kpis.total_employees),
            ("Funcionarios Observables (con Redes)", overview.kpis.observable_employees),
            ("Funcionarios Participantes", overview.kpis.participating_employees),
            ("Tasa de Participación Global", f"{overview.kpis.participation_rate}%"),
            ("Publicaciones Auditadas", overview.kpis.total_publications),
            ("Total Reacciones Emitidas", overview.kpis.total_reactions),
            ("Comentarios Realizados", overview.kpis.total_comments),
            ("Publicaciones Compartidas", overview.kpis.total_shares),
            ("Promedio Reacciones por Publicación", overview.kpis.average_reactions_per_post),
        ]

        ws_kpis["A4"] = "Indicadores Clave de Desempeño (KPIs)"
        ws_kpis["A4"].font = font_section

        row_idx = 5
        for label, val in kpis_list:
            ws_kpis[f"A{row_idx}"] = label
            ws_kpis[f"A{row_idx}"].font = font_kpi_label
            ws_kpis[f"A{row_idx}"].fill = fill_kpi_bg
            ws_kpis[f"A{row_idx}"].border = thin_border

            ws_kpis[f"B{row_idx}"] = val
            ws_kpis[f"B{row_idx}"].font = font_kpi_value
            ws_kpis[f"B{row_idx}"].alignment = Alignment(horizontal="center")
            ws_kpis[f"B{row_idx}"].fill = fill_kpi_bg
            ws_kpis[f"B{row_idx}"].border = thin_border
            row_idx += 1

        curr_r = row_idx + 2
        ws_kpis[f"A{curr_r}"] = "Desglose por Taxonomía de Reacciones"
        ws_kpis[f"A{curr_r}"].font = Font(name="Calibri", size=12, bold=True)
        curr_r += 1

        headers_tax = ["Tipo de Reacción", "Etiqueta Institucional", "Total Emitido", "Porcentaje (%)"]
        for idx, h in enumerate(headers_tax, start=1):
            cell = ws_kpis.cell(row=curr_r, column=idx, value=h)
            cell.font = font_header
            cell.fill = fill_accent
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border
        curr_r += 1

        for r_item in overview.reactions_breakdown:
            ws_kpis[f"A{curr_r}"] = r_item.type
            ws_kpis[f"B{curr_r}"] = r_item.label
            ws_kpis[f"C{curr_r}"] = r_item.count
            ws_kpis[f"D{curr_r}"] = f"{r_item.percentage}%"
            for col_letter in ["A", "B", "C", "D"]:
                ws_kpis[f"{col_letter}{curr_r}"].border = thin_border
                if col_letter in ["C", "D"]:
                    ws_kpis[f"{col_letter}{curr_r}"].alignment = Alignment(horizontal="center")
            curr_r += 1

        curr_r += 2
        ws_kpis[f"A{curr_r}"] = "Ranking de Participación por Dirección"
        ws_kpis[f"A{curr_r}"].font = Font(name="Calibri", size=12, bold=True)
        curr_r += 1

        headers_dir = ["Dirección / Dependencia", "Total Funcionarios", "Funcionarios Participantes", "Total Reacciones", "% Participación"]
        for idx, h in enumerate(headers_dir, start=1):
            cell = ws_kpis.cell(row=curr_r, column=idx, value=h)
            cell.font = font_header
            cell.fill = fill_accent
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border
        curr_r += 1

        for d in overview.direction_rankings:
            ws_kpis[f"A{curr_r}"] = d.direction
            ws_kpis[f"B{curr_r}"] = d.total_employees
            ws_kpis[f"C{curr_r}"] = d.participating_employees
            ws_kpis[f"D{curr_r}"] = d.total_reactions
            ws_kpis[f"E{curr_r}"] = f"{d.participation_rate}%"
            for col_letter in ["A", "B", "C", "D", "E"]:
                ws_kpis[f"{col_letter}{curr_r}"].border = thin_border
                if col_letter != "A":
                    ws_kpis[f"{col_letter}{curr_r}"].alignment = Alignment(horizontal="center")
            curr_r += 1

        # 2. Hoja Detalle de Funcionarios
        ws_det = wb.create_sheet(title="Detalle de Funcionarios")
        ws_det.merge_cells("A1:K1")
        cell_det = ws_det["A1"]
        cell_det.value = "DETALLE ANALÍTICO DE PARTICIPACIÓN POR FUNCIONARIO PÚBLICO"
        cell_det.font = font_title
        cell_det.fill = fill_header
        cell_det.alignment = Alignment(horizontal="center", vertical="center")
        ws_det.row_dimensions[1].height = 32

        headers_det = [
            "Código / ID",
            "Nombre Completo",
            "Cédula",
            "Secretaría Municipal",
            "Dirección",
            "Unidad",
            "Cargo",
            "Total Reacciones",
            "Total Comentarios",
            "Posts Participados",
            "% Participación",
        ]

        ws_det.row_dimensions[3].height = 24
        for idx, h in enumerate(headers_det, start=1):
            cell = ws_det.cell(row=3, column=idx, value=h)
            cell.font = font_header
            cell.fill = fill_accent
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        curr_d_r = 4
        for emp in emp_table.items:
            ws_det[f"A{curr_d_r}"] = emp.employee_id
            ws_det[f"B{curr_d_r}"] = emp.full_name
            ws_det[f"C{curr_d_r}"] = emp.document_number
            ws_det[f"D{curr_d_r}"] = emp.secretaria
            ws_det[f"E{curr_d_r}"] = emp.direction
            ws_det[f"F{curr_d_r}"] = emp.unit
            ws_det[f"G{curr_d_r}"] = emp.position
            ws_det[f"H{curr_d_r}"] = emp.total_reactions
            ws_det[f"I{curr_d_r}"] = emp.total_comments
            ws_det[f"J{curr_d_r}"] = f"{emp.participated_posts_count} / {emp.total_available_posts}"
            ws_det[f"K{curr_d_r}"] = f"{emp.participation_rate}%"

            for col_letter in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]:
                ws_det[f"{col_letter}{curr_d_r}"].border = thin_border
                if col_letter in ["A", "C", "H", "I", "J", "K"]:
                    ws_det[f"{col_letter}{curr_d_r}"].alignment = Alignment(horizontal="center")
            curr_d_r += 1

        # 3. Hoja Comentarios Auditados y Cruce con Funcionarios
        comments_res = await cls.get_comments_list(
            db=db,
            current_user=current_user,
            secretaria=secretaria,
            direction=direction,
            publication_id=publication_id,
            page=1,
            page_size=10000,
        )

        ws_comm = wb.create_sheet(title="Comentarios Auditados")
        ws_comm.merge_cells("A1:I1")
        cell_comm = ws_comm["A1"]
        cell_comm.value = "AUDITORÍA DE COMENTARIOS EXTRAÍDOS Y CRUCE CON SERVIDORES PÚBLICOS"
        cell_comm.font = font_title
        cell_comm.fill = fill_header
        cell_comm.alignment = Alignment(horizontal="center", vertical="center")
        ws_comm.row_dimensions[1].height = 32

        headers_comm = [
            "Tipo de Autor",
            "Funcionario GAMEA",
            "Cédula",
            "Secretaría Municipal",
            "Dirección",
            "Autor en Red Social",
            "Publicación Evaluada",
            "Texto del Comentario",
            "Reacción Asociada",
        ]
        ws_comm.row_dimensions[3].height = 24
        for idx, h in enumerate(headers_comm, start=1):
            cell = ws_comm.cell(row=3, column=idx, value=h)
            cell.font = font_header
            cell.fill = fill_accent
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        curr_c_r = 4
        for c_item in comments_res.items:
            is_e = c_item.author.is_employee
            ws_comm[f"A{curr_c_r}"] = "FUNCIONARIO" if is_e else "CIUDADANO"
            ws_comm[f"B{curr_c_r}"] = c_item.author.full_name or ("—" if not is_e else c_item.author.author_name)
            ws_comm[f"C{curr_c_r}"] = c_item.author.document_number or "—"
            ws_comm[f"D{curr_c_r}"] = c_item.author.secretaria or "—"
            ws_comm[f"E{curr_c_r}"] = c_item.author.direction or "—"
            ws_comm[f"F{curr_c_r}"] = c_item.author.author_name
            ws_comm[f"G{curr_c_r}"] = c_item.post_title or "Publicación Oficial"
            ws_comm[f"H{curr_c_r}"] = c_item.content_text
            ws_comm[f"I{curr_c_r}"] = c_item.associated_reaction or "—"

            for col_letter in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
                ws_comm[f"{col_letter}{curr_c_r}"].border = thin_border
            curr_c_r += 1

        for ws in [ws_kpis, ws_det, ws_comm]:
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    val_str = str(cell.value or "")
                    if len(val_str) > max_len and "\n" not in val_str:
                        max_len = len(val_str)
                ws.column_dimensions[col_letter].width = max(12, min(max_len + 4, 45))

        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @classmethod
    async def get_comments_list(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        publication_id: uuid.UUID | None = None,
        author_type: str | None = "ALL",
        search: str | None = None,
        secretaria: str | None = None,
        direction: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PostCommentsPageResponse:
        """
        Retorna la lista auditada y paginada de comentarios de posts evaluados,
        con identificación unívoca del funcionario o clasificación ciudadana (RF-COM-004).
        """
        from modules.publications.models import Publication

        # 1. Cargar mapa de empleados para resolver secretaría y dirección
        stmt_emps = (
            select(Employee)
            .options(
                selectinload(Employee.organizational_unit).selectinload(OrganizationalUnit.parent),
                selectinload(Employee.position),
            )
        )
        emp_records = list((await db.execute(stmt_emps)).scalars().all())
        emp_dict: dict[str, Employee] = {e.employee_id: e for e in emp_records}
        emp_hierarchy_map: dict[str, tuple[str, str, str]] = {}
        for emp in emp_records:
            u_name = emp.organizational_unit.name if emp.organizational_unit else ""
            parent_name = emp.organizational_unit.parent.name if emp.organizational_unit and emp.organizational_unit.parent else ""
            d_name = emp.direction_name or parent_name or u_name
            emp_hierarchy_map[emp.employee_id] = resolve_org_hierarchy(d_name, u_name)

        # 2. Consultar comentarios en Interaction
        stmt_comments = (
            select(Interaction)
            .where(
                or_(
                    Interaction.interaction_type.in_(["COMMENT", "REPLY"]),
                    Interaction.content_text.isnot(None),
                )
            )
            .options(
                selectinload(Interaction.publication),
                selectinload(Interaction.verifications),
            )
            .order_by(
                Interaction.external_created_at.desc(),
                Interaction.captured_at.desc(),
            )
        )

        if publication_id:
            stmt_comments = stmt_comments.where(Interaction.publication_id == publication_id)

        all_comments_interactions = list((await db.execute(stmt_comments)).scalars().all())

        # 3. Construir mapa de reacciones por (publication_id, author_id/employee_id)
        stmt_reacts = (
            select(
                Interaction.publication_id,
                Interaction.external_author_id,
                Interaction.reaction_type,
            )
            .where(
                Interaction.reaction_type.isnot(None),
            )
        )
        react_rows = (await db.execute(stmt_reacts)).all()
        react_map: dict[tuple[uuid.UUID, str], str] = {}
        for p_id, auth_id, r_type in react_rows:
            if auth_id and p_id:
                react_map[(p_id, auth_id.strip().lower())] = r_type
                react_map[(p_id, auth_id.strip().lstrip("@").lower())] = r_type

        # 4. Procesar y filtrar cada comentario con cruce canónico
        processed_items: list[PostCommentItem] = []
        total_emp_comments = 0
        total_cit_comments = 0
        new_auto_verifications: list[Verification] = []

        search_q = search.strip().lower() if search and search.strip() else None

        for it in all_comments_interactions:
            matched_emp_id: str | None = None
            if it.verifications:
                for v in it.verifications:
                    if v.employee_id:
                        matched_emp_id = v.employee_id.strip()
                        break

            # Si no tiene verificación previa, cruzar con padrón municipal
            if not matched_emp_id:
                match_res = await InteractionMatcher.match_interaction(db, it)
                if match_res.status == MatchStatus.MATCHED and match_res.employee:
                    matched_emp_id = match_res.employee.employee_id
                    it.data_origin_type = DataOriginType.EMPLOYEE_INTERACTION_OFFICIAL.value
                    new_ver = Verification(
                        interaction_id=it.id,
                        employee_id=matched_emp_id,
                        verification_status=VerificationStatus.CONFIRMED.value,
                        verification_method="AUTOMATIC_CROSS_REFERENCE",
                        verified_by_user_id="ANALYTICS_AUTO_MATCHER",
                        explanation=f"Comentario cruzado con {match_res.employee.first_name} {match_res.employee.last_name} ({matched_emp_id}) en el padrón municipal.",
                    )
                    if it.verifications is None:
                        it.verifications = []
                    it.verifications.append(new_ver)
                    new_auto_verifications.append(new_ver)

            emp = emp_dict.get(matched_emp_id) if matched_emp_id else None
            is_emp = emp is not None

            sec_val, dir_val, unit_val = ("", "", "")
            if matched_emp_id and matched_emp_id in emp_hierarchy_map:
                sec_val, dir_val, unit_val = emp_hierarchy_map[matched_emp_id]
            elif emp:
                sec_val, dir_val, unit_val = resolve_org_hierarchy(emp.direction_name, "")

            if is_emp:
                total_emp_comments += 1
            else:
                total_cit_comments += 1

            # Filtrar por tipo de autor
            if author_type == "EMPLOYEES_ONLY" and not is_emp:
                continue
            if author_type == "CITIZENS_ONLY" and is_emp:
                continue

            # Filtrar por secretaría
            if secretaria and secretaria != "ALL":
                sec_target = secretaria.strip().lower()
                matches_sec = (sec_val.lower() == sec_target) or ("subalcal" in sec_val.lower() and "subalcal" in sec_target)
                if not matches_sec:
                    continue

            # Filtrar por dirección
            if direction and direction != "ALL":
                d_target = direction.strip().lower()
                matches_dir = (dir_val.lower() == d_target) or (
                    ("subalcal" in dir_val.lower() or "distrito" in dir_val.lower())
                    and ("subalcal" in d_target or "distrito" in d_target)
                )
                if not matches_dir:
                    continue

            # Filtrar por término de búsqueda
            c_text = it.content_text or ""
            author_disp_name = it.external_author_name or (f"{emp.first_name} {emp.last_name}" if emp else "Usuario en Red Social")
            if search_q:
                text_matches = (
                    search_q in c_text.lower()
                    or search_q in author_disp_name.lower()
                    or (matched_emp_id and search_q in matched_emp_id.lower())
                    or (emp and search_q in f"{emp.first_name} {emp.last_name}".lower())
                )
                if not text_matches:
                    continue

            # Reacción complementaria asociada
            associated_react = None
            if it.publication_id:
                if matched_emp_id and (it.publication_id, matched_emp_id.lower()) in react_map:
                    associated_react = react_map[(it.publication_id, matched_emp_id.lower())]
                elif it.external_author_id and (it.publication_id, it.external_author_id.strip().lower()) in react_map:
                    associated_react = react_map[(it.publication_id, it.external_author_id.strip().lower())]

            pub_title = None
            pub_url = None
            if it.publication:
                pub_title = (it.publication.content_text[:90] + "...") if it.publication.content_text and len(it.publication.content_text) > 90 else it.publication.content_text
                pub_url = it.publication.post_url

            dt_created = it.external_created_at or it.captured_at
            created_str = dt_created.isoformat() if dt_created else None

            epistemic_st = "CONFIRMED" if is_emp else "OBSERVED"
            epistemic_lbl = "Dato Confirmado" if is_emp else "Comentario Ciudadano"

            author_detail = PostCommentAuthorDetail(
                author_id=it.external_author_id,
                author_name=author_disp_name,
                is_employee=is_emp,
                employee_id=emp.employee_id if emp else None,
                full_name=f"{emp.first_name} {emp.last_name}".strip() if emp else None,
                document_number=emp.employee_id if emp else None,
                secretaria=sec_val if is_emp else None,
                direction=dir_val if is_emp else None,
                unit=unit_val if is_emp else None,
                position=emp.position.title if emp and emp.position else None,
            )

            processed_items.append(
                PostCommentItem(
                    id=str(it.id),
                    publication_id=str(it.publication_id),
                    post_title=pub_title,
                    post_url=pub_url,
                    content_text=c_text,
                    created_at=created_str,
                    author=author_detail,
                    associated_reaction=associated_react,
                    epistemic_status=epistemic_st,
                    epistemic_display=epistemic_lbl,
                )
            )

        if new_auto_verifications:
            db.add_all(new_auto_verifications)
            try:
                await db.flush()
            except Exception:
                pass

        total_matched_comments = len(processed_items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = processed_items[start_idx:end_idx]
        total_p = max(1, (total_matched_comments + page_size - 1) // page_size)

        return PostCommentsPageResponse(
            items=paginated,
            total=total_matched_comments,
            total_employee_comments=total_emp_comments,
            total_citizen_comments=total_cit_comments,
            page=page,
            page_size=page_size,
            total_pages=total_p,
        )

    @classmethod
    async def purge_test_data(cls, db: AsyncSession) -> dict[str, Any]:
        """
        Elimina todas las interacciones y verificaciones de prueba para que los tableros
        inicien en blanco y únicamente reflejen datos reales.
        """
        from modules.interactions.models import Interaction
        from modules.verification.models import Verification
        from sqlalchemy import delete

        res_v = await db.execute(delete(Verification))
        res_i = await db.execute(delete(Interaction))
        await db.commit()

        v_count = getattr(res_v, "rowcount", 0)
        i_count = getattr(res_i, "rowcount", 0)

        return {
            "success": True,
            "verifications_deleted": v_count,
            "interactions_deleted": i_count,
            "message": "Datos de prueba de interacciones eliminados correctamente. El tablero ahora muestra datos limpios.",
        }
