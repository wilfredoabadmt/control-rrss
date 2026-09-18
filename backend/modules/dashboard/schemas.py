"""
Esquemas Pydantic para Dashboards Operativo y Ejecutivo — GAMEA Social Monitor
REQ-DSH-001, REQ-DSH-002
"""

from typing import Any

from pydantic import BaseModel, ConfigDict


class PlatformHealthItem(BaseModel):
    name: str
    display_name: str
    is_active: bool
    status: str  # ONLINE, DEGRADED, OFFLINE


class OperationalDashboardResponse(BaseModel):
    platforms: list[PlatformHealthItem]
    monitored_publications_count: int
    total_interactions_count: int
    pending_verifications_count: int
    recent_sync_jobs: list[dict[str, Any]]
    active_alerts: list[dict[str, str]]


class ExecutiveDashboardResponse(BaseModel):
    observable_coverage_rate: dict[str, Any]
    verification_rate: dict[str, Any]
    verification_distribution: dict[str, int]
    platform_breakdown: dict[str, int]
    total_active_employees: int
    constitutional_disclaimer: str

    model_config = ConfigDict(from_attributes=True)
