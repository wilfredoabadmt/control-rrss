import { apiClient } from './client';
import {
  ActivityMatrixResponse,
  ConnectorConfigItem,
  ConnectorConfigsResponse,
  ConnectorsDiagnosticResponse,
  MonitoredPerson,
  MonitoredPersonBulkImportResponse,
  MonitoredPersonCreateInput,
  RunSyncResponse,
  TestConnectionResponse,
} from '../types';

export const monitoringApi = {
  // 1. Configuración de Conectores (Facebook & TikTok)
  getConnectorConfigs: async (): Promise<ConnectorConfigItem[]> => {
    const res = await apiClient.get<ConnectorConfigsResponse>('/monitoring/hub/config');
    return res.data.configs;
  },

  updateConnectorConfigs: async (configs: ConnectorConfigItem[]): Promise<ConnectorConfigItem[]> => {
    const res = await apiClient.post<ConnectorConfigsResponse>('/monitoring/hub/config', { configs });
    return res.data.configs;
  },

  testConnection: async (data: {
    platform_name: string;
    target_account_id?: string;
    access_token?: string;
    api_secret?: string;
    extraction_mode?: string;
  }): Promise<TestConnectionResponse> => {
    const res = await apiClient.post<TestConnectionResponse>('/monitoring/hub/test-connection', data);
    return res.data;
  },

  getConnectorsDiagnostics: async (): Promise<ConnectorsDiagnosticResponse> => {
    const res = await apiClient.get<ConnectorsDiagnosticResponse>('/monitoring/hub/diagnostics');
    return res.data;
  },

  // 2. Gestión de Audiencia (Lista de Personas)
  getAudience: async (): Promise<MonitoredPerson[]> => {
    const res = await apiClient.get<MonitoredPerson[]>('/monitoring/hub/audience');
    return res.data;
  },

  addMonitoredPerson: async (data: MonitoredPersonCreateInput): Promise<MonitoredPerson> => {
    const res = await apiClient.post<MonitoredPerson>('/monitoring/hub/audience', data);
    return res.data;
  },

  bulkImportAudience: async (data: { raw_text: string; delimiter?: string }): Promise<MonitoredPersonBulkImportResponse> => {
    const res = await apiClient.post<MonitoredPersonBulkImportResponse>('/monitoring/hub/audience/bulk', data);
    return res.data;
  },

  // 3. Ejecución de Monitoreo / Scrapeo
  runSocialSync: async (data: {
    platform?: string;
    publication_ids?: string[];
    fetch_new_posts?: boolean;
    max_posts?: number;
  }): Promise<RunSyncResponse> => {
    const res = await apiClient.post<RunSyncResponse>('/monitoring/hub/sync-now', data);
    return res.data;
  },

  // 4. Matriz de Auditoría y Verificación de Actividad
  getActivityMatrix: async (params?: {
    publication_id?: string;
    platform?: string;
    department?: string;
    search?: string;
    participation_status?: string;
  }): Promise<ActivityMatrixResponse> => {
    const res = await apiClient.get<ActivityMatrixResponse>('/monitoring/hub/activity-matrix', { params });
    return res.data;
  },

  // 5. Descarga de Excel
  exportMatrixExcel: async (params?: {
    publication_id?: string;
    platform?: string;
    department?: string;
    search?: string;
    participation_status?: string;
  }): Promise<void> => {
    const res = await apiClient.get('/monitoring/hub/export-matrix', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `Informe_Fiscalizacion_GAMEA_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // 6. Verificación / Auditoría Manual de Actividad de Funcionario
  verifyEmployeeActivity: async (data: {
    employee_id: string;
    publication_id: string;
    reaction_type?: string | null;
    shared?: boolean;
    comment_text?: string | null;
    facebook_account?: string | null;
    verification_status?: string;
    justification?: string;
  }): Promise<{
    success: boolean;
    message: string;
    employee_id: string;
    publication_id: string;
    reaction_type?: string | null;
    shared: boolean;
    comment_text?: string | null;
    verification_status: string;
  }> => {
    const res = await apiClient.post('/monitoring/hub/verify-employee-activity', data);
    return res.data;
  },

  // 7. Importación Masiva de Reacciones de Facebook
  importReactionsBatch: async (data: {
    publication_id: string;
    raw_text: string;
    default_reaction_type?: string;
    platform?: string;
  }): Promise<{
    success: boolean;
    message: string;
    publication_id: string;
    total_names_parsed: number;
    matched_count: number;
    unmatched_citizens_count: number;
    matched_employees: Array<{
      employee_id: string;
      full_name: string;
      department: string;
      reaction_type: string;
      interaction_id: string;
      verification_id: string;
      match_reason?: string;
      match_score?: number;
    }>;
    unmatched_names: string[];
    ambiguous_names?: string[];
  }> => {
    const res = await apiClient.post('/monitoring/hub/import-reactions', data);
    return res.data;
  },
};

export const fetchActivityMatrixApi = (params?: {
  publication_id?: string;
  platform?: string;
  department?: string;
  search?: string;
  participation_status?: string;
  max_posts?: number;
}) => monitoringApi.getActivityMatrix(params);

export const exportActivityMatrixExcelApi = (params?: {
  publication_id?: string;
  platform?: string;
  department?: string;
  search?: string;
  participation_status?: string;
}) => monitoringApi.exportMatrixExcel(params);

export type { ActivityMatrixResponse } from '../types';

