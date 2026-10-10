import { apiClient } from './client';

export interface EmployeeItem {
  id: string;
  first_name: string;
  last_name: string;
  id_document?: string; // masked or unmasked based on role
  document_number?: string;
  email?: string;
  phone?: string;
  org_unit_id?: string;
  org_unit_name?: string;     // Unidad
  parent_unit_name?: string;  // Dirección
  direction_name?: string;
  position_id?: string;
  position_title?: string;
  facebook_account?: string;  // Cuenta Facebook
  tiktok_account?: string;    // Cuenta TikTok
  is_active: boolean;
  hire_date?: string;
  created_at: string;
}

export interface EmployeeImportResult {
  total_processed: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: any[];
}

export interface OrgUnitNode {
  id: string;
  name: string;
  code: string;
  parent_id?: string;
  children?: OrgUnitNode[];
}

export const listEmployeesApi = async (params: {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: string;
  org_unit_id?: string;
}): Promise<{ items: EmployeeItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/employees/', { params });
  return res.data;
};

export const createEmployeeApi = async (data: Partial<EmployeeItem>): Promise<EmployeeItem> => {
  const res = await apiClient.post('/employees/', data);
  return res.data;
};

export const importPayrollExcelApi = async (file: File): Promise<EmployeeImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const data = res.data;
  return {
    total_processed: data.total_processed ?? data.total_records ?? 0,
    created: data.created ?? data.created_count ?? 0,
    updated: data.updated ?? data.updated_count ?? 0,
    unchanged: data.unchanged ?? data.unchanged_count ?? 0,
    errors: data.errors ?? [],
  };
};

export const updateEmployeeApi = async (id: string, data: Partial<EmployeeItem> & { change_reason?: string; status?: string }): Promise<EmployeeItem> => {
  const res = await apiClient.patch(`/employees/${id}`, data);
  return res.data;
};

export const deleteEmployeeApi = async (id: string, permanent: boolean = false, reason?: string): Promise<{ detail: string }> => {
  const res = await apiClient.delete(`/employees/${id}`, {
    params: {
      permanent,
      reason: reason || (permanent ? 'Eliminación administrativa definitiva' : 'Desvinculación institucional'),
    },
  });
  return res.data;
};

export interface EmployeeBulkDeletePayload {
  employee_ids: string[];
  permanent?: boolean;
  reason?: string;
}

export interface EmployeeBulkDeleteResponse {
  total_requested: number;
  deleted_count: number;
  failed_count?: number;
  permanent?: boolean;
  errors?: string[];
  detail: string;
}

export const bulkDeleteEmployeesApi = async (
  payload: EmployeeBulkDeletePayload
): Promise<EmployeeBulkDeleteResponse> => {
  const res = await apiClient.post('/employees/bulk-delete', payload);
  return res.data;
};


export const getEmployeeHistoryApi = async (id: string): Promise<any[]> => {
  const res = await apiClient.get(`/employees/${id}/history`);
  return res.data;
};

export const getOrgUnitsTreeApi = async (): Promise<OrgUnitNode[]> => {
  const res = await apiClient.get('/org-units/tree');
  return res.data;
};

export const RAW_CSV_TEMPLATE = '\uFEFFnombres,apellidos,unidad,direccion,cuenta_facebook,cuenta_tiktok\n';

export const triggerBlobDownload = (
  blobData: BlobPart,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
) => {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadImportTemplateApi = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> => {
  const isXlsx = format === 'xlsx';
  const filename = isXlsx ? 'plantilla_funcionarios_gamea.xlsx' : 'plantilla_funcionarios_gamea.csv';
  const mimeType = isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv;charset=utf-8;';

  try {
    const res = await apiClient.get('/employees/import/template', {
      params: { format, t: new Date().getTime() },
      responseType: 'blob',
    });
    triggerBlobDownload(res.data, filename, mimeType);
  } catch (err) {
    // Fallback garantizado sin interrupción para el usuario
    triggerBlobDownload(RAW_CSV_TEMPLATE, 'plantilla_funcionarios_gamea.csv', 'text/csv;charset=utf-8;');
  }
};
