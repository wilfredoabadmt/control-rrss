import { apiClient } from './client';

export interface ReportExecutionItem {
  id: string;
  report_type: string;
  report_version: string;
  generated_at: string;
  file_hash: string;
  row_count: number;
  status: string;
  requested_by_user_id?: string;
  parameters: Record<string, any>;
}

export const listReportExecutionsApi = async (): Promise<ReportExecutionItem[]> => {
  const res = await apiClient.get('/reports/executions');
  return res.data;
};

export const generateReportApi = async (data: {
  report_type?: string;
  campaign_title?: string;
}): Promise<{ blob: Blob; filename: string; sha256: string }> => {
  const res = await apiClient.post('/reports/generate', data, {
    responseType: 'blob',
  });

  const sha256 = res.headers['x-report-sha256'] || '';
  const disposition = res.headers['content-disposition'] || '';
  let filename = 'reporte_gamea.xlsx';
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  return { blob: res.data, filename, sha256 };
};
