# Especificación Funcional: Módulo 16 — Analítica de Reacciones y Fiscalización Interactiva (SDD)

- **Versión:** 1.0.0
- **Fecha:** 2026-10-10
- **Estado:** Implementado / Aprobado
- **Subordinación:** [Constitución SDD v1.0.0](file:///f:/Documentos/GitHub/Control%20RRSS/docs/constitution.md)

---

## 1. Requisitos Funcionales (RF)

- **RF-ANL-001 (KPIs Globales Dinámicos):** El sistema debe computar y exponer:
  - Total de funcionarios en el alcance del usuario (`total_employees`).
  - Total de funcionarios con cuentas sociales observables (`observable_employees`).
  - Total de publicaciones oficiales auditadas en el período (`total_publications`).
  - Total de reacciones registradas de servidores públicos (`total_reactions`).
  - Tasa global de participación institucional en porcentaje (`participation_rate`).
  - Promedio de reacciones por publicación (`average_reactions_per_post`).

- **RF-ANL-002 (Taxonomía de Reacciones):** Desglose absoluto y porcentual de reacciones según los tipos canónicos:
  - `LIKE` (Me gusta)
  - `LOVE` (Me encanta)
  - `CARE` (Me importa)
  - `HAHA` (Me divierte)
  - `WOW` (Me asombra)
  - `SAD` (Me entristece)
  - `ANGRY` (Me enoja)
  - `COMMENT` (Comentarios)
  - `SHARE` (Compartidos)

- **RF-ANL-003 (Métricas por Dirección y Unidad):**
  - Para cada Dirección/Secretaría: total de funcionarios, funcionarios que registraron al menos una reacción, total de reacciones emitidas y porcentaje de cumplimiento/participación.

- **RF-ANL-004 (Serie Temporal de Interacciones):**
  - Conteo de interacciones agrupadas cronológicamente por día o fecha de publicación para evaluar tendencias de acompañamiento.

- **RF-ANL-005 (Comparativa de Redes Sociales):**
  - Volumen y proporción de interacciones entre Facebook y TikTok.

- **RF-ANL-006 (Filtros Multidimensionales):**
  - Período temporal (`date_from`, `date_to` o presets de 7, 15, 30 días).
  - Dirección institucional (`direction`).
  - Unidad organizacional (`unit_id`).
  - Publicación específica (`publication_id`).
  - Plataforma de red social (`platform`).
  - Tipo de reacción (`reaction_type`).
  - Estado de participación (`status`: `ALL`, `PARTICIPATED`, `NO_REACTION`).

- **RF-ANL-007 (Aislamiento de Espacio de Trabajo - REQ-EMP-005):**
  - Si el usuario que consulta tiene alcance `AUTONOMOUS`, las métricas y funcionarios se restringen estrictamente a los creados por él.
  - Si el usuario tiene `DIRECTION` o `UNIT`, se restringen a su área asignada.
  - Si el usuario es `SUPER_ADMIN` con alcance `GLOBAL`, accede al consolidado de todo el municipio.

- **RF-ANL-008 (Filtro Jerárquico Tridimensional en Cascada):**
  - Nivel 1 (Secretaría Municipal): Selección de Secretaría Municipal o Despacho del Alcalde.
  - Nivel 2 (Dirección dependiente): Al seleccionar una secretaría, se habilitan exclusivamente las direcciones que pertenecen a ella.
  - Nivel 3 (Unidad dependiente): Al seleccionar una dirección, se habilitan exclusivamente las unidades que pertenecen a ella.
  - Al resetear o cambiar de secretaría, dirección y unidad se resetean a `ALL`.

- **RF-ANL-009 (Sincronización Bidireccional de Gráficos):**
  - Al hacer click en una barra del gráfico de direcciones, el filtro jerárquico se auto-selecciona y los KPIs/tabla se sincronizan instantáneamente.

- **RF-ANL-010 (Depuración de Datos de Prueba / Pureza Institucional):**
  - Mecanismo seguro para eliminar interacciones y verificaciones de prueba para que los tableros visualicen con estricta fidelidad únicamente los datos cargados por operadores reales.

---

## 2. Contrato de API (REST Endpoints)

### `GET /api/v1/analytics/overview`
**Parámetros Query:**
- `date_from` (opcional, ISO date)
- `date_to` (opcional, ISO date)
- `direction` (opcional, string)
- `unit_id` (opcional, UUID)
- `publication_id` (opcional, UUID)
- `platform` (opcional, string: `ALL`, `FACEBOOK`, `TIKTOK`)
- `reaction_type` (opcional, string)
- `days` (opcional, int: 7, 15, 30)

**Estructura de Respuesta (`AnalyticsOverviewResponse`):**
```json
{
  "kpis": {
    "total_employees": 240,
    "observable_employees": 210,
    "total_publications": 14,
    "total_reactions": 850,
    "total_comments": 45,
    "total_shares": 72,
    "participation_rate": 87.5,
    "average_reactions_per_post": 60.7
  },
  "reactions_breakdown": [
    { "type": "LIKE", "label": "Me gusta", "count": 620, "percentage": 72.9, "color": "#3b82f6" },
    { "type": "LOVE", "label": "Me encanta", "count": 180, "percentage": 21.2, "color": "#ef4444" },
    { "type": "CARE", "label": "Me importa", "count": 50, "percentage": 5.9, "color": "#f59e0b" }
  ],
  "direction_rankings": [
    {
      "direction": "Dirección de Comunicación",
      "total_employees": 45,
      "participating_employees": 42,
      "total_reactions": 230,
      "participation_rate": 93.3
    }
  ],
  "timeline_series": [
    { "date": "2026-10-01", "reactions": 65, "comments": 5, "shares": 8 },
    { "date": "2026-10-02", "reactions": 110, "comments": 12, "shares": 15 }
  ],
  "platform_comparison": {
    "facebook": { "total_reactions": 720, "percentage": 84.7 },
    "tiktok": { "total_reactions": 130, "percentage": 15.3 }
  }
}
```

### `GET /api/v1/analytics/employees`
**Parámetros Query:**
- Mismos filtros que overview + `search`, `page`, `page_size`, `participation_status`.

**Estructura de Respuesta (`AnalyticsEmployeesPageResponse`):**
- Listado detallado de funcionarios con métricas individuales y paginación estándar.

---

## 3. Principios Constitucionales Aplicados

- **Principio V (No Inventar Datos):** Todas las métricas se computan exclusivamente a partir de registros reales en `interactions`, `verifications` y `employees`.
- **Principio XXVII (Carácter Agregado):** Las visualizaciones principales presentan resúmenes estadísticos e institucionales para toma de decisiones directivas, garantizando un enfoque constructivo.
- **Principio XXI (Persistencia Transaccional y Performance):** Consultas indexadas mediante SQLAlchemy con proyecciones agrupadas directas en SQL para tiempos de respuesta menores a 200ms.
