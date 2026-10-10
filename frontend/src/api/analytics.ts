import { apiClient } from './client';

export interface AnalyticsKPIs {
  total_employees: number;
  observable_employees: number;
  total_publications: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  participating_employees: number;
  participation_rate: number;
  average_reactions_per_post: number;
}

export interface ReactionTypeCount {
  type: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DirectionRankingItem {
  direction: string;
  total_employees: number;
  participating_employees: number;
  total_reactions: number;
  participation_rate: number;
}

export interface TimelinePoint {
  date: string;
  reactions: number;
  comments: number;
  shares: number;
}

export interface PlatformComparisonItem {
  total_reactions: number;
  percentage: number;
  total_comments: number;
  total_shares: number;
}

export interface PlatformComparison {
  facebook: PlatformComparisonItem;
  tiktok: PlatformComparisonItem;
}

export interface AnalyticsOverviewResponse {
  kpis: AnalyticsKPIs;
  reactions_breakdown: ReactionTypeCount[];
  direction_rankings: DirectionRankingItem[];
  timeline_series: TimelinePoint[];
  platform_comparison: PlatformComparison;
  available_directions: string[];
  generated_at: string;
}

export interface EmployeeAnalyticsItem {
  employee_id: string;
  full_name: string;
  document_number: string;
  direction: string;
  unit: string;
  position: string;
  facebook_account?: string | null;
  tiktok_account?: string | null;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  reactions_by_type: Record<string, number>;
  participated_posts_count: number;
  total_available_posts: number;
  participation_rate: number;
  has_participated: boolean;
  last_interaction_at?: string | null;
}

export interface AnalyticsEmployeesPageResponse {
  items: EmployeeAnalyticsItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AnalyticsFilters {
  days?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  direction?: string | null;
  publication_id?: string | null;
  platform_name?: string | null;
  search?: string | null;
  participation_status?: 'ALL' | 'PARTICIPATED' | 'NO_REACTION';
  page?: number;
  page_size?: number;
}

export const analyticsApi = {
  getOverview: async (filters: AnalyticsFilters = {}): Promise<AnalyticsOverviewResponse> => {
    const params: Record<string, any> = {};
    if (filters.days) params.days = filters.days;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.platform_name && filters.platform_name !== 'ALL') params.platform_name = filters.platform_name;

    const res = await apiClient.get<AnalyticsOverviewResponse>('/analytics/overview', { params });
    return res.data;
  },

  getEmployees: async (filters: AnalyticsFilters = {}): Promise<AnalyticsEmployeesPageResponse> => {
    const params: Record<string, any> = {
      page: filters.page || 1,
      page_size: filters.page_size || 20,
    };
    if (filters.search) params.search = filters.search;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.platform_name && filters.platform_name !== 'ALL') params.platform_name = filters.platform_name;
    if (filters.participation_status) params.participation_status = filters.participation_status;

    const res = await apiClient.get<AnalyticsEmployeesPageResponse>('/analytics/employees', { params });
    return res.data;
  },

  exportExcel: async (filters: AnalyticsFilters = {}): Promise<Blob> => {
    const params: Record<string, any> = {};
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.platform_name && filters.platform_name !== 'ALL') params.platform_name = filters.platform_name;

    const res = await apiClient.get('/analytics/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};
