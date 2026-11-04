---
author: GAMEA DevSecOps
branch: main
status: done
---
# Rol Visualizador y Tablero Ejecutivo de Análisis Estadístico Interactivo

## Intent
Crear y acondicionar un perfil exclusivo de "Visualizador" (`VIEWER`) orientado a autoridades o auditores que requieren acceder únicamente al Tablero Ejecutivo Estadístico (Analítica y Cumplimiento) con filtros dinámicos (7, 14, 30, 60 y 90 días) y gráficos analíticos consolidados (tortas, barras, series temporales y KPIs), garantizando visibilidad institucional global (`has_global_visibility`) sin recorte a cero de funcionarios, eliminando el botón de Decisiones MAE y excluyendo publicaciones y reportes oficiales.

## Scope
- **Dentro del alcance (IN):**
  - Configurar permisos y navegación en frontend para el rol `UserRole.VIEWER`.
  - Habilitar acceso en el Sidebar exclusivamente al **Tablero Ejecutivo Estadístico** (`analytics`).
  - Eliminar el botón y sección de **Decisiones MAE** (`mae-dashboard`), **Publicaciones Oficiales** (`publications`) y **Reportes Oficiales** (`reports`) para el rol `VIEWER`.
  - Asegurar redirección predeterminada y confinamiento en `analytics` para usuarios con rol `VIEWER`.
  - Habilitar visibilidad institucional global (`has_global_visibility`) para usuarios con rol `VIEWER`, `MAE`, `AUDITOR` o `workspace_type == "GLOBAL"`, resolviendo la condición que dejaba el tablero en ceros al aislar por `created_by_user_id`.
  - Ocultar botones de mutación o depuración destructiva (ej. "Limpiar Datos de Prueba") ante usuarios con rol `VIEWER`.
  - Incorporar filtros interactivos de ventana temporal para **7 días, 14 días, 30 días, 60 días y 90 días** en el frontend y validar soporte en backend.
  - Asegurar la presencia de gráficos estadísticos ejecutivos:
    - Tortas / Donut: Distribución taxonómica de reacciones y desglose por plataforma.
    - Barras estadísticas: Ranking de participación institucional por Secretaría/Dirección/Subalcaldía en orientación vertical con sustitución de 0 en vacíos.
    - Serie temporal interactiva (Línea / Barras): Tendencia cronológica de interacciones en el período.
    - Medidor de cumplimiento: Semáforo y Gauge porcentual de acompañamiento.
    - Tarjetas KPI ejecutivas animadas.
  - Actualizar la documentación y tabla de roles de `AdminPage.tsx` reflejando las atribuciones exactas de `VIEWER`.
- **Fuera del alcance (OUT):**
  - Creación de nuevas tablas de base de datos (se aprovecha el modelo de roles constitucional existente en `UserRole.VIEWER`).
  - Permisos de edición de campañas, vinculaciones de cuentas, descarga de reportes oficiales o reasignación de personal para este rol.

## Checklist
- [x] 1. Documentar intención y alcance en el documento FTD (`02-DOCS/wiki/ftd/rol-visualizador-dashboard.md`).
- [x] 2. Backend: Implementar `has_global_visibility` en `EmployeeService` y aplicarlo en `MonitoringHubService.get_audience` y `EmployeeService.list_employees`.
- [x] 3. Backend: Actualizar mapeo de permisos para `VIEWER` en IAM (`dashboard:view_executive`), removiendo `reports:generate` y `publications:read`.
- [x] 4. Backend: Remover `UserRole.VIEWER` de `list_report_executions` en `reporting/router.py`.
- [x] 5. Frontend: Actualizar `Sidebar.tsx` eliminando el botón `mae-dashboard` y manteniendo solo `analytics` para `VIEWER`.
- [x] 6. Frontend: Actualizar `MainLayout.tsx` confinando la navegación del usuario visor exclusivamente a `analytics`.
- [x] 7. Frontend: Actualizar `AdminPage.tsx` en `ROLE_DEFINITIONS` para detallar las atribuciones del rol `VIEWER`.
- [x] 8. Verificación: Ejecutar build del frontend (`npm run build`) y suite completa de pruebas de backend.
