import { apiClient } from './client';

export interface AuditEventItem {
  id: string;
  timestamp_utc: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_name: string;
  entity_id?: string;
  previous_state?: any;
  new_state?: any;
  correlation_id: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
}

export const listAuditEventsApi = async (params?: {
  page?: number;
  page_size?: number;
  action?: string;
  entity_name?: string;
  correlation_id?: string;
}): Promise<{ items: AuditEventItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/audit/events', { params });
  return res.data;
};

export const exportAuditCsvApi = async (): Promise<Blob> => {
  const res = await apiClient.get('/audit/export', { responseType: 'blob' });
  return res.data;
};
