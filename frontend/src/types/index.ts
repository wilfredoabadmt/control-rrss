/**
 * Tipos Canónicos Compartidos — Frontend GAMEA Social Monitor
 * Sincronizados con backend/modules/shared/enums.py
 */

export enum DataOriginType {
  OFFICIAL_ACCOUNT_POST = 'OFFICIAL_ACCOUNT_POST',
  OFFICIAL_ACCOUNT_COMMENT = 'OFFICIAL_ACCOUNT_COMMENT',
  OFFICIAL_ACCOUNT_REPLY = 'OFFICIAL_ACCOUNT_REPLY',
  CITIZEN_POST_MENTIONING = 'CITIZEN_POST_MENTIONING',
  CITIZEN_COMMENT_ON_OFFICIAL = 'CITIZEN_COMMENT_ON_OFFICIAL',
  EMPLOYEE_INTERACTION_OFFICIAL = 'EMPLOYEE_INTERACTION_OFFICIAL',
  THIRD_PARTY_OBSERVATION = 'THIRD_PARTY_OBSERVATION',
  EXTERNAL_IMPORT_BATCH = 'EXTERNAL_IMPORT_BATCH',
}

export enum SyncJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED_RATE_LIMIT = 'PAUSED_RATE_LIMIT',
  COMPLETED = 'COMPLETED',
  COMPLETED_WITH_WARNINGS = 'COMPLETED_WITH_WARNINGS',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_FATAL = 'FAILED_FATAL',
  CANCELLED = 'CANCELLED',
  CIRCUIT_BROKEN = 'CIRCUIT_BROKEN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  NOT_FOUND = 'NOT_FOUND',
  NOT_OBSERVABLE = 'NOT_OBSERVABLE',
  DECLARED_CONFIRMED = 'DECLARED_CONFIRMED',
  DECLARED_NOT_FOUND = 'DECLARED_NOT_FOUND',
  API_RESTRICTED = 'API_RESTRICTED',
  ERROR = 'ERROR',
  VERIFIED_AUTOMATIC = 'VERIFIED_AUTOMATIC',
  VERIFIED_MANUAL = 'VERIFIED_MANUAL',
  REJECTED = 'REJECTED',
  UNVERIFIABLE = 'UNVERIFIABLE',
  EXEMPT = 'EXEMPT',
}

export enum InteractionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  CARE = 'CARE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  SHARE = 'SHARE',
  REPOST = 'REPOST',
  VIEW = 'VIEW',
  OTHER = 'OTHER',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  AUDITOR = 'AUDITOR',
  DIRECTOR = 'DIRECTOR',
  COMMUNICATIONS_LEAD = 'COMMUNICATIONS_LEAD',
  ANALYST = 'ANALYST',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export enum SocialPlatformType {
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
}

export type WorkspaceType = 'GLOBAL' | 'DIRECTION' | 'UNIT' | 'AUTONOMOUS';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  is_active: boolean;
  workspace_type?: WorkspaceType;
  assigned_direction?: string | null;
  assigned_unit?: string | null;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PlatformHealthItem {
  name: string;
  display_name: string;
  is_active: boolean;
  status: string; // ONLINE, DEGRADED, OFFLINE
}

export interface OperationalDashboardResponse {
  platforms: PlatformHealthItem[];
  monitored_publications_count: number;
  total_interactions_count: number;
  pending_verifications_count: number;
  recent_sync_jobs: Array<{
    id: string;
    platform: string;
    job_type: string;
    status: SyncJobStatus;
    created_at: string;
    records_processed?: number;
    records_failed?: number;
  }>;
  active_alerts: Array<{
    level: string;
    message: string;
  }>;
}

export interface IndicatorResult {
  code: string;
  name: string;
  value: number;
  unit: string;
  numerator: number;
  denominator: number;
  exclusions: number;
  formula: string;
  description: string;
  methodology_notes: string;
}

export interface ExecutiveDashboardResponse {
  observable_coverage_rate: IndicatorResult;
  verification_rate: IndicatorResult;
  verification_distribution: Record<string, number>;
  platform_breakdown: Record<string, number>;
  total_active_employees: number;
  constitutional_disclaimer: string;
}

// ---------------------------------------------------------------------------
// Módulo de Monitoreo & Ingesta (Facebook & TikTok Scraper Hub)
// ---------------------------------------------------------------------------

export interface ConnectorConfigItem {
  platform_name: string;
  target_account_id: string;
  display_name: string;
  access_token?: string;
  api_secret?: string;
  has_token: boolean;
  has_secret: boolean;
  api_version: string;
  extraction_mode: string;
  rate_limit_per_minute: number;
  max_posts_per_sync: number;
  max_comments_per_post: number;
  is_active: boolean;
  last_sync_at?: string;
  last_status: string;
  status_message?: string;
}

export interface ConnectorConfigsResponse {
  configs: ConnectorConfigItem[];
}

export interface TestConnectionResponse {
  platform_name: string;
  success: boolean;
  status: string;
  message: string;
  account_info?: Record<string, any>;
}

export interface ConnectorVariableDetail {
  key: string;
  label: string;
  configured: boolean;
  is_mock: boolean;
  masked_value: string;
  status_badge: string;
  source: string;
  required: boolean;
  description: string;
}

export interface MissingDataNotice {
  variable_name: string;
  impact: string;
  instructions: string;
}

export interface ConnectorDiagnosticDetail {
  platform_name: string;
  display_name: string;
  icon_type: string;
  api_version: string;
  overall_status: 'OPERATIONAL' | 'PARTIAL' | 'NOT_CONFIGURED' | 'TOKEN_EXPIRED' | 'AUTH_FAILED' | string;
  status_label: string;
  target_account: string;
  rate_limit_display: string;
  variables: ConnectorVariableDetail[];
  missing_variables: MissingDataNotice[];
  has_missing_data: boolean;
  diagnostic_summary: string;
  last_checked_at: string;
}

export interface ConnectorsDiagnosticResponse {
  connectors: ConnectorDiagnosticDetail[];
  system_env: string;
  all_operational: boolean;
  total_missing_variables: number;
}

export interface MonitoredPerson {
  ci: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string;
  position: string;
  email?: string;
  facebook_account?: string;
  facebook_profile_url?: string;
  tiktok_account?: string;
  tiktok_profile_url?: string;
  status: string;
  created_at: string;
}

export interface MonitoredPersonCreateInput {
  ci: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  email?: string;
  facebook_account?: string;
  facebook_profile_url?: string;
  tiktok_account?: string;
  tiktok_profile_url?: string;
}

export interface MonitoredPersonBulkImportResponse {
  total_parsed: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  errors: string[];
}

export interface RunSyncResponse {
  job_id: string;
  status: string;
  platform: string;
  posts_processed: number;
  interactions_extracted: number;
  matched_interactions: number;
  new_interactions_created: number;
  execution_time_seconds: number;
  details: string;
}

export interface ActivityMatrixPersonPost {
  publication_id: string;
  platform: string;
  external_post_id: string;
  post_url?: string;
  post_title: string;
  published_at?: string;
  reaction_type?: string;
  shared?: boolean;
  comment_text?: string;
  comment_created_at?: string;
  verification_status: string;
  epistemic_status_display: string;
}

export interface ActivityMatrixRow {
  employee_id: string;
  full_name: string;
  department: string;
  position: string;
  facebook_handle?: string;
  tiktok_handle?: string;
  total_reactions: number;
  total_comments: number;
  total_shares?: number;
  has_participated: boolean;
  posts: ActivityMatrixPersonPost[];
}

export interface ActivityMatrixSummary {
  total_monitored_persons: number;
  total_participated: number;
  total_not_participated?: number;
  participation_percentage: number;
  total_reactions: number;
  total_comments: number;
  total_shares?: number;
  reactions_by_type: Record<string, number>;
  total_publications_evaluated: number;
}

export interface ActivityMatrixResponse {
  summary: ActivityMatrixSummary;
  rows: ActivityMatrixRow[];
}


