---
author: GAMEA DevSecOps
branch: main
status: done
---
# Rol Visualizador y Tablero Ejecutivo de Análisis Estadístico Interactivo

## Intent
Crear y acondicionar un perfil exclusivo de "Visualizador" (`VIEWER`) orientado a autoridades o auditores que requieren acceder únicamente a la sección de Analítica y al Tablero de Decisiones MAE con filtros dinámicos (7, 14, 30, 60 y 90 días) y gráficos analíticos consolidados (tortas, barras, series temporales y KPIs), garantizando aislamiento estricto de funciones operativas o administrativas y eliminando acceso a publicaciones y reportes oficiales.

## Scope
- **Dentro del alcance (IN):**
  - Configurar permisos y navegación en frontend para el rol `UserRole.VIEWER`.
  - Habilitar acceso en el Sidebar al **Tablero Ejecutivo Estadístico** (`analytics`) y **Decisiones MAE** (`mae-dashboard`).
  - Eliminar acceso a **Publicaciones Oficiales** (`publications`) y **Reportes Oficiales** (`reports`) para el rol `VIEWER`.
  - Asegurar redirección predeterminada y confinamiento en `analytics` y `mae-dashboard` para usuarios con rol `VIEWER`.
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
- [x] 2. Backend: Actualizar mapeo de permisos para `VIEWER` en IAM (`dashboard:view_executive`), removiendo `reports:generate` y `publications:read`.
- [x] 3. Backend: Remover `UserRole.VIEWER` de `list_report_executions` en `reporting/router.py`.
- [x] 4. Frontend: Actualizar `Sidebar.tsx` agregando `UserRole.VIEWER` a `mae-dashboard` y retirándolo de `reports` y `publications`.
- [x] 5. Frontend: Actualizar `MainLayout.tsx` confinando la navegación del usuario visor a `analytics` y `mae-dashboard`.
- [x] 6. Frontend: Actualizar `AdminPage.tsx` en `ROLE_DEFINITIONS` para detallar las atribuciones del rol `VIEWER`.
- [x] 7. Verificación: Ejecutar build del frontend (`npm run build`) y suite completa de pruebas de backend.
