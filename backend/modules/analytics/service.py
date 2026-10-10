"""
Servicio Analítico de Reacciones y Fiscalización Interactiva — GAMEA Social Monitor
Módulo 16 (SDD) — RF-ANL-001 a RF-ANL-007
"""

import io
import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.analytics.schemas import (
    AnalyticsEmployeesPageResponse,
    AnalyticsKPIs,
    AnalyticsOverviewResponse,
    DirectionRankingItem,
    EmployeeAnalyticsItem,
    PlatformComparison,
    PlatformComparisonItem,
    ReactionTypeCount,
    TimelinePoint,
)
from modules.employees.service import EmployeeService
from modules.iam.models import User
from modules.monitoring.service import MonitoringHubService


REACTION_METADATA: dict[str, dict[str, str]] = {
    "LIKE": {"label": "Me gusta", "color": "#3b82f6"},
    "LOVE": {"label": "Me encanta", "color": "#ef4444"},
    "CARE": {"label": "Me importa", "color": "#f59e0b"},
    "HAHA": {"label": "Me divierte", "color": "#10b981"},
    "WOW": {"label": "Me asombra", "color": "#8b5cf6"},
    "SAD": {"label": "Me entristece", "color": "#64748b"},
    "ANGRY": {"label": "Me enoja", "color": "#dc2626"},
    "COMMENT": {"label": "Comentarios", "color": "#06b6d4"},
    "SHARE": {"label": "Compartidos", "color": "#ec4899"},
    "OTHER": {"label": "Otras", "color": "#94a3b8"},
}


class AnalyticsService:

    @classmethod
    async def get_overview(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        direction: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
        days: int | None = None,
    ) -> AnalyticsOverviewResponse:
        """
        Calcula y expone el resumen estadístico multidimensional con rigor epistémico.
        """
        # Si se especifica days, calcular ventana temporal relativa
        if days and days > 0:
            date_to = datetime.now(UTC)
            date_from = date_to - timedelta(days=days)

        # 1. Obtener matriz de actividad filtrada con el motor consolidado
        matrix = await MonitoringHubService.get_activity_matrix(
            db=db,
            publication_id=publication_id,
            platform_name=platform_name,
            department=direction if direction and direction != "ALL" else None,
            current_user=current_user,
            max_posts=50,
        )

        rows = matrix.rows or []

        # Extraer conjunto de publicaciones evaluadas presentes en la matriz
        unique_posts_dict: dict[uuid.UUID, Any] = {}
        for r in rows:
            for p in r.posts:
                if p.publication_id not in unique_posts_dict:
                    unique_posts_dict[p.publication_id] = p
        pubs = list(unique_posts_dict.values())

        # Filtrar publicaciones por ventana de fecha si corresponde
        if date_from or date_to:
            filtered_pub_ids = set()
            for p in pubs:
                p_dt = p.published_at
                if p_dt:
                    if p_dt.tzinfo is None:
                        p_dt = p_dt.replace(tzinfo=UTC)
                    if date_from and p_dt < date_from:
                        continue
                    if date_to and p_dt > date_to:
                        continue
                    filtered_pub_ids.add(p.publication_id)
            if filtered_pub_ids:
                pubs = [p for p in pubs if p.publication_id in filtered_pub_ids]

        total_employees = len(rows)
        observable_employees = len([r for r in rows if r.facebook_handle or r.tiktok_handle])
        total_pubs = len(pubs)

        # Recomputar interacciones y reacciones sobre los posts activos
        active_pub_ids = {p.publication_id for p in pubs}
        participating_set = set()
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

        # Inicializar timeline con las fechas de publicaciones
        for p in pubs:
            d_str = (p.published_at.strftime("%Y-%m-%d") if p.published_at else "Sin fecha")
            timeline_agg.setdefault(d_str, {"reactions": 0, "comments": 0, "shares": 0})

        for row in rows:
            dir_name = row.department or "Otras Direcciones"
            dir_entry = dir_stats.setdefault(dir_name, {
                "total": 0,
                "participating": 0,
                "reactions": 0,
            })
            dir_entry["total"] += 1

            row_had_activity = False

            for p_post in row.posts:
                if active_pub_ids and p_post.publication_id not in active_pub_ids:
                    continue

                has_reaction = bool(p_post.reaction_type)
                has_comment = bool(p_post.comment_text)
                has_shared = bool(p_post.shared)
                has_verified = p_post.verification_status in [
                    "CONFIRMED", "DECLARED_CONFIRMED", "VERIFIED_AUTOMATIC", "VERIFIED_MANUAL"
                ]
                is_active_interaction = has_reaction or has_comment or has_shared or has_verified

                if is_active_interaction:
                    row_had_activity = True

                if has_reaction:
                    r_type = (p_post.reaction_type or "LIKE").upper().strip()
                    reactions_by_type_agg[r_type] = reactions_by_type_agg.get(r_type, 0) + 1
                    total_reactions += 1
                    dir_entry["reactions"] += 1

                    # Fecha del post para la serie temporal
                    post_date = p_post.published_at.strftime("%Y-%m-%d") if p_post.published_at else "Sin fecha"
                    t_entry = timeline_agg.setdefault(post_date, {"reactions": 0, "comments": 0, "shares": 0})
                    t_entry["reactions"] += 1

                    # Plataforma
                    plat_name = (p_post.platform or "FACEBOOK").upper().strip()
                    if plat_name in platform_stats:
                        platform_stats[plat_name]["reactions"] += 1

                if has_comment:
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
                participating_set.add(row.employee_id)
                dir_entry["participating"] += 1

        participating_employees = len(participating_set)
        participation_rate = round(
            (participating_employees / total_employees * 100.0) if total_employees > 0 else 0.0, 1
        )
        avg_reactions = round((total_reactions / total_pubs) if total_pubs > 0 else 0.0, 1)

        kpis = AnalyticsKPIs(
            total_employees=total_employees,
            observable_employees=observable_employees,
            total_publications=total_pubs,
            total_reactions=total_reactions,
            total_comments=total_comments,
            total_shares=total_shares,
            participating_employees=participating_employees,
            participation_rate=participation_rate,
            average_reactions_per_post=avg_reactions,
        )

        # 2. Desglose taxonómico de reacciones
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

        # 3. Rankings por Dirección
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

        # 4. Serie temporal
        timeline_series: list[TimelinePoint] = []
        for d_key in sorted(timeline_agg.keys()):
            if d_key != "Sin fecha":
                timeline_series.append(
                    TimelinePoint(
                        date=d_key,
                        reactions=timeline_agg[d_key]["reactions"],
                        comments=timeline_agg[d_key]["comments"],
                        shares=timeline_agg[d_key]["shares"],
                    )
                )

        # 5. Comparativa por plataforma
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

        available_directions = sorted(list(dir_stats.keys()))

        return AnalyticsOverviewResponse(
            kpis=kpis,
            reactions_breakdown=reactions_breakdown,
            direction_rankings=direction_rankings,
            timeline_series=timeline_series,
            platform_comparison=platform_comparison,
            available_directions=available_directions,
        )

    @classmethod
    async def get_employees_table(
        cls,
        db: AsyncSession,
        current_user: User | None = None,
        search: str | None = None,
        direction: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
        participation_status: str | None = "ALL",
        page: int = 1,
        page_size: int = 20,
    ) -> AnalyticsEmployeesPageResponse:
        """
        Retorna la tabla paginada y detallada de funcionarios con sus estadísticas.
        """
        matrix = await MonitoringHubService.get_activity_matrix(
            db=db,
            publication_id=publication_id,
            platform_name=platform_name,
            department=direction if direction and direction != "ALL" else None,
            search=search,
            current_user=current_user,
            max_posts=50,
        )

        rows = matrix.rows or []

        unique_posts_dict: dict[uuid.UUID, Any] = {}
        for r in rows:
            for p in r.posts:
                if p.publication_id not in unique_posts_dict:
                    unique_posts_dict[p.publication_id] = p
        pubs = list(unique_posts_dict.values())
        total_available_posts = len(pubs)
        active_pub_ids = {p.publication_id for p in pubs}

        items: list[EmployeeAnalyticsItem] = []
        for r in rows:
            user_reacts = 0
            user_comments = 0
            user_shares = 0
            user_by_type: dict[str, int] = {}
            interacted_posts_count = 0
            has_part = False

            for p_post in r.posts:
                if active_pub_ids and p_post.publication_id not in active_pub_ids:
                    continue

                is_active_interaction = bool(
                    p_post.reaction_type
                    or p_post.comment_text
                    or p_post.shared
                    or (p_post.verification_status in ["CONFIRMED", "DECLARED_CONFIRMED", "VERIFIED_AUTOMATIC", "VERIFIED_MANUAL"])
                )
                if is_active_interaction:
                    has_part = True
                    interacted_posts_count += 1

                if p_post.reaction_type:
                    r_type = (p_post.reaction_type or "LIKE").upper().strip()
                    user_by_type[r_type] = user_by_type.get(r_type, 0) + 1
                    user_reacts += 1

                if p_post.comment_text:
                    user_comments += 1
                    user_by_type["COMMENT"] = user_by_type.get("COMMENT", 0) + 1

                if p_post.shared:
                    user_shares += 1
                    user_by_type["SHARE"] = user_by_type.get("SHARE", 0) + 1

            # Filtro por estado de participación
            if participation_status == "PARTICIPATED" and not has_part:
                continue
            if participation_status == "NO_REACTION" and has_part:
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
                    direction=r.department or "No especificada",
                    unit="No asignada",
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
                )
            )

        # Ordenar por participación y reacciones
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
        direction: str | None = None,
        publication_id: uuid.UUID | None = None,
        platform_name: str | None = None,
    ) -> bytes:
        """
        Genera un informe Excel (.xlsx) oficial con carátula ejecutiva y detalle analítico.
        """
        overview = await cls.get_overview(
            db=db,
            current_user=current_user,
            direction=direction,
            publication_id=publication_id,
            platform_name=platform_name,
        )
        emp_table = await cls.get_employees_table(
            db=db,
            current_user=current_user,
            direction=direction,
            publication_id=publication_id,
            platform_name=platform_name,
            page=1,
            page_size=10000,
        )

        wb = openpyxl.Workbook()
        ws_kpis = wb.active
        ws_kpis.title = "Resumen Ejecutivo"

        # Estilos institucionales GAMEA
        font_title = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
        font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=10)

        fill_header = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        fill_sub = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        fill_accent = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        # 1. Hoja Resumen Ejecutivo
        ws_kpis.merge_cells("A1:E1")
        cell_t = ws_kpis["A1"]
        cell_t.value = "GOBIERNO AUTÓNOMO MUNICIPAL DE EL ALTO — REPORTE DE ANALÍTICA DE REACCIONES"
        cell_t.font = font_title
        cell_t.fill = fill_header
        cell_t.alignment = Alignment(horizontal="center", vertical="center")
        ws_kpis.row_dimensions[1].height = 36

        ws_kpis["A3"] = "Indicador Clave (KPI)"
        ws_kpis["B3"] = "Valor"
        ws_kpis["C3"] = "Unidad / Detalle"
        for c in ["A3", "B3", "C3"]:
            ws_kpis[c].font = font_header
            ws_kpis[c].fill = fill_sub
            ws_kpis[c].alignment = Alignment(horizontal="center", vertical="center")

        kpis_data = [
            ("Total Funcionarios en Alcance", overview.kpis.total_employees, "Servidores públicos"),
            ("Funcionarios con Redes Vinculadas", overview.kpis.observable_employees, "Cuentas observables"),
            ("Publicaciones Auditadas", overview.kpis.total_publications, "Posts institucionales"),
            ("Total Reacciones Registradas", overview.kpis.total_reactions, "Reacciones detectadas"),
            ("Funcionarios con Participación", overview.kpis.participating_employees, "Servidores activos"),
            ("Tasa Global de Participación", f"{overview.kpis.participation_rate}%", "Porcentaje de acompañamiento"),
            ("Promedio Reacciones por Post", overview.kpis.average_reactions_per_post, "Reacciones / publicación"),
        ]

        curr_r = 4
        for label, val, desc in kpis_data:
            ws_kpis[f"A{curr_r}"] = label
            ws_kpis[f"B{curr_r}"] = val
            ws_kpis[f"C{curr_r}"] = desc
            ws_kpis[f"A{curr_r}"].font = font_bold
            ws_kpis[f"B{curr_r}"].alignment = Alignment(horizontal="center")
            for col_letter in ["A", "B", "C"]:
                ws_kpis[f"{col_letter}{curr_r}"].border = thin_border
            curr_r += 1

        curr_r += 2
        ws_kpis[f"A{curr_r}"] = "Ranking de Participación por Dirección"
        ws_kpis[f"A{curr_r}"].font = Font(name="Calibri", size=12, bold=True)
        curr_r += 1

        headers_dir = ["Dirección / Secretaría", "Total Funcionarios", "Funcionarios Participantes", "Total Reacciones", "% Participación"]
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
        ws_det.merge_cells("A1:I1")
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
            "Dirección",
            "Unidad",
            "Cargo",
            "Total Reacciones",
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
            ws_det[f"D{curr_d_r}"] = emp.direction
            ws_det[f"E{curr_d_r}"] = emp.unit
            ws_det[f"F{curr_d_r}"] = emp.position
            ws_det[f"G{curr_d_r}"] = emp.total_reactions
            ws_det[f"H{curr_d_r}"] = f"{emp.participated_posts_count} / {emp.total_available_posts}"
            ws_det[f"I{curr_d_r}"] = f"{emp.participation_rate}%"

            for col_letter in ["A", "B", "C", "D", "E", "F", "G", "H", "I"]:
                ws_det[f"{col_letter}{curr_d_r}"].border = thin_border
                if col_letter in ["A", "C", "G", "H", "I"]:
                    ws_det[f"{col_letter}{curr_d_r}"].alignment = Alignment(horizontal="center")
            curr_d_r += 1

        # Ajustar ancho de columnas automáticamente
        for ws in [ws_kpis, ws_det]:
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
