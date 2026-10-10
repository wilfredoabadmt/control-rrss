# ADR-008: Tablero Analítico Interactivo de Reacciones y Fiscalización de Audiencia (Analytics Dashboard)

- **Estado:** Aceptado
- **Fecha:** 2026-10-10
- **Autores:** Equipo de Arquitectura de Software y Comité de Comunicaciones GAMEA Social Monitor
- **Contexto Metodológico:** Desarrollo Basado en Especificaciones (SDD v1.0.0)
- **Principios Constitucionales:** Principio I (Specification First), Principio V (No Inventar Datos / Rigor Epistémico), Principio VIII (Fuente Maestra de Recursos Humanos), Principio IX (Modelo de Datos Normalizado), Principio XV (Idempotencia), Principio XXI (Eficiencia Transaccional), Principio XXVII (Prohibición de Uso Punitivo y Carácter Agregado)

---

## 1. Contexto y Justificación de Negocio

El Gobierno Autónomo Municipal de El Alto (GAMEA) gestiona múltiples campañas y publicaciones oficiales a través de sus canales de Facebook y TikTok. Para evaluar el impacto real y el acompañamiento orgánico de los funcionarios públicos de las distintas secretarías y direcciones municipales, las autoridades requerían una herramienta estadística de nivel ejecutivo que supere las hojas de cálculo estáticas.

### Necesidades Identificadas:
1. **Visualización Gráfica y Dinámica de Interacciones:** Comprender de forma inmediata qué secretarías y direcciones participan más activamente y cuáles requieren refuerzo informativo.
2. **Taxonomía Desglosada de Reacciones:** Visualizar la distribución precisa de tipos de reacción (Me gusta, Me encanta, Me importa, Comentarios, Compartidos) conforme a la taxonomía canónica de `InteractionType`.
3. **Evolución Temporal de la Actividad:** Monitorear curvas y tendencias cronológicas para evaluar la respuesta de los funcionarios en los primeros días tras el lanzamiento de cada publicación o campaña.
4. **Segmentación y Filtros Multicriterio:** Capacidad de aislar el análisis por rango de fechas, publicación específica, red social (Facebook vs TikTok), dirección y unidad organizacional.
5. **Garantía de Privacidad y Aislamiento (Principio XXVII y REQ-EMP-005):** Asegurar que las métricas reflejen datos agregados sin generar clasificaciones punitivas individuales, y respetando estrictamente el alcance del espacio de trabajo del usuario que consulta (Global para Super Admin, restringido para directores y usuarios autónomos).

---

## 2. Decisión Arquitectónica

Se aprueba la implementación del **Módulo 16: Analítica Interactiva de Reacciones y Fiscalización de Audiencia (Analytics & Reaction Metrics Engine)** bajo metodología estricta SDD.

### 2.1. Arquitectura de Backend (`modules/analytics`)
- **Controlador REST (`router.py`):**
  - `GET /api/v1/analytics/overview`: Retorna KPIs agregados, métricas por dirección, desglose taxonómico de reacciones, comparativa entre plataformas y serie temporal de actividad.
  - `GET /api/v1/analytics/employees`: Listado paginado y enriquecido de funcionarios con métricas individuales agregadas (total de reacciones, publicaciones alcanzadas, tasa de participación y marcas de tiempo).
  - `GET /api/v1/analytics/export`: Generador de informes analíticos en formato Excel (.xlsx) estructurado.
- **Servicio Analítico (`service.py`):**
  - Agregaciones optimizadas en base de datos con índices deterministas.
  - Aplicación automática del filtro de espacio de trabajo (`is_global_superadmin`):
    - Super Administrador Global: Acceso total o filtrado a todo el municipio.
    - Usuario de Dirección: Restringido a las unidades de su dirección.
    - Usuario Autónomo: Restringido a los funcionarios creados/cargados por su propia cuenta.
- **Esquemas Pydantic (`schemas.py`):**
  - Contratos tipados y validados con rigor taxonómico para KPIs, series temporales, rankings de direcciones y distribuciones porcentuales.

### 2.2. Arquitectura de Frontend (`frontend/src/pages/AnalyticsDashboardPage.tsx`)
- **Componentes Gráficos Nativos en SVG Interactivo:**
  - `BarChartDirection`: Gráfico de barras horizontales/verticales con porcentajes y tooltips dinámicos, con interactividad para filtrar por dirección al hacer clic.
  - `DonutChartReactions`: Gráfico circular interactivo con desglose de reacciones (`LIKE`, `LOVE`, `CARE`, `COMMENT`, `SHARE`) y leyenda con porcentajes.
  - `TimelineChart`: Curva temporal cronológica con marcadores y tooltips de fecha y volumen de reacciones.
  - `PlatformComparisonBar`: Comparativa de volumen de actividad entre Facebook y TikTok.
- **Panel de Filtros y Botones Interactivos:**
  - Botones de selección rápida de período temporal: "Últimos 7 días", "Últimos 15 días", "Últimos 30 días", "Todo el historial".
  - Selectores dinámicos: Dirección, Unidad, Publicación específica, Plataforma, Tipo de reacción y Estado de participación.
  - Botón de actualización en tiempo real y botón de exportación a Excel (.xlsx).
- **Integración de Navegación:**
  - Sección incorporada en `Sidebar.tsx` como **"Analítica de Reacciones"** con icono `BarChart3` e ID `'analytics'`.

### 2.3. Filtrado Jerárquico Tridimensional en Cascada (`organigrama.ts`)
- Modelado formal de la jerarquía municipal de tres niveles:
  `Secretaría Municipal / Despacho Alcalde` -> `Dirección Dependiente` -> `Unidad Organizacional`.
- Los selectores en cascada garantizan que al elegir una secretaría sólo se listen sus direcciones adscritas, y al seleccionar una dirección sólo se listen sus unidades operativas.
- Sincronización bidireccional entre la selección jerárquica y el gráfico interactivo de barras.

### 2.4. Saneamiento de Datos de Prueba (Pureza Institucional)
- Depuración completa de interacciones y verificaciones de prueba para asegurar que el tablero presente exclusivamente datos reales correspondientes al padrón y actividad institucional.

---

## 3. Consecuencias y Verificación

### Consecuencias Positivas:
- Las autoridades cuentan con tableros ejecutivos interactivos sin depender de procesamiento manual.
- Transparencia y rigor epistémico garantizado: cada número proviene de evidencias y cruces verificados en la base de datos institucional.
- Experiencia de usuario ágil y visualmente atractiva con paleta dark mode profesional.
- Navegación organizacional intuitiva adaptada fielmente a la estructura administrativa de El Alto.

### Verificación Automatizada:
- Se incorporan pruebas unitarias y de integración en `backend/tests/test_analytics_dashboard.py`, validando el cálculo de KPIs, filtrado jerárquico por secretaría/dirección/unidad, aislamiento de workspace y exportación.

