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
  // Campos SDD para Comentarios y Participación Integral:
  total_employee_comments?: number;
  total_citizen_comments?: number;
  employees_with_comments?: number;
  employees_with_both?: number;
  comment_participation_rate?: number;
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
  available_secretarias?: string[];
  available_directions: string[];
  available_units?: string[];
  ranking_dimension?: 'SECRETARIA' | 'DIRECCION' | 'UNIDAD' | 'FUNCIONARIO';
  ranking_title?: string;
  generated_at: string;
}

export interface EmployeeCommentDetail {
  interaction_id: string;
  publication_id: string;
  post_title: string;
  post_url?: string | null;
  comment_text: string;
  created_at?: string | null;
  associated_reaction?: string | null;
}

export interface EmployeeAnalyticsItem {
  employee_id: string;
  full_name: string;
  document_number: string;
  secretaria?: string;
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
  has_commented?: boolean;
  has_both?: boolean;
  comments?: EmployeeCommentDetail[];
  last_interaction_at?: string | null;
}

export interface AnalyticsEmployeesPageResponse {
  items: EmployeeAnalyticsItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PostCommentAuthorDetail {
  author_id?: string | null;
  author_name: string;
  is_employee: boolean;
  employee_id?: string | null;
  full_name?: string | null;
  document_number?: string | null;
  secretaria?: string | null;
  direction?: string | null;
  unit?: string | null;
  position?: string | null;
}

export interface PostCommentItem {
  id: string;
  publication_id: string;
  post_title?: string | null;
  post_url?: string | null;
  content_text: string;
  created_at?: string | null;
  author: PostCommentAuthorDetail;
  associated_reaction?: string | null;
  epistemic_status: 'CONFIRMED' | 'OBSERVED';
  epistemic_display: string;
}

export interface PostCommentsPageResponse {
  items: PostCommentItem[];
  total: number;
  total_employee_comments: number;
  total_citizen_comments: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CommentFilters {
  publication_id?: string | null;
  author_type?: 'ALL' | 'EMPLOYEES_ONLY' | 'CITIZENS_ONLY';
  secretaria?: string | null;
  direction?: string | null;
  unit?: string | null;
  search?: string | null;
  page?: number;
  page_size?: number;
}

export interface AnalyticsFilters {
  days?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  secretaria?: string | null;
  direction?: string | null;
  unit?: string | null;
  publication_id?: string | null;
  platform_name?: string | null;
  search?: string | null;
  participation_status?: 'ALL' | 'PARTICIPATED' | 'WITH_REACTION' | 'WITH_COMMENT' | 'WITH_BOTH' | 'NO_REACTION' | 'NO_ACTIVITY';
  page?: number;
  page_size?: number;
}

export interface ResetTestDataResponse {
  success: boolean;
  message: string;
  verifications_deleted?: number;
  interactions_deleted?: number;
}

export const analyticsApi = {
  getOverview: async (filters: AnalyticsFilters = {}): Promise<AnalyticsOverviewResponse> => {
    const params: Record<string, any> = {};
    if (filters.days) params.days = filters.days;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.secretaria && filters.secretaria !== 'ALL') params.secretaria = filters.secretaria;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.unit && filters.unit !== 'ALL') params.unit = filters.unit;
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
    if (filters.secretaria && filters.secretaria !== 'ALL') params.secretaria = filters.secretaria;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.unit && filters.unit !== 'ALL') params.unit = filters.unit;
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.platform_name && filters.platform_name !== 'ALL') params.platform_name = filters.platform_name;
    if (filters.participation_status) params.participation_status = filters.participation_status;

    const res = await apiClient.get<AnalyticsEmployeesPageResponse>('/analytics/employees', { params });
    return res.data;
  },

  getComments: async (filters: CommentFilters = {}): Promise<PostCommentsPageResponse> => {
    const params: Record<string, any> = {
      page: filters.page || 1,
      page_size: filters.page_size || 20,
    };
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.author_type && filters.author_type !== 'ALL') params.author_type = filters.author_type;
    if (filters.secretaria && filters.secretaria !== 'ALL') params.secretaria = filters.secretaria;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.unit && filters.unit !== 'ALL') params.unit = filters.unit;
    if (filters.search) params.search = filters.search;

    const res = await apiClient.get<PostCommentsPageResponse>('/analytics/comments', { params });
    return res.data;
  },

  exportExcel: async (filters: AnalyticsFilters = {}): Promise<Blob> => {
    const params: Record<string, any> = {};
    if (filters.secretaria && filters.secretaria !== 'ALL') params.secretaria = filters.secretaria;
    if (filters.direction && filters.direction !== 'ALL') params.direction = filters.direction;
    if (filters.unit && filters.unit !== 'ALL') params.unit = filters.unit;
    if (filters.publication_id && filters.publication_id !== 'ALL') params.publication_id = filters.publication_id;
    if (filters.platform_name && filters.platform_name !== 'ALL') params.platform_name = filters.platform_name;

    const res = await apiClient.get('/analytics/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  resetTestData: async (): Promise<ResetTestDataResponse> => {
    const res = await apiClient.post<ResetTestDataResponse>('/analytics/reset-test-data');
    return res.data;
  },
};
