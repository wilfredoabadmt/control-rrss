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

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  is_active: boolean;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
