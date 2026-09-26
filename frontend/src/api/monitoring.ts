import { apiClient } from './client';
import {
  ActivityMatrixResponse,
  ConnectorConfigItem,
  ConnectorConfigsResponse,
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
};
