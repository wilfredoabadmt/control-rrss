import { apiClient } from './client';

export interface CampaignItem {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  publication_count?: number;
  targets?: Array<{
    id: string;
    target_percentage: number;
    description: string;
  }>;
}

export interface PublicationItem {
  id: string;
  platform_name: string;
  external_post_id: string;
  post_url?: string;
  title?: string;
  published_at: string;
  is_monitored: boolean;
  total_reactions?: number;
  total_comments?: number;
  total_shares?: number;
}

export const listCampaignsApi = async (): Promise<CampaignItem[]> => {
  const res = await apiClient.get('/campaigns/');
  return res.data;
};

export const createCampaignApi = async (data: {
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
}): Promise<CampaignItem> => {
  const res = await apiClient.post('/campaigns/', data);
  return res.data;
};

export const listPublicationsApi = async (params?: {
  page?: number;
  page_size?: number;
  campaign_id?: string;
  is_monitored?: boolean;
}): Promise<{ items: PublicationItem[]; total: number; page: number; total_pages: number }> => {
  const res = await apiClient.get('/publications/', { params });
  return res.data;
};

export const createPublicationApi = async (data: {
  platform_id: string;
  external_post_id: string;
  title?: string;
  post_url?: string;
  published_at: string;
}): Promise<PublicationItem> => {
  const res = await apiClient.post('/publications/', data);
  return res.data;
};

export const bindPublicationsToCampaignApi = async (
  campaignId: string,
  publicationIds: string[]
): Promise<any> => {
  const res = await apiClient.post(`/campaigns/${campaignId}/publications`, {
    publication_ids: publicationIds,
  });
  return res.data;
};
