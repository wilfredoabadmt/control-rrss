import { apiClient } from './client';
import { AuthTokens, UserProfile } from '../types';

export interface LoginResponse extends AuthTokens {
  user?: UserProfile;
}

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const res = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  return res.data;
};

export const getMeApi = async (): Promise<UserProfile> => {
  const res = await apiClient.get<any>('/auth/me');
  const d = res.data;
  return {
    id: d.id,
    email: d.email,
    full_name: d.full_name,
    roles: (d.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name)),
    is_active: d.is_active,
    last_login_at: d.last_login_at,
  };
};

export const logoutApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};
