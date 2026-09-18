# ADR-002: Cifrado en Reposo de Datos PII y Blind Indexing

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Seguridad y Arquitectura GAMEA Social Monitor
- **Contexto Regulatorio:** Principio XI (Protección Criptográfica de PII y Blind Indexing Obligatorio)

---

## 1. Contexto y Planteamiento del Problema

El sistema almacena datos de identificación personal (PII - Personally Identifiable Information) de los servidores públicos del GAMEA, incluyendo:
- Cédula de Identidad (CI) y complemento.
- Nombres, apellidos y cargos institucionales.
- Correos electrónicos y números telefónicos.
- Identificadores y handles de cuentas en redes sociales.

La normativa boliviana de protección de datos, la seguridad institucional y los principios constitucionales del sistema exigen que ningún dato de identidad personal resida en texto plano en la base de datos o en respaldos en disco. Al mismo tiempo, el sistema debe permitir búsquedas eficientes por Cédula de Identidad o correo electrónico para procesos de autenticación, conciliación de nómina y verificación de interacciones sin desencriptar masivamente la base de datos ni exponer patrones deterministas de cifrado (ECB).

---

## 2. Decisión

Se adopta un esquema criptográfico híbrido de **Cifrado Simétrico Reversible (Fernet AES-128-CBC con HMAC-SHA256)** combinado con un **Índice Ciego Determinista (Blind Index con HMAC-SHA256)**:

1. **Cifrado en Reposo (Fernet AES):**
   - Todos los campos sensibles de texto (CI, correo, nombre completo, teléfono) se almacenan en columnas dedicadas (`encrypted_ci`, `encrypted_email`, etc.) cifradas con una clave simétrica robusta derivada de `ENCRYPTION_KEY`.
   - Fernet genera vectores de inicialización (IV) aleatorios por operación, garantizando que el mismo valor en texto plano genere diferentes textos cifrados en cada guardado (probabilísticamente indistinguible).

2. **Blind Indexing (Índice Ciego):**
   - Para búsquedas exactas (`WHERE ci = ?` o `WHERE email = ?`), se calcula un hash criptográfico mediante **HMAC-SHA256** utilizando una sal secreta independiente del servidor (`BLIND_INDEX_SALT`).
   - El resultado se almacena en columnas indexadas tipo `VARCHAR(64)` (`ci_hash`, `email_hash`).
   - Las consultas de búsqueda computan `HMAC(input_ci, BLIND_INDEX_SALT)` y realizan la consulta indexada `O(1)` por igualdad exacta contra `ci_hash`.

3. **Separación de Claves:**
   - `SECRET_KEY`, `ENCRYPTION_KEY` y `BLIND_INDEX_SALT` son secretos distintos inyectados vía variables de entorno seguras, nunca registrados en el código fuente ni expuestos en logs.

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **Protección Ante Fugas de Base de Datos:** Un volcado o copia no autorizada de la base de datos expone únicamente texto cifrado con IV aleatorio e índices ciegos no invertibles.
- **Rendimiento de Búsqueda Óptimo:** Las operaciones de filtrado por clave única o existencia de funcionario operan sobre índices estándar de PostgreSQL con tiempo de respuesta constante (`O(1)` / `O(log N)`).
- **Cumplimiento Normativo Estricto:** Cumple al 100% con los principios de privacidad por diseño y minimización de exposición de datos.

### Consecuencias Negativas y Mitigación:
- **Imposibilidad de Búsqueda por Subcadenas en Campos Cifrados:** No es posible realizar `LIKE '%algo%'` directamente en SQL sobre datos cifrados con Fernet. Mitigado mediante la creación de tokens/trigramas ciegos específicos si se requiriese búsqueda parcial, o descifrado en memoria para conjuntos acotados en vistas administrativas con roles autorizados.
- **Gestión de Ciclo de Vida de Claves:** Requiere procedimientos de rotación de claves documentados para re-cifrado de datos en caso de compromiso de clave.
