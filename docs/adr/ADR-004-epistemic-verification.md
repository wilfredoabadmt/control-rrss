# ADR-004: Verificación Epistémica y Prohibición de Rankings Punitivos

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Arquitectura y Comité de Ética GAMEA Social Monitor
- **Contexto Regulatorio:** Principio V (Verificación Epistémica y No Inventar Datos), Principio XXVII (Prohibición de Rankings de Empleados y Métricas Punitivas)

---

## 1. Contexto y Planteamiento del Problema

El análisis de interacción institucional en redes sociales conlleva importantes riesgos éticos, laborales y operacionales:
1. **Riesgo de Juicios Arbitrarios o Alucinación:** La clasificación de si un funcionario interactuó o no con contenido oficial no puede basarse en inferencias heurísticas opacas ni asunciones no sustentadas ("inventar datos"). Si una interacción no cuenta con evidencia digital concluyente o el perfil presenta ambigüedad, el sistema debe manifestar con exactitud el estado epistémico de dicha observación.
2. **Riesgo de Persecución y Punición Laboral:** La utilización de métricas individuales de redes sociales para calificar el desempeño de los servidores públicos, generar tablas de clasificación (rankings), premiar o penalizar a empleados atenta contra los derechos laborales y los mandatos del GAMEA.

---

## 2. Decisión

Se adopta un **Modelo Epistémico de 8 Categorías Canónicas Cerradas** y una **Prohibición Constitucional Absoluta de Métricas Punitivas o Competitivas**:

### 2.1. Taxonomía Epistémica Canónica (8 Estados Obligatorios)

Cada proceso de verificación automatizada o asistida asigna estrictamente una de las siguientes 8 categorías, acompañada de una justificación textual explicativa obligatoria:

1. `VERIFIED_ORGANIC`: Interacción verificada exitosamente con coincidencia concluyente de perfil del funcionario y evidencia digital criptográficamente íntegra.
2. `VERIFIED_UNVERIFIABLE_ORIGIN`: La interacción existe en la plataforma pero la cuenta originadora posee restricciones de privacidad que impiden validar la titularidad exacta.
3. `VERIFIED_DISCREPANCY`: Se constata discrepancia temporal o de identificador entre el perfil registrado institucionalmente y el evento en la red social.
4. `UNVERIFIED_PENDING_MATCH`: Interacción detectada pero en espera de corroboración o vinculación de perfil en el directorio.
5. `UNVERIFIED_AMBIGUOUS_MATCH`: Múltiples cuentas comparten identificadores o nombres similares, impidiendo una asociación biunívoca sin ambigüedad.
6. `UNVERIFIED_PROFILE_INACTIVE`: El perfil social del funcionario se encuentra reportado como inactivo o dado de baja temporalmente.
7. `UNVERIFIED_NO_EVIDENCE`: No se halló registro de interacción ni payload digital en el periodo de observación consultado.
8. `EXTERNAL_ANOMALOUS_ACTIVITY`: Comportamiento atípico detectado (patrón masivo automatizado, bot o actividad inusual ajena al flujo institucional estándar).

### 2.2. Regla "No Inventar Datos" (Strict Epistemic Integrity)

- Está terminantemente prohibido generar registros sintéticos de interacción o forzar asociaciones de probabilidad como hechos consumados.
- Si no hay evidencia fehaciente almacenada (con hash SHA-256 del payload original), el estado de verificación debe ser `UNVERIFIED_NO_EVIDENCE` o `UNVERIFIED_PENDING_MATCH`.

### 2.3. Prohibición de Rankings y Métricas Punitivas (Principio XXVII)

- **Cero Tablas de Clasificación (Leaderboards):** El sistema prohíbe el desarrollo de endpoints, vistas o reportes que ordenen a los empleados de mayor a menor cantidad de interacciones.
- **Agregación a Nivel Organizacional:** La analítica institucional se calcula por Secretarías, Direcciones y Unidades organizacionales (`unit_coverage`, `reach`, `participation_rate`), garantizando una visión global de difusión comunicacional sin individualizar persecuciones.
- **Validación en Capa de Reportes:** Todo reporte Excel o API valida que no se expongan scores de rendimiento de empleados vinculados a sanciones administrativas.

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **Rigor Científico y Legal:** Las evaluaciones emitidas por la plataforma son transparentes, reproducibles y resistentes a impugnaciones técnicas.
- **Protección del Clima Laboral y Derechos de los Servidores:** Foco institucional en la efectividad comunicacional del municipio y no en el hostigamiento a los funcionarios.
- **Claridad Operativa:** Los operadores y verificadores cuentan con definiciones precisas y no subjetivas para clasificar cada evento.

### Consecuencias Negativas y Mitigación:
- **Mayor Rigidez en Reportes:** No es posible responder a solicitudes no autorizadas que pidan "la lista de los 10 empleados que menos comparten". Esto se defiende activamente como un principio de gobernanza y protección institucional insoslayable.
