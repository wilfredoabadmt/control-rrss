/**
 * Utilidades de formato y traducción de variables a etiquetas en español
 * GAMEA Social Monitor — Interfaz Institucional
 */

export const ORIGIN_TYPE_LABELS: Record<string, string> = {
  CITIZEN_COMMENT_ON_OFFICIAL: 'Comentario Ciudadano (Publicación Oficial)',
  EMPLOYEE_INTERACTION_OFFICIAL: 'Interacción de Funcionario (Página Oficial)',
  EMPLOYEE_INTERACTION_PERSONAL: 'Interacción de Funcionario (Perfil Personal)',
  CITIZEN_COMMENT_UNOFFICIAL: 'Comentario Ciudadano (Medio Externo)',
  UNKNOWN_ORIGIN: 'Origen No Determinado',
};

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  COMMENT: 'Comentario',
  REACTION: 'Reacción',
  SHARE: 'Compartido',
  LIKE: 'Me Gusta',
  LOVE: 'Me Encanta',
  WOW: 'Me Asombra',
  SAD: 'Me Entristece',
  ANGRY: 'Me Enoja',
  REPOST: 'Republicación',
};

export const VERIFICATION_STATUS_LABELS: Record<string, { label: string; description: string; color: string }> = {
  CONFIRMED: {
    label: 'Confirmado Técnicamente',
    description: 'Verificado mediante identificador de red social vinculado directamente.',
    color: '#10b981',
  },
  DECLARED_CONFIRMED: {
    label: 'Confirmado por Declaración / Manual',
    description: 'Validado por funcionario o analista con evidencia adjunta.',
    color: '#34d399',
  },
  PENDING: {
    label: 'Pendiente de Verificación',
    description: 'Requiere revisión o cruce con nómina de funcionarios.',
    color: '#fbbf24',
  },
  NOT_OBSERVABLE: {
    label: 'No Observable Técnicamente',
    description: 'La API de la plataforma o la configuración de privacidad impiden la lectura del autor.',
    color: '#8b5cf6',
  },
  API_RESTRICTED: {
    label: 'Restringido por API de Plataforma',
    description: 'Restricción de privacidad impuesta por Meta o TikTok.',
    color: '#ec4899',
  },
  DECLARED_NOT_FOUND: {
    label: 'No Encontrado por Declaración',
    description: 'El analista verificó manualmente la inexistencia de la interacción.',
    color: '#f87171',
  },
  NOT_FOUND: {
    label: 'No Localizado',
    description: 'No se detectó actividad del funcionario en la publicación.',
    color: '#f43f5e',
  },
};

export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  COMMUNICATIONS_LEAD: 'Líder de Comunicación',
  ANALYST: 'Analista de Monitoreo',
  DIRECTOR: 'Director Municipal',
  AUDITOR: 'Auditor General',
  OPERATOR: 'Operador Técnico',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio de Sesión',
  LOGOUT: 'Cierre de Sesión',
  CREATE: 'Creación de Registro',
  UPDATE: 'Actualización de Datos',
  DELETE: 'Eliminación',
  VERIFY: 'Verificación Epistémica',
  EXPORT: 'Exportación de Reporte',
  CONFIG_CHANGE: 'Cambio de Configuración',
  SYNC: 'Sincronización Externa',
  IMPORT: 'Importación Masiva',
};

export const ENTITY_NAME_LABELS: Record<string, string> = {
  User: 'Usuario del Sistema',
  Employee: 'Funcionario Municipal',
  Interaction: 'Interacción de Red Social',
  Publication: 'Publicación Oficial',
  Campaign: 'Campaña Comunicacional',
  ReportExecution: 'Ejecución de Reporte',
  Verification: 'Verificación Epistémica',
  SocialAccount: 'Cuenta de Red Social',
  Role: 'Rol Constitucional',
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  METRICS_SYNC: 'Sincronización de Métricas',
  COMMENTS_FETCH: 'Captura de Comentarios',
  PROFILE_CHECK: 'Verificación de Cuentas',
  FULL_SYNC: 'Sincronización Integral',
};

export const JOB_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  COMPLETED: { label: 'Completado', badgeClass: 'badge-success' },
  RUNNING: { label: 'En Ejecución', badgeClass: 'badge-info' },
  FAILED: { label: 'Fallido', badgeClass: 'badge-danger' },
  QUEUED: { label: 'En Cola', badgeClass: 'badge-warning' },
};

export const REPORT_TYPE_LABELS: Record<string, string> = {
  ESTADO_VERIFICACION_EPISTEMICA: 'Estado de Verificación Epistémica',
  INDICADORES_COBERTURA_EJECUTIVA: 'Indicadores de Cobertura Ejecutiva',
  AUDITORIA_INTEGRAL: 'Auditoría Integral de Interacciones',
};

export function formatOriginType(type?: string): string {
  if (!type) return 'Desconocido';
  return ORIGIN_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

export function formatInteractionType(type?: string): string {
  if (!type) return 'Interacción';
  return INTERACTION_TYPE_LABELS[type] || type;
}

export function formatVerificationStatus(status?: string): { label: string; color: string } {
  if (!status) return { label: 'Sin Estado', color: '#94a3b8' };
  const entry = VERIFICATION_STATUS_LABELS[status];
  return entry ? { label: entry.label, color: entry.color } : { label: status.replace(/_/g, ' '), color: '#94a3b8' };
}

export function formatUserRole(role?: string): string {
  if (!role) return 'Sin Rol';
  return USER_ROLE_LABELS[role] || role.replace(/_/g, ' ');
}

export function formatAuditAction(action?: string): string {
  if (!action) return 'Acción';
  return AUDIT_ACTION_LABELS[action] || action.replace(/_/g, ' ');
}

export function formatEntityName(entity?: string): string {
  if (!entity) return 'Entidad';
  return ENTITY_NAME_LABELS[entity] || entity;
}

export function formatJobType(jobType?: string): string {
  if (!jobType) return 'Proceso';
  return JOB_TYPE_LABELS[jobType] || jobType.replace(/_/g, ' ');
}

export function formatJobStatus(status?: string): { label: string; badgeClass: string } {
  if (!status) return { label: 'Desconocido', badgeClass: 'badge-warning' };
  return JOB_STATUS_LABELS[status] || { label: status, badgeClass: 'badge-info' };
}

export function formatReportType(reportType?: string): string {
  if (!reportType) return 'Reporte Oficial';
  return REPORT_TYPE_LABELS[reportType] || reportType.replace(/_/g, ' ');
}
