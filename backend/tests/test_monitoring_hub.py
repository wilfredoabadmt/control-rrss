"""
Pruebas Automatizadas del Centro de Ingesta, Monitoreo y Fiscalización — GAMEA Social Monitor
Valida conectores de Facebook/TikTok, gestión de audiencia, sincronización y matriz de actividades.
"""

import uuid
import pytest
from modules.iam.models import User
from modules.monitoring.schemas import (
    ConnectorConfigItem,
    ConnectorConfigUpdateRequest,
    MonitoredPersonBulkImportRequest,
    MonitoredPersonCreate,
    RunSyncRequest,
    TestConnectionRequest,
)
from modules.monitoring.service import MonitoringHubService
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def mock_admin_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="admin.monitoreo@elalto.gob.bo",
        full_name="Administrador de Monitoreo",
        password_hash="hash_dummy",
    )


@pytest.mark.asyncio
async def test_connector_config_lifecycle(async_db: AsyncSession, mock_admin_user: User):
    """Verifica la inicialización por defecto y la actualización de conectores."""
    # 1. Obtener configuraciones iniciales
    configs = await MonitoringHubService.get_connector_configs(async_db)
    assert len(configs) >= 2
    plat_names = [c.platform_name for c in configs]
    assert "FACEBOOK" in plat_names
    assert "TIKTOK" in plat_names

    # 2. Actualizar configuración
    update_req = ConnectorConfigUpdateRequest(
        configs=[
            ConnectorConfigItem(
                platform_name="FACEBOOK",
                target_account_id="page_gamea_test_123",
                display_name="Página Oficial GAMEA Actualizada",
                access_token="new_meta_graph_secret_token",
                api_version="v20.0",
                extraction_mode="OFFICIAL_API",
                rate_limit_per_minute=90,
                max_posts_per_sync=30,
                max_comments_per_post=250,
                is_active=True,
            )
        ]
    )
    updated = await MonitoringHubService.update_connector_configs(async_db, update_req, mock_admin_user)
    fb_item = next(c for c in updated if c.platform_name == "FACEBOOK")
    assert fb_item.target_account_id == "page_gamea_test_123"
    assert fb_item.has_token is True
    assert fb_item.rate_limit_per_minute == 90


@pytest.mark.asyncio
async def test_connection_validation(async_db: AsyncSession):
    """Comprueba la prueba de conectividad de Facebook y TikTok."""
    # Test Facebook
    req_fb = TestConnectionRequest(platform_name="FACEBOOK", target_account_id="10006456789")
    res_fb = await MonitoringHubService.test_connection(async_db, req_fb)
    assert res_fb.success is True
    assert res_fb.platform_name == "FACEBOOK"
    assert "Meta Graph API" in res_fb.message

    # Test TikTok (con aviso normativo de restricción epistémica)
    req_tt = TestConnectionRequest(platform_name="TIKTOK", target_account_id="@alcaldia_elalto")
    res_tt = await MonitoringHubService.test_connection(async_db, req_tt)
    assert res_tt.success is True
    assert res_tt.platform_name == "TIKTOK"
    assert "API_RESTRICTED" in res_tt.message


@pytest.mark.asyncio
async def test_audience_roster_and_bulk_import(async_db: AsyncSession, mock_admin_user: User):
    """Verifica el alta individual y la importación masiva de personas a monitorear."""
    # 1. Alta individual
    p_create = MonitoredPersonCreate(
        ci="8492019-LP",
        first_name="Gonzalo",
        last_name="Aruquipa Mamani",
        department="Dirección de Comunicación Institucional",
        position="Especialista de Redes",
        facebook_account="gonzalo.aruquipa.gamea",
        facebook_profile_url="https://facebook.com/gonzalo.aruquipa.gamea",
        tiktok_account="@gonzalo_elalto",
        tiktok_profile_url="https://tiktok.com/@gonzalo_elalto",
    )
    res_p = await MonitoringHubService.add_monitored_person(async_db, p_create, mock_admin_user)
    assert res_p.ci == "8492019-LP"
    assert res_p.full_name == "Gonzalo Aruquipa Mamani"
    assert res_p.facebook_account == "gonzalo.aruquipa.gamea"
    assert res_p.tiktok_account == "@gonzalo_elalto"

    # 2. Importación masiva en CSV
    csv_payload = (
        "CI,Nombre,Apellido,Departamento,Cargo,Facebook,TikTok\n"
        "6123451,Sonia,Quisbert Tintaya,Secretaría de Obras,Supervisora,sonia.quisbert,@sonia_obras\n"
        "7892341,Carlos,Choque Huanca,Dirección de Salud,Médico,@carlos_salud,@carlos_tiktok\n"
    )
    bulk_res = await MonitoringHubService.bulk_import_audience(
        async_db,
        MonitoredPersonBulkImportRequest(raw_text=csv_payload, delimiter=","),
        mock_admin_user,
    )
    assert bulk_res.total_parsed == 2
    assert bulk_res.created_count == 2
    assert bulk_res.failed_count == 0

    # Comprobar que la audiencia total ahora tiene 3 personas
    audience = await MonitoringHubService.get_audience(async_db)
    assert len(audience) >= 3


@pytest.mark.asyncio
async def test_social_sync_and_activity_matrix(async_db: AsyncSession, mock_admin_user: User):
    """Verifica el flujo completo de sincronización, ingesta y cálculo de matriz de auditoría."""
    # 1. Crear persona monitoreada con cuenta de Facebook
    p_create = MonitoredPersonCreate(
        ci="9944221-LP",
        first_name="Patricia",
        last_name="Flores Callisaya",
        department="Secretaría de Desarrollo Social",
        position="Jefa de Unidad",
        facebook_account="patricia.flores.gamea",
        tiktok_account="@patricia_elalto",
    )
    await MonitoringHubService.add_monitored_person(async_db, p_create, mock_admin_user)

    # 2. Ejecutar sincronización
    sync_req = RunSyncRequest(platform="ALL", max_posts=5)
    sync_res = await MonitoringHubService.run_social_sync(async_db, sync_req, mock_admin_user)
    assert sync_res.status == "COMPLETED"
    assert sync_res.posts_processed > 0
    assert sync_res.interactions_extracted > 0

    # 3. Obtener matriz de actividades
    matrix = await MonitoringHubService.get_activity_matrix(async_db)
    assert matrix.summary.total_monitored_persons >= 1
    assert len(matrix.rows) >= 1

    # Buscar la fila de Patricia
    patricia_row = next((r for r in matrix.rows if r.employee_id == "9944221-LP"), None)
    assert patricia_row is not None
    assert patricia_row.has_participated is True
    assert patricia_row.total_reactions > 0

    # 4. Exportar a Excel y validar buffer binario
    excel_buf = await MonitoringHubService.export_matrix_excel(async_db)
    assert excel_buf is not None
    content = excel_buf.getvalue()
    # Encabezado estándar de archivo ZIP/XLSX (PK\x03\x04)
    assert content.startswith(b"PK\x03\x04")
