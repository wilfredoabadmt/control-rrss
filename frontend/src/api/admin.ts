import { apiClient } from './client';
import { UserRole } from '../types';

export interface UserAdminItem {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: Array<{ id: string; name: string; description?: string }>;
  failed_login_attempts: number;
  locked_until?: string;
  last_login_at?: string;
  created_at?: string;
}

export const listUsersApi = async (params?: {
  page?: number;
  page_size?: number;
  role?: string;
}): Promise<{ items: UserAdminItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/users/', { params });
  return res.data;
};

export const createUserApi = async (data: {
  email: string;
  full_name: string;
  password: string;
  role_names: string[];
}): Promise<UserAdminItem> => {
  const res = await apiClient.post('/users/', data);
  return res.data;
};

export const updateUserRolesApi = async (userId: string, roleNames: string[]): Promise<any> => {
  const res = await apiClient.put(`/users/${userId}/roles`, { role_names: roleNames });
  return res.data;
};

export const deactivateUserApi = async (userId: string): Promise<any> => {
  const res = await apiClient.delete(`/users/${userId}`);
  return res.data;
};

export const listRolesApi = async (): Promise<Array<{ id: string; name: UserRole; description: string }>> => {
  const res = await apiClient.get('/roles/');
  return res.data;
};
