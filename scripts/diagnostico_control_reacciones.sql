-- ============================================================================
-- DIAGNÓSTICO COMPLETO: CONTROL DE REACCIONES - GAMEA SOCIAL MONITOR
-- Ejecutar en PostgreSQL (psql, pgAdmin, DBeaver, etc.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ESTADO DEL CONECTOR FACEBOOK (¿Está configurado y operativo?)
-- ---------------------------------------------------------------------------
SELECT 
    platform_name,
    target_account_id,
    display_name,
    last_status,
    status_message,
    is_active,
    has_token,
    has_secret,
    last_sync_at,
    api_version,
    extraction_mode
FROM social_connector_configs 
WHERE platform_name = 'FACEBOOK';

-- ---------------------------------------------------------------------------
-- 2. ÚLTIMA SINCRONIZACIÓN (¿Se ejecutó? ¿Cuántos datos trajo?)
-- ---------------------------------------------------------------------------
SELECT 
    id,
    platform_id,
    job_type,
    status,
    records_processed,
    records_created,
    matched_interactions,
    error_details,
    started_at,
    completed_at,
    EXTRACT(EPOCH FROM (completed_at - started_at)) AS duracion_segundos
FROM external_sync_jobs 
ORDER BY created_at DESC 
LIMIT 5;

-- ---------------------------------------------------------------------------
-- 3. PUBLICACIONES EN MONITOREO (¿Hay posts vinculados?)
-- ---------------------------------------------------------------------------
SELECT 
    p.id,
    p.external_post_id,
    p.post_url,
    p.published_at,
    p.content_text,
    p.is_monitored,
    p.media_type,
    sp.name AS platform_name
FROM publications p
LEFT JOIN social_platforms sp ON sp.id = p.platform_id
WHERE p.is_monitored = true
ORDER BY p.published_at DESC;

-- ---------------------------------------------------------------------------
-- 4. AUDIENCIA CON CUENTAS VINCULADAS (¿Funcionarios tienen @facebook?)
-- ---------------------------------------------------------------------------
SELECT 
    e.employee_id AS ci,
    e.first_name,
    e.last_name,
    e.status AS empleado_status,
    ou.name AS unidad_organizacional,
    pos.title AS cargo,
    sa.current_username AS facebook_handle,
    sa.profile_url AS facebook_profile,
    sa.binding_status AS cuenta_status,
    sa.verified_at AS cuenta_verificada_en
FROM employees e
LEFT JOIN organizational_units ou ON ou.id = e.organizational_unit_id
LEFT JOIN positions pos ON pos.id = e.position_id
LEFT JOIN social_accounts sa ON sa.employee_id = e.employee_id 
    AND sa.binding_status = 'ACTIVE'
LEFT JOIN social_platforms sp ON sp.id = sa.platform_id AND sp.name = 'FACEBOOK'
WHERE e.status = 'ACTIVE'
ORDER BY e.last_name, e.first_name;

-- ---------------------------------------------------------------------------
-- 5. INTERACCIONES CRUDAS POR PUBLICACIÓN (¿Meta API trajo datos?)
-- Reemplaza <PUBLICATION_UUID> con el ID de la publicación que querés auditar
-- ---------------------------------------------------------------------------
SELECT 
    i.id,
    i.interaction_type,
    i.reaction_type,
    i.external_interaction_id,
    i.external_author_id,
    i.external_author_name,
    i.content_text,
    i.external_created_at,
    i.captured_at,
    i.capture_method,
    i.data_origin_type,
    i.raw_payload_ref,
    v.verification_status,
    v.verification_method,
    v.employee_id AS empleado_verificado,
    v.explanation AS justificacion_verificacion
FROM interactions i
LEFT JOIN verifications v ON v.interaction_id = i.id
WHERE i.publication_id = '<PUBLICATION_UUID>'
ORDER BY i.captured_at DESC;

-- ---------------------------------------------------------------------------
-- 6. RESUMEN: INTERACCIONES POR TIPO PARA UNA PUBLICACIÓN
-- ---------------------------------------------------------------------------
SELECT 
    i.interaction_type,
    i.reaction_type,
    COUNT(*) AS cantidad
FROM interactions i
WHERE i.publication_id = '<PUBLICATION_UUID>'
GROUP BY i.interaction_type, i.reaction_type
ORDER BY cantidad DESC;

-- ---------------------------------------------------------------------------
-- 7. VERIFICACIONES AUTOMÁTICAS VS MANUALES
-- ---------------------------------------------------------------------------
SELECT 
    v.verification_status,
    v.verification_method,
    COUNT(*) AS cantidad,
    COUNT(DISTINCT v.employee_id) AS funcionarios_unicos
FROM verifications v
JOIN interactions i ON i.id = v.interaction_id
WHERE i.publication_id = '<PUBLICATION_UUID>'
GROUP BY v.verification_status, v.verification_method
ORDER BY cantidad DESC;

-- ---------------------------------------------------------------------------
-- 8. FUNCIONARIOS SIN CUENTA FACEBOOK VINCULADA (Pendientes de auditoría)
-- ---------------------------------------------------------------------------
SELECT 
    e.employee_id AS ci,
    e.first_name,
    e.last_name,
    ou.name AS unidad,
    pos.title AS cargo
FROM employees e
LEFT JOIN organizational_units ou ON ou.id = e.organizational_unit_id
LEFT JOIN positions pos ON pos.id = e.position_id
LEFT JOIN social_accounts sa ON sa.employee_id = e.employee_id 
    AND sa.binding_status = 'ACTIVE'
LEFT JOIN social_platforms sp ON sp.id = sa.platform_id AND sp.name = 'FACEBOOK'
WHERE e.status = 'ACTIVE'
    AND sa.id IS NULL
ORDER BY ou.name, e.last_name, e.first_name;

-- ---------------------------------------------------------------------------
-- 9. EVIDENCIAS FORENSES (¿Hay payloads crudos guardados?)
-- ---------------------------------------------------------------------------
SELECT 
    ie.id,
    ie.interaction_id,
    ie.evidence_type,
    ie.content_hash,
    LENGTH(ie.content) AS payload_length,
    ie.created_at,
    ie.created_by_user_id
FROM interaction_evidences ie
JOIN interactions i ON i.id = ie.interaction_id
WHERE i.publication_id = '<PUBLICATION_UUID>'
ORDER BY ie.created_at DESC;

-- ---------------------------------------------------------------------------
-- 10. HEALTH CHECK RÁPIDO (Una sola query para ver estado general)
-- ---------------------------------------------------------------------------
WITH stats AS (
    SELECT 
        (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE') AS total_funcionarios,
        (SELECT COUNT(*) FROM social_accounts sa 
         JOIN social_platforms sp ON sp.id = sa.platform_id 
         WHERE sa.binding_status = 'ACTIVE' AND sp.name = 'FACEBOOK') AS funcionarios_con_fb,
        (SELECT COUNT(*) FROM publications WHERE is_monitored = true) AS posts_monitoreados,
        (SELECT COUNT(*) FROM interactions) AS total_interacciones,
        (SELECT COUNT(*) FROM verifications WHERE verification_method = 'AUTOMATIC_SYNC_MATCHER') AS matches_automaticos,
        (SELECT COUNT(*) FROM verifications WHERE verification_method = 'MANUAL_OPERATOR') AS auditorias_manuales,
        (SELECT last_status FROM social_connector_configs WHERE platform_name = 'FACEBOOK') AS fb_connector_status
)
SELECT * FROM stats;

-- ============================================================================
-- INSTRUCCIONES DE USO:
-- ============================================================================
-- 1. Copia este archivo y ejecútalo en tu cliente PostgreSQL
-- 2. En query 5, 6, 7, 9: reemplaza '<PUBLICATION_UUID>' con el UUID real
--    (obtenlo de query 3: columna 'id')
-- 3. Resultados esperados para sistema funcionando:
--    - Query 1: last_status = 'ONLINE' o 'OPERATIONAL', has_token = true
--    - Query 2: status = 'COMPLETED', records_processed > 0, matched_interactions > 0
--    - Query 3: Al menos 1 fila con is_monitored = true
--    - Query 4: Varios funcionarios con facebook_handle NO nulo
--    - Query 5: Filas con interaction_type = 'LIKE'/'COMMENT'/'SHARE', reaction_type = 'LIKE'/'LOVE'/etc
--    - Query 7: verification_method = 'AUTOMATIC_SYNC_MATCHER' con cantidad > 0
-- 4. Si query 5 está vacía: ejecuta "Sincronizar con Redes" en el frontend
-- 5. Si query 4 tiene muchos NULL en facebook_handle: usa botón "Auditar" → ingresa @usuario → Guardar
-- ============================================================================