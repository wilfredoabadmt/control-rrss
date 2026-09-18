# ADR-003: Pistas de Auditoría Inmutables (Append-Only Audit Trail)

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Seguridad y Arquitectura GAMEA Social Monitor
- **Contexto Regulatorio:** Principio X (Pistas de Auditoría Inmutables Obligatorias)

---

## 1. Contexto y Planteamiento del Problema

En un sistema institucional que gestiona monitoreo de actividades en redes sociales y cumplimiento de funcionarios públicos, la integridad y no repudio de los registros de eventos es mandatorio. Cualquier intento de:
- Modificar retroactivamente registros de auditoría.
- Eliminar eventos de acceso, modificación o ingesta.
- Alterar marcas de tiempo o identidades de los actores.

Constituye una violación legal y técnica inaceptable. Se requiere una solución que garantice que una vez que un evento es registrado en la bitácora de auditoría, sea física y lógicamente imposible modificarlo o borrarlo, incluso por usuarios con privilegios de superadministrador en la aplicación.

---

## 2. Decisión

Se implementa una **Bitácora de Auditoría Estrictamente Append-Only** respaldada por defensas en profundidad tanto a nivel de aplicación (ORM) como a nivel de base de datos relacional (PostgreSQL):

1. **Estructura del Registro de Auditoría (`audit_logs`):**
   - `id`: UUIDv4 inalterable generado en el backend.
   - `user_id`: UUID del usuario autenticado responsable de la acción (o `SYSTEM` para tareas programadas/Celery).
   - `action`: Verbo semántico de la operación (`AUTH_LOGIN`, `EMPLOYEE_CREATE`, `VERIFICATION_EXECUTE`, `PAYROLL_SYNC`, `BACKUP_CREATED`, etc.).
   - `resource_type`: Entidad afectada (`employee`, `publication`, `interaction`, `verification`, `backup`, etc.).
   - `resource_id`: Identificador del recurso afectado.
   - `payload`: Snapshot en formato JSON con los datos anteriores/posteriores relevantes para trazabilidad completa.
   - `ip_address`: Dirección IP del cliente originador de la petición HTTP.
   - `user_agent`: Cabecera del cliente navegador/agente.
   - `timestamp`: Marca temporal UTC generada por el servidor al momento de la inserción.

2. **Garantías de Inmutabilidad en Capa ORM:**
   - Event listeners de SQLAlchemy (`before_update`, `before_delete`) interceptan cualquier operación de actualización o borrado sobre la entidad `AuditLog` y lanzan una excepción fatal `AuditLogImmutableException`, abortando la transacción.

3. **Garantías de Inmutabilidad en Capa Base de Datos:**
   - Creación de disparadores (triggers) en PostgreSQL que bloquean de raíz cualquier sentencia `UPDATE` o `DELETE` sobre la tabla `audit_logs`:
     ```sql
     CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
     RETURNS TRIGGER AS $$
     BEGIN
       RAISE EXCEPTION 'AuditLog records are strictly immutable and cannot be updated or deleted.';
     END;
     $$ LANGUAGE plpgsql;

     CREATE TRIGGER trg_audit_logs_immutable
     BEFORE UPDATE OR DELETE ON audit_logs
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
     ```
   - El usuario de base de datos utilizado por la aplicación en producción posee privilegios exclusivos de `INSERT` y `SELECT` sobre dicha tabla, revocando `UPDATE`, `DELETE` y `TRUNCATE`.

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **No Repudio Total:** Evidencia pericial y forense inalterable ante auditorías internas del GAMEA y la Contraloría General del Estado.
- **Trazabilidad Completa:** Toda acción de operadores, verificadores y administradores queda registrada con marca de tiempo UTC y contexto de red.
- **Resistencia al Ataque Interno:** Incluso si credenciales administrativas de la aplicación son comprometidas, el atacante no puede borrar su rastro en la base de datos.

### Consecuencias Negativas y Mitigación:
- **Crecimiento Continuo de Almacenamiento:** Al ser una tabla de solo inserción, el tamaño en disco crece proporcionalmente al uso del sistema. Mitigado mediante particionamiento por rango temporal (anual/mensual) en PostgreSQL y políticas de respaldo de largo plazo en almacenamiento frío con resúmenes SHA-256 de custodia.
