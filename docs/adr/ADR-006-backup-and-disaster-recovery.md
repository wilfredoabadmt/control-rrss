# ADR-006: Política de Respaldos Automatizados, Cadena de Custodia SHA-256 y Recuperación ante Desastres

- **Estado:** Aceptado
- **Fecha:** 2026-09-17
- **Autores:** Equipo de Infraestructura y Seguridad GAMEA Social Monitor
- **Contexto Regulatorio:** Principio X (Auditoría Inmutable), Principio XXIV (Integridad Criptográfica de Reportes y Datos), Principio XXX (Continuidad Operativa)

---

## 1. Contexto y Planteamiento del Problema

La base de datos relacional contiene registros sensibles de servidores públicos, bitácoras de auditoría forense inmutables, parametrizaciones de redes sociales e histórico de interacciones. La pérdida o corrupción de estos datos (por fallas de hardware, errores humanos o incidentes de seguridad) provocaría un cese inaceptable de operaciones y el quebrantamiento de la cadena de custodia probatoria.

Se requiere:
- Respaldos periódicos automatizados sin intervención manual.
- Verificación criptográfica obligatoria para detectar cualquier intento de manipulación o alteración silenciosa (bit rot / tampering).
- Registro inmutable de cada evento de respaldo en la bitácora de auditoría.
- Política clara de retención y procedimiento probado de restauración ante contingencias.

---

## 2. Decisión

Se adopta un **Esquema de Respaldo Diario Programado mediante Celery Beat y pg_dump** con **Cálculo de Hash SHA-256 de Custodia** y **Registro Inmutable en Auditoría**:

1. **Mecanismo de Respaldo (`DatabaseBackupService`):**
   - Se implementa el servicio en `backend/modules/shared/backup.py` invocable tanto por Celery Beat como por interfaz administrativa o CLI.
   - Genera volcados comprimidos utilizando `pg_dump` con formato personalizado/SQL con compresión (`.sql.gz` o `.dump`).
   - Nombre de archivo determinista: `gamea_backup_YYYYMMDD_HHMMSS.sql.gz`.

2. **Cómputo Criptográfico de Integridad (SHA-256):**
   - Inmediatamente tras la generación física del archivo, el servicio calcula el digest criptográfico SHA-256 del contenido binario del respaldo:
     $$\text{Digest} = \text{SHA-256}(\text{backup\_bytes})$$
   - El hash resultante se almacena en el registro de auditoría (`AuditLog`) junto con el tamaño en bytes, ruta del archivo y estado de finalización.

3. **Inyección en Bitácora de Auditoría Inmutable:**
   - La acción `BACKUP_CREATED` se inserta en la tabla append-only `audit_logs` con `user_id = SYSTEM` (o el usuario administrador ejecutor), garantizando no repudio de la fecha, hora, tamaño y hash del snapshot.

4. **Política de Retención y Rotación:**
   - Se mantiene una política de rotación automática:
     - 7 respaldos diarios locales (en volumen persistente `backups/`).
     - 4 respaldos semanales transferidos a almacenamiento seguro externo (NAS municipal / S3 bucket institucional).
     - 12 respaldos mensuales para archivo histórico y requerimientos de auditoría estatal.
   - La rotación elimina archivos locales antiguos garantizando que al menos los últimos $N$ días estén permanentemente disponibles en caliente.

5. **Procedimiento de Restauración y Verificación de Integridad:**
   - Previo a cualquier restauración, el operador debe verificar el hash del archivo contra la bitácora de auditoría:
     ```bash
     sha256sum backups/gamea_backup_20260917_020000.sql.gz
     ```
   - Solo si el hash coincide exactamente con el registrado en `audit_logs`, se procede a la restauración:
     ```bash
     gunzip -c backups/gamea_backup_20260917_020000.sql.gz | psql -U gamea_user -d gamea_monitor
     ```

---

## 3. Consecuencias y Compensaciones

### Consecuencias Positivas:
- **Protección Criptográfica contra Alteraciones:** Imposible modificar registros pasados en el respaldo sin que la verificación de hash SHA-256 falle inmediatamente.
- **RTO y RPO Acotados:** Tiempo de recuperación objetivo (RTO) inferior a 30 minutos y punto objetivo de recuperación (RPO) máximo de 24 horas (configurable a menor intervalo si el volumen lo amerita).
- **Cumplimiento de Estándares de Seguridad de la Información:** Cumple con las directrices de seguridad física y lógica de datos de la administración pública.

### Consecuencias Negativas y Mitigación:
- **Espacio en Disco:** Requiere supervisión de capacidad en el volumen de almacenamiento. Mitigado mediante la política de retención automática y alertas tempranas en caso de superar el 85% de capacidad de disco.
