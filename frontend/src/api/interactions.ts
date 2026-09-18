import { apiClient } from './client';
import { VerificationStatus, DataOriginType } from '../types';

export interface InteractionItem {
  id: string;
  platform_name: string;
  external_interaction_id: string;
  external_author_id: string;
  external_author_name?: string;
  interaction_type: string;
  origin_type: DataOriginType;
  captured_at: string;
  content_preview?: string;
  verification_status: VerificationStatus;
  epistemic_explanation?: string;
  employee_name?: string;
}

export interface ManualVerificationPayload {
  interaction_id: string;
  status: 'DECLARED_CONFIRMED' | 'DECLARED_NOT_FOUND';
  justification: string;
  evidence_url?: string;
}

export const listInteractionsApi = async (params?: {
  page?: number;
  page_size?: number;
  status?: VerificationStatus;
  origin_type?: DataOriginType;
}): Promise<{ items: InteractionItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/interactions/', { params });
  return res.data;
};

export const manualVerificationApi = async (data: ManualVerificationPayload): Promise<any> => {
  const res = await apiClient.post('/verifications/manual', data);
  return res.data;
};

export const getConsolidatedStatusApi = async (publicationId: string): Promise<any> => {
  const res = await apiClient.get(`/verifications/status/${publicationId}`);
  return res.data;
};
