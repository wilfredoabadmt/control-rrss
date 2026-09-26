# ADR-007: Centro de Ingesta, Monitoreo y Matriz de Fiscalización de Audiencia en Redes Sociales

- **Estado:** Aceptado
- **Fecha:** 2026-09-26
- **Autores:** Equipo de Arquitectura de Software y Comité Técnico GAMEA Social Monitor
- **Contexto Regulatorio:** Principio I (Specification First), Principio IV (APIs Oficiales y Resiliencia), Principio V (No Inventar Datos / Rigor Epistémico), Principio VII (Identidad Única), Principio IX (Modelo de Datos Normalizado), Principio XX (Cifrado AES-256 de Datos Sensibles)

---

## 1. Contexto y Planteamiento del Problema

Las autoridades y directores del Gobierno Autónomo Municipal de El Alto (GAMEA) requieren verificar con rigor técnico y legal la participación y recepción del contenido institucional publicado en sus canales oficiales de **Facebook** y **TikTok**. 

El esquema previo presentaba tres desafíos fundamentales:
1. **Dispersión en la Configuración de Conectores:** Los identificadores de página de Facebook y perfiles de TikTok, junto con sus respectivos tokens y límites operativos, se encontraban estáticos en variables de entorno o dispersos en tablas no unificadas, dificultando la adaptación dinámica por parte de los administradores de comunicaciones.
2. **Dificultad para Cargar y Cruzar Listas Focalizadas de Personas:** No existía una interfaz ágil para que los directores introduzcan una lista personalizada de servidores públicos (C.I., nombres, cuentas de Facebook y TikTok) y ejecuten el cruce algorítmico automatizado contra las publicaciones activas.
3. **Carencia de una Matriz Unificada de Fiscalización para Autoridades:** Las autoridades precisaban una vista consolidada en tiempo real (y exportable a Excel oficial) que detalle: *Persona Monitoreada $\times$ Publicación Institucional $\to$ Tipo de Reacción (Like, Love, etc.) $\to$ Comentario Registrado $\to$ Estado Epistémico de Verificación*.

---

## 2. Decisión Arquitectónica

Se aprueba la incorporación formal del **Módulo 15: Centro de Ingesta, Monitoreo y Matriz de Fiscalización de Audiencia (Social Scraper Hub & Audience Activity Matrix)** bajo metodología estricta de Desarrollo Basado en Especificaciones (SDD):

### 2.1. Modelo Unificado de Parámetros y Conectores Dinámicos (`SocialConnectorConfig`)
- Se implementa la entidad `SocialConnectorConfig` en persistencia relacional.
- Almacena para Facebook y TikTok: identificador oficial de página/cuenta, display name, modo de extracción (`OFFICIAL_API`, `HYBRID_SCRAPER`, `MANUAL_ASSISTED`), límites por minuto, volumen máximo de publicaciones y comentarios.
- Todos los tokens y secretos se almacenan cifrados a nivel de campo con **Fernet / AES-256** mediante `core.security.encryption.encrypt_field`.

### 2.2. Administración Atómica de la Audiencia Monitoreada
- Se provee una API y vista que unifica la creación o actualización de la persona (`Employee`), su estructura institucional (`OrganizationalUnit`, `Position`) y la vinculación biunívoca con sus cuentas de redes sociales (`SocialAccount` para Facebook y TikTok).
- Se implementa la capacidad de **Importación Masiva (Bulk Import)** compatible con formatos CSV y JSON, validando integridad y previniendo duplicidades mediante blind indexing con HMAC-SHA256 (`document_hash`).

### 2.3. Motor de Ingesta Idempotente y Cruce Algorítmico Multicriterio
- Se potencia el `InteractionMatcher` para resolver coincidencias en tres niveles estrictos:
  1. *Nivel 1:* Identificador externo exacto (`external_user_id == author_id`).
  2. *Nivel 2:* Handle / alias en red social (`current_username.lower() == author_id.lower()` eliminando prefijos `@` o URLs).
  3. *Nivel 3:* Nombre completo del funcionario contra el autor reportado en la interacción.
- Se garantiza la estricta **Idempotencia (Principio XV)**: ejecuciones repetidas del scraping jamás duplican registros ni alteran hashes forenses de evidencia.

### 2.4. Matriz de Auditoría y Verificación de Actividades (Activity Matrix)
- Se diseña una estructura bidimensional que cruza a cada persona monitoreada con las publicaciones seleccionadas.
- Clasificación epistémica obligatoria en cada celda:
  - `DATO_CONFIRMADO` (`CONFIRMED`): Interacción cruzada y verificada positivamente.
  - `DATO_OBSERVADO` (`OBSERVED`): Interacción capturada pero pendiente de validación secundaria.
  - `API_RESTRICTED`: Aplicable normativamente a TikTok cuando la plataforma no suministra la identidad individual en likes por política de privacidad externa.
  - `NO_DETECTADO` (`NOT_FOUND`): El usuario no registra actividad comprobable en el post.

### 2.5. Exportador Oficial de Fiscalización a Excel (.xlsx)
- Se incorpora la generación de informes institucionales mediante `openpyxl`, estructurados con carátula oficial del GAMEA, métricas de cumplimiento porcentual, desglose por unidad organizacional y matriz detallada de fiscalización lista para presentación ejecutiva y auditoría interna.

---

## 3. Consecuencias y Cumplimiento de Principios

### Consecuencias Positivas:
- **Trazabilidad Institucional Absoluta:** Las autoridades cuentan con una herramienta profesional, reproducible y matemáticamente verificable.
- **Eficiencia Operativa:** Se elimina la carga manual de revisar perfiles uno por uno en hojas de cálculo no auditables.
- **Seguridad y Privacidad:** Las credenciales nunca se exponen en texto claro y la fiscalización se restringe únicamente a las publicaciones oficiales del GAMEA (Privacy by Design).

### Mitigación de Restricciones Externas:
- Se documenta con total transparencia ante las autoridades que las restricciones de la API de TikTok (imposibilidad de obtener la lista de usuarios que dieron like a videos públicos) son inherentes a los términos del proveedor externo y quedan tipificadas con el estado canónico `API_RESTRICTED`.
