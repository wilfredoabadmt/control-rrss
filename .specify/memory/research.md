# GAMEA Social Monitor — API Research Findings

<!--
  Documento de Investigación Técnica sobre APIs Externas
  Proyecto: GAMEA Social Monitor
  Fecha de Investigación: 2026-09-17
  Versión: 1.0.0
  Estado: ACTIVO
  Autores: Equipo de Arquitectura
-->

> [!NOTE]
> Este documento registra los hallazgos de investigación sobre las APIs oficiales de Meta (Facebook) y TikTok, verificados a septiembre de 2026. Sirve como respaldo documental para las decisiones de alcance funcional tomadas en `spec.md` y como referencia para futuras actualizaciones de los adaptadores de integración.

---

## 1. Meta Platform — Facebook Graph API

### 1.1 Versión Actual y Ciclo de Vida
* **Versión vigente al momento de investigación:** v26.0 (la más reciente disponible a septiembre 2026).
* **v20.0:** Deprecada y eliminada el 24 de septiembre de 2026.
* **v21.0:** Programada para deprecación el 21 de enero de 2027.
* **Política de soporte:** Meta mantiene cada versión de Graph API por al menos 2 años antes de deprecarla.
* **Recomendación:** El adaptador de Facebook DEBE apuntar a v26.0 y registrar la versión en cada transacción conforme al Principio XIII constitucional.

### 1.2 Permisos y Tokens Requeridos

| Permiso | Propósito | Requisito |
| :--- | :--- | :--- |
| `pages_read_engagement` | Lectura de publicaciones, comentarios y métricas de engagement de la Página | App Review + Business Verification |
| `pages_read_user_content` | Lectura de contenido generado por usuarios en la Página | App Review |
| `pages_manage_metadata` | Gestión de suscripciones a Webhooks de Página | App Review |
| `pages_manage_engagement` | Moderación y respuesta a comentarios (si se requiere) | App Review |
| `pages_show_list` | Listar páginas administradas por el usuario | App Review |

* **Tipo de token requerido:** Page Access Token (emitido por un administrador de la Página del GAMEA).
* **Page Tasks necesarios:** El usuario que autoriza la app debe tener al menos los tasks `MODERATE` o `CREATE_CONTENT` asignados en la Página.

### 1.3 Capacidades Verificadas

#### 1.3.1 Lectura de Publicaciones de Página — `VERIFIED`
* **Endpoint:** `GET /{page-id}/published_posts`
* **Datos disponibles:** ID del post, mensaje, tipo, fecha de creación, enlaces, medios adjuntos.
* **Paginación:** Cursor-based pagination.
* **Restricción:** Solo publicaciones de la Página administrada; no publicaciones de terceros.

#### 1.3.2 Lectura de Comentarios en Publicaciones — `VERIFIED` (con restricciones)
* **Endpoint:** `GET /{post-id}/comments`
* **Datos disponibles:** ID del comentario, mensaje, fecha de creación.
* **Campo `from` (identidad del autor):**
  * Para administradores/moderadores de la Página: frecuentemente retorna `id` y `name` del autor.
  * Para apps de terceros sin relación directa: el campo `from` **frecuentemente retorna vacío o datos limitados**.
  * El `id` retornado (cuando está disponible) es un **App-Scoped User ID (ASID)** o **Page-Scoped ID (PSID)**, no el ID global de Facebook del usuario.
* **Implicación para GAMEA Social Monitor:** La verificación automática de "quién comentó" solo funcionará cuando la API retorne el campo `from` con el ASID/PSID. En los demás casos, el registro MUST marcarse como `NOT_OBSERVABLE` o derivarse a verificación manual asistida.

#### 1.3.3 Conteo Agregado de Reacciones — `VERIFIED`
* **Endpoint:** `GET /{post-id}/reactions?summary=true`
* **Datos disponibles:** Conteo total y desglose por tipo de reacción (Like, Love, Haha, Wow, Sad, Angry).
* **Restricción:** Solo conteos numéricos. **No se proveen identidades individuales.**

#### 1.3.4 Conteo Agregado de Shares — `VERIFIED` (solo conteo)
* **Endpoint:** Campo `shares.count` en el objeto del Post.
* **Datos disponibles:** Número total de veces que la publicación ha sido compartida.
* **Restricción:** Solo el conteo numérico. **No se proveen identidades de quién compartió.**

#### 1.3.5 Page Insights — `VERIFIED`
* **Endpoint:** `GET /{post-id}/insights`
* **Datos disponibles:** Métricas de engagement, alcance, impresiones, clics, en formato agregado y anónimo.
* **Útil para:** Indicadores de rendimiento de publicaciones institucionales a nivel macro (sin identificación individual).

#### 1.3.6 Webhooks de Página — `VERIFIED`
* **Suscripción:** `POST /{page-id}/subscribed_apps` con campo `subscribed_fields=feed`.
* **Eventos recibidos:** Notificaciones en tiempo real de nuevos posts, comentarios, ediciones y eliminaciones en el feed de la Página.
* **Requisitos:**
  * Callback URL en HTTPS.
  * Respuesta `200 OK` inmediata para confirmar recepción.
  * Manejo de verificación inicial (`hub.challenge`).
  * Idempotencia en el procesamiento (Meta puede reenviar el mismo evento).
* **Dato incluido en el webhook:** El payload del webhook incluye información del cambio (ej. nuevo comentario), pero la identidad del autor sigue sujeta a las mismas restricciones que el polling.

### 1.4 Capacidades Restringidas

#### 1.4.1 Lista de Usuarios que Dieron Like/Reacción — `API_RESTRICTED`
* **Estado:** Meta **eliminó definitivamente** la capacidad de listar las identidades (nombres o IDs) de usuarios individuales que reaccionaron a publicaciones de Página.
* **Historial:** La funcionalidad existió en versiones anteriores (pre-v8.0) pero fue removida por razones de privacidad.
* **Impacto:** El sistema GAMEA Social Monitor **MUST NOT** prometer verificación individual de Likes/Reacciones por funcionario vía API.
* **Dato disponible:** Solo conteos numéricos agregados.

#### 1.4.2 Lista de Usuarios que Compartieron — `API_RESTRICTED`
* **Estado:** Meta **no expone** las identidades de usuarios que comparten publicaciones en sus perfiles personales.
* **Impacto:** El sistema GAMEA Social Monitor **MUST NOT** prometer verificación individual de Shares por funcionario vía API.
* **Dato disponible:** Solo conteo numérico total.

### 1.5 Límites de Cuota (Rate Limits)
* Meta utiliza encabezados `X-Business-Use-Case-Usage` y `X-App-Usage` para indicar consumo de cuota.
* Se recomienda reducir frecuencia de polling al alcanzar el 80% de la cuota asignada.
* Código HTTP `429 Too Many Requests` indica exceso de cuota; el adaptador MUST implementar backoff.

---

## 2. TikTok — Developer APIs

### 2.1 Productos de API Disponibles
TikTok ofrece múltiples productos de API a través de dos portales:
* **TikTok for Developers** (developers.tiktok.com): Content Posting API, Display API, Login Kit.
* **TikTok Business API** (business-api.tiktok.com): Ads Manager, Creator Marketplace, Lead Generation.

### 2.2 Capacidades Verificadas

#### 2.2.1 Content Posting API — `VERIFIED` (no aplica directamente)
* **Propósito:** Publicación programática de videos y fotos.
* **Modos:** Direct Post (publicación inmediata) e Upload to Inbox (borrador).
* **Scopes:** `video.publish`.
* **Relevancia para GAMEA Social Monitor:** Baja. El GAMEA publica contenido manualmente. Sin embargo, podría utilizarse en el futuro para automatizar publicaciones institucionales.

#### 2.2.2 Display API — `VERIFIED` (limitada al usuario autenticado)
* **Propósito:** Obtener perfil y lista de videos del usuario que autorizó la app.
* **Scopes:** `user.info.basic`, `video.list`.
* **Datos disponibles:** Información del perfil, lista de videos propios con métricas básicas.
* **Restricción:** Solo funciona para el usuario autenticado (la cuenta institucional de TikTok del GAMEA). NO permite leer datos de otros usuarios.
* **Relevancia para GAMEA Social Monitor:** Permite obtener la lista de videos publicados por la cuenta institucional del GAMEA y sus métricas agregadas (vistas, likes totales, comentarios totales, shares totales).

#### 2.2.3 Login Kit — `VERIFIED`
* **Propósito:** Autenticación OAuth 2.0 de usuarios de TikTok.
* **Relevancia para GAMEA Social Monitor:** Potencialmente útil si se requiriera que los funcionarios vinculen sus cuentas de TikTok mediante login directo (concepto a evaluar).

### 2.3 Capacidades Restringidas

#### 2.3.1 Lectura de Comentarios de Videos — `API_RESTRICTED`
* **Estado:** TikTok **NO provee** una API pública oficial para que aplicaciones comerciales o institucionales lean los comentarios de videos públicos.
* **Research API:** Existe una API de investigación que sí permite acceder a comentarios, pero está **estrictamente limitada a instituciones académicas** para investigación no comercial. El GAMEA no califica.
* **Impacto:** La verificación automática de "quién comentó" en TikTok **NO es posible por API oficial**. El sistema MUST registrar este estado como `API_RESTRICTED`.

#### 2.3.2 Identidad de Usuarios que Dieron Like — `API_RESTRICTED`
* **Estado:** No disponible por API oficial para uso institucional.
* **Impacto:** Igual que Facebook; solo conteos agregados disponibles (vía Display API para videos propios).

#### 2.3.3 Identidad de Usuarios que Compartieron — `API_RESTRICTED`
* **Estado:** No disponible por API oficial.
* **Impacto:** Solo conteos agregados disponibles.

### 2.4 Webhooks de TikTok — `RESEARCH_REQUIRED`
* TikTok soporta webhooks para eventos comerciales (actualizaciones de anuncios, leads, pedidos).
* **No confirmado:** Si los webhooks de TikTok permiten recibir notificaciones de nuevos comentarios en videos de contenido orgánico de cuentas institucionales.
* **Formato:** HTTPS POST con payload JSON; requiere respuesta `200 OK` inmediata.
* **Reintentos:** TikTok reintenta durante hasta 72 horas si no recibe confirmación.

### 2.5 Requisitos de App Audit
* Para que el contenido publicado sea público (no privado), la app del GAMEA debe superar un **App Audit completo** en el Developer Portal de TikTok.
* El proceso incluye revisión de políticas, permisos solicitados y caso de uso.

---

## 3. Matriz Consolidada de Capacidades

| Capacidad Funcional del GAMEA | Facebook | TikTok | Estrategia Recomendada |
| :--- | :--- | :--- | :--- |
| Listar publicaciones institucionales | ✅ API Polling + Webhooks | ✅ Display API (videos propios) | Automatizado en ambas plataformas |
| Obtener texto/contenido de publicación | ✅ Graph API | ✅ Display API | Automatizado |
| Obtener comentarios de publicación | ✅ Graph API (con restricciones de identidad) | 🚫 No disponible por API | FB: Automatizado parcial; TK: Manual |
| Identificar autor del comentario | ⚠️ Parcial (campo `from` limitado) | 🚫 No disponible | FB: Cuando API lo permita; TK: Manual |
| Verificar Like/Reacción individual | 🚫 Solo conteos agregados | 🚫 Solo conteos agregados | Ambas: `API_RESTRICTED` |
| Verificar Share individual | 🚫 Solo conteos agregados | 🚫 Solo conteos agregados | Ambas: `API_RESTRICTED` |
| Métricas agregadas de engagement | ✅ Insights + Reactions | ✅ Display API (básicas) | Automatizado en ambas |
| Notificaciones en tiempo real | ✅ Webhooks de Página | ⚠️ `RESEARCH_REQUIRED` | FB: Webhooks; TK: Polling o manual |

---

## 4. Implicaciones Arquitectónicas

### 4.1 Modelo de Verificación Diferenciada
Dado el panorama de APIs, el sistema MUST implementar tres niveles de verificación:

1. **Verificación Automática Completa:** Aplicable solo a comentarios en Facebook cuando la API retorne el campo `from` con un identificador cruzable con una cuenta vinculada de un funcionario. Estado resultante: `CONFIRMED` o `NOT_FOUND`.

2. **Verificación Automática Parcial:** Aplicable a métricas agregadas (conteos de likes, shares, comentarios) en ambas plataformas. Permite reportar "la publicación recibió N comentarios, N reacciones, N compartidos" sin identificar individualmente a cada funcionario. Estado resultante: `OBSERVED` (dato agregado).

3. **Verificación Manual Asistida:** Flujo donde un operador del GAMEA revisa visualmente la interacción en la plataforma y registra la evidencia en el sistema. Aplicable a:
   - Comentarios en TikTok (siempre)
   - Comentarios en Facebook cuando la API no retorne identidad del autor
   - Likes y Shares en ambas plataformas (siempre, si se requiere verificación individual)
   Estado resultante: `DECLARED` (declarado por operador con evidencia).

### 4.2 Diseño de Adaptadores
Conforme al Principio XII constitucional (Ports & Adapters):
* El **Puerto de Integración** debe definir una interfaz genérica que soporte las tres estrategias de verificación.
* El **Adaptador de Facebook** implementará verificación automática para comentarios + métricas agregadas.
* El **Adaptador de TikTok** implementará métricas agregadas de videos propios + interfaz para registro manual.
* Ambos adaptadores MUST manejar independientemente sus rate limits, tokens y circuit breakers.

### 4.3 Expectativas Realistas para Stakeholders
El documento `spec.md` MUST comunicar con absoluta claridad que:
* La **automatización total** de la verificación de interacciones individuales (quién dio like, quién compartió) **no es técnicamente posible** con las APIs oficiales actuales de Meta ni TikTok.
* La plataforma automatiza significativamente la **recolección**, **organización**, **consolidación** y **reporte** de datos, pero la **verificación individual** de ciertas interacciones seguirá requiriendo un componente de trabajo manual asistido por el sistema.
* El valor principal del sistema radica en eliminar la dependencia de Excel, centralizar la información, garantizar consistencia y trazabilidad, y proporcionar dashboards y reportes automatizados.

---

## 5. Fuentes y Fechas de Verificación

| Fuente | URL | Fecha de Consulta |
| :--- | :--- | :--- |
| Meta for Developers — Graph API Reference | https://developers.facebook.com/docs/graph-api/reference/ | 2026-09-17 |
| Meta — Graph API Changelog | https://developers.facebook.com/docs/graph-api/changelog/ | 2026-09-17 |
| Meta — Platform Versioning | https://developers.facebook.com/docs/graph-api/overview/versioning/ | 2026-09-17 |
| Meta — Webhooks for Pages | https://developers.facebook.com/docs/graph-api/webhooks/ | 2026-09-17 |
| TikTok for Developers Portal | https://developers.tiktok.com | 2026-09-17 |
| TikTok — Content Posting API | https://developers.tiktok.com/doc/content-posting-api/ | 2026-09-17 |
| TikTok — Display API | https://developers.tiktok.com/doc/display-api/ | 2026-09-17 |
| TikTok — Research API | https://developers.tiktok.com/products/research-api/ | 2026-09-17 |

---

## 6. Próxima Revisión Recomendada

Los hallazgos de este documento SHOULD revisarse trimestralmente o inmediatamente ante:
* Lanzamiento de una nueva versión major de Graph API.
* Anuncio de nuevas APIs de TikTok para contenido orgánico.
* Cambios en políticas de privacidad de Meta o TikTok que afecten los permisos investigados.
* Notificación de deprecación de endpoints utilizados.
