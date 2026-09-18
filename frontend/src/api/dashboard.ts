import { apiClient } from './client';
import { OperationalDashboardResponse, ExecutiveDashboardResponse } from '../types';

export const getOperationalDashboard = async (): Promise<OperationalDashboardResponse> => {
  const res = await apiClient.get<OperationalDashboardResponse>('/dashboard/operational');
  return res.data;
};

export const getExecutiveDashboard = async (campaignId?: string): Promise<ExecutiveDashboardResponse> => {
  const params = campaignId ? { campaign_id: campaignId } : {};
  const res = await apiClient.get<ExecutiveDashboardResponse>('/dashboard/executive', { params });
  return res.data;
};
