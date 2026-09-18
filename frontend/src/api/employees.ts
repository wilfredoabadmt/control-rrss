import { apiClient } from './client';

export interface EmployeeItem {
  id: string;
  first_name: string;
  last_name: string;
  id_document: string; // masked or unmasked based on role
  email?: string;
  phone?: string;
  org_unit_id?: string;
  org_unit_name?: string;
  position_id?: string;
  position_title?: string;
  is_active: boolean;
  hire_date?: string;
  created_at: string;
}

export interface EmployeeImportResult {
  total_processed: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: Array<{ row: number; reason: string }>;
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
