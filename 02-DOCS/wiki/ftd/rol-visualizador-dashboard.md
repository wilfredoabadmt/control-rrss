---
author: GAMEA DevSecOps
branch: main
status: done
---
# Rol Visualizador y Tablero Ejecutivo de Análisis Estadístico Interactivo

## Intent
Crear y acondicionar un perfil exclusivo de "Visualizador" (`VIEWER`) orientado a autoridades o auditores externos que requieren acceder únicamente a un tablero ejecutivo estadístico interactivo con filtros dinámicos (7, 15, 30, 60 y 90 días) y gráficos analíticos consolidados (tortas, barras, series temporales y KPIs), garantizando aislamiento estricto de funciones operativas o administrativas y sin exposición de acciones destructivas ni PII innecesaria.

## Scope
- **Dentro del alcance (IN):**
  - Configurar permisos y navegación en frontend para el rol `UserRole.VIEWER`.
  - Asegurar redirección predeterminada al Tablero Ejecutivo Estadístico (`analytics`) para usuarios con rol `VIEWER`.
  - Restringir la barra lateral (Sidebar) para que el rol `VIEWER` solo visualice el Tablero Ejecutivo y Reportes Oficiales, bloqueando acceso a paneles operativos, padrón de personal o configuración de usuarios.
  - Ocultar botones de mutación o depuración destructiva (ej. "Limpiar Datos de Prueba") ante usuarios con rol `VIEWER`.
  - Incorporar filtros interactivos de ventana temporal para **7 días, 15 días, 30 días, 60 días y 90 días** en el frontend y validar soporte en backend.
  - Asegurar la presencia de gráficos estadísticos ejecutivos:
    - Tortas / Donut: Distribución taxonómica de reacciones y desglose por plataforma.
    - Barras estadísticas: Ranking de participación institucional por Secretaría/Dirección/Subalcaldía.
    - Serie temporal interactiva (Línea / Barras): Tendencia cronológica de interacciones en el período.
    - Medidor de cumplimiento: Semáforo y Gauge porcentual de acompañamiento.
    - Tarjetas KPI ejecutivas animadas.
  - Mantener exportación ejecutiva a Excel con los filtros aplicados.
- **Fuera del alcance (OUT):**
  - Creación de nuevas tablas de base de datos (se aprovecha el modelo de roles constitucional existente en `UserRole.VIEWER`).
  - Permisos de edición de campañas, vinculaciones de cuentas o reasignación de personal para este rol.

## Checklist
- [x] 1. Documentar intención y alcance en el documento FTD (`02-DOCS/wiki/ftd/rol-visualizador-dashboard.md`).
- [x] 2. Backend: Verificar y asegurar mapeo de permisos de lectura para `VIEWER` en IAM (`dashboard:view_executive`, `analytics:read`, `reports:generate`).
- [x] 3. Frontend: Actualizar `AnalyticsDashboardPage.tsx` con filtros de 7, 15, 30, 60 y 90 días.
- [x] 4. Frontend: Ajustar interfaz para ocultar acciones destructivas a usuarios `VIEWER`.
- [x] 5. Frontend: Actualizar `Sidebar.tsx`, `MainLayout.tsx` y `App.tsx` para autorizar a `VIEWER` al Tablero Ejecutivo y redirigir por defecto.
- [x] 6. Verificación: Ejecutar build del frontend (`npm run build`) y pruebas para verificar que no haya regresiones.

## Evidence
- **Backend Tests:**
  - `uv run pytest backend/tests/test_iam_service.py` -> 3 tests pasados en 0.86s.
  - `uv run pytest backend/tests/test_analytics_dashboard.py` -> 9 tests pasados en 1.13s.
- **Frontend Build:**
  - `npm run build` en `frontend/` -> 1591 módulos transformados, 0 errores TypeScript, bundle generado en 2.11s (`dist/assets/index-Ce1fC_wu.js`).

## Next
- Probar el inicio de sesión con un usuario con rol `VIEWER` en el frontend y validar la visualización del tablero ejecutivo con los filtros de 7, 15, 30, 60 y 90 días.
