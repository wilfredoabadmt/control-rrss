# GAMEA Social Monitor — Task Breakdown

<!--
  DESGLOSE DE TAREAS DE IMPLEMENTACIÓN
  Proyecto: GAMEA Social Monitor
  Versión: 1.0.0
  Fecha: 2026-09-17
  Plan Referido: plan.md v1.0.0
  Especificación Referida: spec.md v1.0.0
  Constitución Referida: constitution.md v1.0.0
-->

> [!NOTE]
> Las tareas están organizadas en fases incrementales. Cada tarea indica los requerimientos de `spec.md` que implementa (trazabilidad). Las fases se ejecutan secuencialmente; dentro de cada fase las tareas pueden ejecutarse en paralelo cuando no tengan dependencias.

---

## Fase 0 — Fundación del Proyecto [COMPLETADA]

### [x] T-000: Inicializar repositorio y estructura de directorios
- **Reqs:** Principio XXXVIII (Documentación Viva)
- **Entregable:** Repositorio Git con estructura de directorios según `plan.md §2.2`, `.gitignore`, `README.md`, `LICENSE`.
- **Estado:** ✅ Completado. Estructura de 14 módulos, `.gitignore`, `LICENSE` institucional y `README.md` creados.

### [x] T-001: Configurar Docker Compose para desarrollo local
- **Reqs:** ADR-005, Principio XXXV
- **Entregable:** `docker-compose.yml`, `docker-compose.prod.yml`, `Dockerfile`, `Dockerfile.frontend` con servicios: `api`, `worker`, `beat`, `frontend`, `postgres`, `redis`.
- **Estado:** ✅ Completado. Configuraciones dev y prod creadas con health checks y `.env.example`.

### [x] T-002: Configurar FastAPI base con sistema de configuración externalizada
- **Reqs:** REQ-ADM-001, REQ-ADM-003, Principio XXXI
- **Entregable:** `backend/main.py`, `config.py` con Pydantic Settings, `dependencies.py`, endpoints `/health/liveness` y `/health/readiness`.
- **Estado:** ✅ Completado. FastAPI configurado con Pydantic Settings, endpoints de salud y paginación genérica.

### [x] T-003: Configurar SQLAlchemy + Alembic + conexión PostgreSQL
- **Reqs:** ADR-003, Principio XXI
- **Entregable:** `database.py`, `alembic.ini`, directorio `alembic/`, migración inicial vacía.
- **Estado:** ✅ Completado. Motores async/sync configurados, `alembic.ini`, `alembic/env.py` y migración inicial con extensión `uuid-ossp`.

### [x] T-004: Configurar Celery + Redis para tareas asíncronas
- **Reqs:** ADR-003, Principio XIV
- **Entregable:** `workers/celery_app.py`, `workers/beat_schedule.py`, tarea de prueba `ping`.
- **Estado:** ✅ Completado. Instancia Celery configurada con JSON serialization, ruteo por colas, beat scheduler y tarea `ping`.

### [x] T-005: Configurar structlog para logging estructurado
- **Reqs:** Principio XXII
- **Entregable:** Configuración de `structlog` con formato JSON, correlation_id middleware.
- **Estado:** ✅ Completado. `core/logging_config.py` con JSON renderer y middleware de correlación HTTP en `main.py`.

### [x] T-006: Configurar pipeline CI básico
- **Reqs:** Principio XXXIV
- **Entregable:** Archivo de configuración CI (.github/workflows/ci.yml) con: lint (`ruff`), type check (`mypy`), tests (`pytest`), build frontend.
- **Estado:** ✅ Completado. Pipeline CI en `.github/workflows/ci.yml`.

### [x] T-007: Inicializar frontend React + TypeScript + Vite
- **Reqs:** ADR-002
- **Entregable:** `frontend/` con Vite + React + TypeScript configurado. Página de login y dashboard.
- **Estado:** ✅ Completado. Vite + React 18 + TS, `LoginPage`, `DashboardPage`, sistema de estilos CSS institucional.

### [x] T-008: Configurar enums canónicos y tipos compartidos
- **Reqs:** Principios V, XXIII
- **Entregable:** `backend/modules/shared/enums.py` con: `DataOriginType` (8 categorías), `SyncJobStatus` (10 estados), `VerificationStatus`, `InteractionType`, `BindingStatus`, `EmployeeStatus`, `CaptureMethod`, `UserRole`. Tests unitarios.
- **Estado:** ✅ Completado. Enums canónicos, puertos `SocialPlatformPort`, excepciones de dominio y tests en `backend/tests/test_shared_enums.py`.

---

## Fase 1 — Core: IAM + Auditoría [COMPLETADA]

### [x] T-100: Implementar modelos de base de datos de IAM
- **Reqs:** REQ-IAM-001 a 004
- **Entregable:** `modules/iam/models.py` con tablas `users`, `roles`, `user_roles`, `permissions`. Migración Alembic `0002_iam_and_audit.py`.
- **Estado:** ✅ Completado. Modelos, seed de los 7 roles constitucionales y migración con extensiones UUID.

### [x] T-101: Implementar servicio de autenticación (login/logout/refresh)
- **Reqs:** REQ-IAM-001, REQ-IAM-004, ADR-004
- **Entregable:** `core/security/` con: hashing Argon2id (`password.py`), generación/validación JWT (`tokens.py`), middleware de autenticación (`auth.py`).
- **Estado:** ✅ Completado. Bloqueo temporal por 15 minutos tras 5 intentos fallidos consecutivos (BR-IAM-002) verificado.

### [x] T-102: Implementar middleware RBAC en backend
- **Reqs:** REQ-IAM-002, Principio XVII
- **Entregable:** `core/security/rbac.py` con `require_roles` y `require_permissions` en cada endpoint.
- **Estado:** ✅ Completado. RBAC estricto en backend; `ANALYST` recibe `403 Forbidden` al acceder a endpoints de administración.

### [x] T-103: Implementar CRUD de usuarios
- **Reqs:** REQ-IAM-003
- **Entregable:** `modules/iam/schemas.py`, `modules/iam/service.py`, `modules/iam/router.py` con CRUD de usuarios, asignación de roles exclusiva para `SUPER_ADMIN`.
- **Estado:** ✅ Completado. CRUD completo, baja lógica (BR-IAM-009) sin eliminación física y validación de complejidad de contraseña (BR-IAM-004).

### [x] T-104: Implementar sistema de auditoría append-only
- **Reqs:** REQ-AUD-001, REQ-AUD-002, Principio X
- **Entregable:** `core/audit/models.py` con tabla `audit_events`, listeners para bloquear `UPDATE` y `DELETE`, servicio `record_audit_event`.
- **Estado:** ✅ Completado. Tabla append-only con listener `ImmutableAuditException` y triggers PostgreSQL.

### [x] T-105: Implementar consulta y exportación de auditoría
- **Reqs:** REQ-AUD-002
- **Entregable:** `core/audit/router.py` con `GET /api/v1/audit/events` (filtros por usuario, acción, entidad, fechas, correlation_id) y exportación CSV en `GET /api/v1/audit/export`.
- **Estado:** ✅ Completado. Endpoints paginados y streaming CSV para auditoría, restringidos a `AUDITOR` y `SUPER_ADMIN`.

---

## Fase 2 — Directorio de Funcionarios y Organización [COMPLETADA]

### [x] T-200: Implementar modelos de Employee, OrgUnit, Position, EmployeeHistory
- **Reqs:** REQ-EMP-001, REQ-EMP-002, Principios VII, VIII, IX, XX
- **Entregable:** `modules/employees/models.py` con tablas `employees`, `organizational_units`, `positions`, `employee_history`. Migración Alembic `0003_employees_and_org.py`.
- **Estado:** ✅ Completado. `employee_id` como PK inmutable, cifrado de PII con Fernet/AES-256 y blind index HMAC-SHA256.

### [x] T-201: Implementar CRUD de unidades organizacionales
- **Reqs:** REQ-EMP-002
- **Entregable:** `modules/employees/router.py` con CRUD de `organizational_units` y `positions`. Endpoint `GET /api/v1/org-units/tree` para árbol jerárquico.
- **Estado:** ✅ Completado. Estructura recursiva padre-hijo y catálogo de cargos implementado.

### [x] T-202: Implementar CRUD de funcionarios
- **Reqs:** REQ-EMP-001, Principios VII, XX
- **Entregable:** Endpoints CRUD para `employees` con PII masking dinámico según rol y validación de inmutabilidad de `employee_id`.
- **Estado:** ✅ Completado. CRUD operativo con protección de datos personales.

### [x] T-203: Implementar importación de nómina desde archivo
- **Reqs:** REQ-EMP-003, Principio VIII
- **Entregable:** `modules/employees/importer.py` con `POST /api/v1/employees/import`. Acepta Excel (.xlsx) y CSV.
- **Estado:** ✅ Completado. Sincronización estrictamente idempotente: doble importación idéntica = 0 mutaciones (100% unchanged).

### [x] T-204: Implementar historial de cambios organizacionales
- **Reqs:** REQ-EMP-004
- **Entregable:** Registro automático en `employee_history` ante cambios de unidad, cargo o estado. Endpoint `GET /api/v1/employees/{id}/history`.
- **Estado:** ✅ Completado. Trazabilidad completa con auditoría de motivos y usuario que efectuó la acción.

---

## Fase 3 — Vinculación Social y Publicaciones [COMPLETADA]

### [x] T-300: Implementar modelos de SocialPlatform, SocialAccount, InstitutionalAccount
- **Reqs:** REQ-SAB-001, REQ-PUB-001, Principio IX
- **Entregable:** Modelos y migraciones para `social_platforms`, `social_accounts`, `username_history`, `institutional_accounts`.
- **Estado:** ✅ Completado. Modelos en `modules/social_accounts/models.py`, seed para FACEBOOK y TIKTOK en `seed.py`, y migración `0004_social_and_publications.py`.

### [x] T-301: Implementar vinculación/desvinculación de cuentas sociales
- **Reqs:** REQ-SAB-001, REQ-SAB-003, Principio VII
- **Entregable:** Endpoints `POST /bind`, `POST /unbind` en `modules/social_accounts/router.py`.
- **Estado:** ✅ Completado. Validación de unicidad de external_user_id por plataforma, desvinculación lógica preservando trazabilidad completa e inserción de eventos de auditoría append-only.

### [x] T-302: Implementar historial de cambios de username
- **Reqs:** REQ-SAB-002
- **Entregable:** Actualización de `current_username` con registro en `username_history`.
- **Estado:** ✅ Completado. Endpoint `PATCH /api/v1/social-accounts/{id}/username` con tracking histórico inmutable y correlation_id en `username_history`.

### [x] T-303: Implementar modelos de Publication, Campaign, Target
- **Reqs:** REQ-PUB-002, REQ-PUB-003, REQ-PUB-004
- **Entregable:** Modelos y migraciones para `publications`, `monitoring_campaigns`, `campaign_publications`, `monitoring_targets`.
- **Estado:** ✅ Completado. Modelos en `modules/publications/models.py`, restricción única compuesta `(platform_id, external_post_id)` para ingesta idempotente, tabla intermedia M:N y metas por unidad.

### [x] T-304: Implementar CRUD de publicaciones y campañas
- **Reqs:** REQ-PUB-002, REQ-PUB-003, REQ-PUB-004
- **Entregable:** Endpoints CRUD para publicaciones (registro manual e idempotente), campañas y metas institucionales.
- **Estado:** ✅ Completado. Routers en `modules/publications/router.py` montados en `/publications` y `/campaigns` con auditoría completa y verificación en tests.

---

## Fase 4 — Interacciones y Verificación (Core Domain) [COMPLETADA]

### [x] T-400: Implementar modelos de Interaction, Evidence, Verification
- **Reqs:** REQ-INT-001, REQ-INT-002, REQ-VER-001
- **Entregable:** Modelos y migraciones con todos los campos de proveniencia (Principio VI) y tipificación epistémica (Principio V). Índice único de idempotencia.
- **Estado:** ✅ Completado. Modelos `Interaction`, `InteractionEvidence`, `Verification` y `ExternalSyncJob` creados en `modules/interactions/`, `modules/verification/` y `modules/monitoring/`. Migración Alembic `0005_interactions_and_verifications.py`.

### [x] T-401: Implementar procesador de interacciones idempotente
- **Reqs:** REQ-INT-001, Principio XV
- **Entregable:** `modules/interactions/processor.py` con lógica de ingesta idempotente.
- **Estado:** ✅ Completado. 10 inserciones consecutivas o concurrentes del mismo payload = exactamente 1 registro. Generación de hash SHA-256 forense almacenado en evidencias técnicas.

### [x] T-402: Implementar motor de cruce automático con funcionarios
- **Reqs:** REQ-INT-003
- **Entregable:** `modules/interactions/matcher.py` que cruza `external_author_id` con `social_accounts.external_user_id`.
- **Estado:** ✅ Completado. Coincidencia con funcionario activo → `MATCHED`. No registrado → `UNMATCHED`. Sin autor observable o API restringida → `NOT_OBSERVABLE`.

### [x] T-403: Implementar motor de verificación automática
- **Reqs:** REQ-VER-001
- **Entregable:** `modules/verification/engine.py` con flujo automático de verificación.
- **Estado:** ✅ Completado. Dictamen automático con creación de registro inmutable `Verification` (`CONFIRMED`, `NOT_FOUND` o `NOT_OBSERVABLE`) y registro de auditoría append-only.

### [x] T-404: Implementar verificación manual asistida
- **Reqs:** REQ-VER-002
- **Entregable:** Endpoint `POST /api/v1/verifications/manual` con evidencia, explicación, funcionario.
- **Estado:** ✅ Completado. Operador analista declara `DECLARED_CONFIRMED` o `DECLARED_NOT_FOUND` con justificación documental obligatoria y captura adjunta.

### [x] T-405: Implementar explicabilidad de estados
- **Reqs:** REQ-VER-004, Principio XXVIII
- **Entregable:** `modules/verification/explainer.py` que genera explicaciones comprensibles por estado.
- **Estado:** ✅ Completado. Explicaciones humanas precisas y contextualizadas para cada uno de los estados epistémicos del sistema.

### [x] T-406: Implementar máquina de estados de sincronización
- **Reqs:** REQ-MON-002, Principio XXIII
- **Entregable:** `modules/monitoring/state_machine.py` con 10 estados y transiciones válidas.
- **Estado:** ✅ Completado. Transiciones de ciclo de vida validadas con matriz canónica; rechazo estricto de transiciones ilegales (ej. `COMPLETED` a `PENDING`).

---

## Fase 5 — Adaptadores de Integración [COMPLETADA]

### [x] T-500: Implementar interfaces de puerto de integración
- **Reqs:** Principio XII
- **Entregable:** `modules/shared/ports.py` con interfaces abstractas: `SocialPlatformPort`.
- **Estado:** ✅ Completado. Puerto hexagonal formal con contratos tipificados para fetch de posts, comentarios, reacciones y webhooks.

### [x] T-501: Implementar adaptador de Facebook — cliente Graph API
- **Reqs:** REQ-FBI-001, REQ-FBI-002, REQ-FBI-003, REQ-FBI-004
- **Entregable:** `modules/facebook_adapter/client.py` con httpx async client para Graph API v26.0 / v20.0.
- **Estado:** ✅ Completado. Consulta de publicaciones, comentarios (con soporte robusto de privacidad para campo `from` opcional) y reacciones.

### [x] T-502: Implementar fakes/mocks de Graph API para tests
- **Reqs:** Principio XIX
- **Entregable:** `modules/facebook_adapter/fakes.py` con simulador determinista `FakeFacebookGraphClient`.
- **Estado:** ✅ Completado. Fakes exhaustivos cubriendo éxito, `from` vacío/privado, error 429 de cuota y 401 de expiración de token.

### [x] T-503: Implementar receptor de webhooks de Facebook
- **Reqs:** REQ-FBI-005
- **Entregable:** `modules/facebook_adapter/webhook.py` con endpoints `GET /api/v1/webhooks/facebook` y `POST /api/v1/webhooks/facebook`.
- **Estado:** ✅ Completado. Verificación de suscripción challenge y validación de firma criptográfica HMAC-SHA256 en `X-Hub-Signature-256`.

### [x] T-504: Implementar resiliencia del adaptador Facebook
- **Reqs:** REQ-FBI-006, Principio XIV
- **Entregable:** `modules/facebook_adapter/resilience.py` con patrón `CircuitBreaker`.
- **Estado:** ✅ Completado. Estados `CLOSED`, `OPEN`, `HALF_OPEN` y disparo de `CircuitBreakerOpenException` tras superar umbral de fallos consecutivos.

### [x] T-505: Implementar tareas Celery de sincronización Facebook
- **Reqs:** REQ-MON-001
- **Entregable:** `modules/facebook_adapter/tasks.py` con tareas Celery `sync_facebook_posts_task` y `sync_facebook_comments_task`.
- **Estado:** ✅ Completado. Tareas asincrónicas enrutadas a cola `sync_jobs`.

### [x] T-506: Implementar adaptador de TikTok — cliente Display API
- **Reqs:** REQ-TKI-001, REQ-TKI-002, REQ-TKI-003
- **Entregable:** `modules/tiktok_adapter/client.py` para consulta de videos institucionales y métricas agregadas.
- **Estado:** ✅ Completado. Extracción de vistas, likes, comentarios y compartidos; clasificación de comentarios individuales como `API_RESTRICTED`.

### [x] T-507: Implementar fakes/mocks de TikTok API para tests
- **Reqs:** Principio XIX
- **Entregable:** `modules/tiktok_adapter/fakes.py` con `FakeTikTokClient`.
- **Estado:** ✅ Completado. Simulador determinista para validación en suites de pruebas unitarias e integración.

### [x] T-508: Implementar tareas Celery de sincronización TikTok
- **Reqs:** REQ-MON-001
- **Entregable:** `modules/tiktok_adapter/tasks.py` con tarea `sync_tiktok_videos_task`.
- **Estado:** ✅ Completado. Tarea de sincronización asincrónica configurada y enrutada.

---

## Fase 6 — Reportes y Dashboard

### [x] T-600: Implementar generador de reportes Excel
- **Reqs:** REQ-RPT-001, Principio XXIV
- **Entregable:** `modules/reporting/generator.py` con generación de .xlsx usando openpyxl. Registro en `report_executions`.
- **Estado:** ✅ Completado. Reporte multi-hoja generado con hash SHA-256 inmutable, metadatos y disclaimer constitucional.

### [x] T-601: Implementar cálculo de indicadores con ficha técnica
- **Reqs:** REQ-RPT-003, Principio XXVI
- **Entregable:** `modules/reporting/indicators.py` con Tasa de Cobertura Observable y Tasa de Verificación Institucional.
- **Estado:** ✅ Completado. Fichas técnicas completas con numerador, denominador, exclusiones y notas metodológicas.

### [x] T-602: Implementar API de dashboard operativo
- **Reqs:** REQ-DSH-001, Principio XXV
- **Entregable:** `modules/dashboard/router.py` con `GET /api/v1/dashboard/operational`.
- **Estado:** ✅ Completado. Métricas agregadas de publicaciones, interacciones y sync jobs recientes.

### [x] T-603: Implementar API de dashboard ejecutivo
- **Reqs:** REQ-DSH-002, Principio XXV
- **Entregable:** `GET /api/v1/dashboard/executive` consumiendo `indicators.py`.
- **Estado:** ✅ Completado. Indicadores con fichas técnicas, distribución epistémica y disclaimer Principio XXVII.

### [x] T-604: Implementar frontend — página de dashboard
- **Reqs:** REQ-DSH-001, REQ-DSH-002
- **Entregable:** `frontend/src/pages/DashboardPage.tsx` con tabs operativo y ejecutivo, modal de ficha técnica y disclaimers.
- **Estado:** ✅ Completado. TypeScript verificado con build exitoso y componentes reactivos.

---

## Fase 7 — Frontend Completo

### T-700: Implementar página de login
- **Reqs:** REQ-IAM-001
- **Entregable:** `frontend/src/pages/Login.tsx` con formulario de autenticación.
- **DoD:** Login funcional, token almacenado de forma segura, redirección post-login.

### T-701: Implementar layout principal con navegación por rol
- **Reqs:** REQ-IAM-002
- **Entregable:** Layout con sidebar/nav que muestra opciones según el rol del usuario.
- **DoD:** Menú diferenciado por rol. Rutas protegidas en frontend (reforzado en backend).

### T-702: Implementar página de gestión de funcionarios
- **Reqs:** REQ-EMP-001 a 004
- **Entregable:** `frontend/src/pages/Employees.tsx` con tabla, filtros, importación, historial.
- **DoD:** CRUD visual. Importación Excel funcional. Historial de cambios visible.

### T-703: Implementar página de publicaciones y campañas
- **Reqs:** REQ-PUB-002, REQ-PUB-003
- **Entregable:** `frontend/src/pages/Publications.tsx` con listado, filtros por campaña/plataforma.
- **DoD:** Crear/listar publicaciones. Gestión de campañas. Asignación a campañas.

### T-704: Implementar página de interacciones y verificación
- **Reqs:** REQ-INT-001, REQ-VER-001 a 004
- **Entregable:** `frontend/src/pages/Interactions.tsx` y `Verification.tsx`.
- **DoD:** Listado con filtros por estado, plataforma, campaña. Flujo de verificación manual con evidencia. Explicabilidad visible.

### T-705: Implementar página de reportes
- **Reqs:** REQ-RPT-001
- **Entregable:** `frontend/src/pages/Reports.tsx` con formulario de generación y listado de reportes previos.
- **DoD:** Generar reporte con filtros. Descargar Excel. Ver historial de reportes.

### T-706: Implementar página de auditoría
- **Reqs:** REQ-AUD-002
- **Entregable:** `frontend/src/pages/Audit.tsx` con tabla de eventos de auditoría.
- **DoD:** Filtros funcionales. Solo visible para `AUDITOR` y `SUPER_ADMIN`.

### T-707: Implementar página de administración
- **Reqs:** REQ-ADM-001, REQ-ADM-002
- **Entregable:** `frontend/src/pages/Admin.tsx` con gestión de configuración, usuarios, plataformas.
- **DoD:** Edición de parámetros con auditoría. Gestión de conexiones a plataformas.

---

## Fase 8 — Notificaciones, Polish y Seguridad

### T-800: Implementar sistema de notificaciones internas
- **Reqs:** REQ-NOT-001, REQ-NOT-002
- **Entregable:** `modules/notifications/` con alertas en dashboard operativo.
- **DoD:** Alertas de token expirado, circuit breaker, DLQ visibles en UI.

### T-801: Implementar rate limiting en endpoints
- **Reqs:** Principio XVI
- **Entregable:** SlowAPI configurado en endpoints sensibles.
- **DoD:** Exceso de peticiones retorna `429`. Rate limits configurables.

### T-802: Implementar headers de seguridad HTTP
- **Reqs:** Constitución §Security.2
- **Entregable:** Middleware con CSP, X-Content-Type-Options, X-Frame-Options, HSTS.
- **DoD:** Headers presentes en todas las respuestas. Validación con herramienta de security headers.

### T-803: Implementar purga automática de payloads crudos
- **Reqs:** BR-INT-005 (180 días)
- **Entregable:** Tarea Celery Beat de purga diaria de `interaction_evidences` expiradas.
- **DoD:** Evidencias >180 días purgadas conservando hash. Test de verificación.

### T-804: Validación de seguridad completa (OWASP)
- **Reqs:** Principio XVI
- **Entregable:** Suite de tests de seguridad: inyección SQL, XSS, CSRF, escalación de privilegios.
- **DoD:** 0 vulnerabilidades CRITICAL/HIGH en escaneo DAST/SAST.

---

## Fase 9 — Despliegue y Documentación

### T-900: Configurar Docker Compose para producción
- **Reqs:** ADR-005
- **Entregable:** `docker-compose.prod.yml` con configuraciones de producción.
- **DoD:** Build de todas las imágenes exitoso. Despliegue en Coolify funcional.

### T-901: Configurar backup automático de PostgreSQL
- **Reqs:** ADR-006, Principio XXXIII
- **Entregable:** Tarea Celery Beat de backup diario + cifrado + almacenamiento.
- **DoD:** Backup ejecuta. Restauración verificada en entorno de test.

### T-902: Escribir quickstart.md
- **Reqs:** Principio XXXVIII
- **Entregable:** `docs/quickstart.md` con instrucciones completas de setup local.
- **DoD:** Desarrollador nuevo puede levantar el entorno completo siguiendo el quickstart.

### T-903: Escribir ADRs formales
- **Reqs:** Principio XXXIX
- **Entregable:** `docs/adr/ADR-001.md` a `ADR-006.md` con Context, Decision, Alternatives, Consequences, Status.
- **DoD:** 6 ADRs completos y aprobados.

### T-904: Generar y publicar contrato OpenAPI
- **Reqs:** Principio XX
- **Entregable:** `contracts/openapi.yaml` auto-generado desde FastAPI.
- **DoD:** Contrato válido y documentación interactiva accesible.

### T-905: Ejecutar verificación final de Constitution Check
- **Reqs:** Constitución §Governance.4
- **Entregable:** Tabla de verificación en `docs/constitution-check.md` con PASS/FAIL por principio.
- **DoD:** Todos los principios `PASS`. Sin excepciones no documentadas.

---

## Resumen de Fases

| Fase | Descripción | Tareas | Reqs Cubiertos |
| :--- | :--- | :--- | :--- |
| **0** | Fundación | T-000 a T-008 | Infraestructura base, CI, tipos |
| **1** | Core IAM + Auditoría | T-100 a T-105 | REQ-IAM-*, REQ-AUD-* |
| **2** | Empleados y Organización | T-200 a T-204 | REQ-EMP-* |
| **3** | Social y Publicaciones | T-300 a T-304 | REQ-SAB-*, REQ-PUB-* |
| **4** | Interacciones y Verificación | T-400 a T-406 | REQ-INT-*, REQ-VER-*, REQ-MON-002 |
| **5** | Adaptadores de Integración | T-500 a T-508 | REQ-FBI-*, REQ-TKI-*, REQ-MON-001 |
| **6** | Reportes y Dashboard | T-600 a T-604 | REQ-RPT-*, REQ-DSH-* |
| **7** | Frontend Completo | T-700 a T-707 | UI para todos los módulos |
| **8** | Notificaciones y Seguridad | T-800 a T-804 | REQ-NOT-*, Seguridad OWASP |
| **9** | Despliegue y Documentación | T-900 a T-905 | ADRs, backups, quickstart, OpenAPI |

**Total: 10 fases, 53 tareas, cubriendo los 42 requerimientos y 79 reglas de negocio del spec.md.**
