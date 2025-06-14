import { Request, Response } from 'express';

// Base API Response interface
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

// Extended Request interface with user information
export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: string;
  tenantId?: string;
}

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  password: string;
  organization_name?: string;
  organization_domain?: string;
  organisation_id?: string;
  google_id?: string;
  verify: number;
  verification_code: string;
  usertype?: string;
  is_super_admin?: boolean;
  requests_made?: number;
  createdDate?: Date;
}

// Session interface
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  created_at: Date;
  expires_at: Date;
  is_valid: boolean;
  ip: string;
  jwt_token: string;
}

// Login request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  token: string;
  sessionToken: string;
  user?: User;
}

// Google Login types
export interface GoogleLoginRequest {
  email: string;
  username: string;
  googleID: string;
  organization_name: string;
  organization_domain: string;
  name: string;
  app: string;
  role: string;
  inviteID?: string;
}

// Registration types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  organization_name: string;
  organization_domain: string;
  name: string;
  redirectPath?: string;
  app: string;
  role?: string;
}

// Tenant types
export interface TenantRequest {
  tenantname: string;
}

// User Status types
export interface UserStatusRequest {
  userid: string;
}

// Session Persistence types
export interface SessionPersistenceResponse {
  jwt_token: string;
  session_token: string;
}

// Audience types
export interface AudienceSegment {
  id: string;
  audience_name: string;
  created_by: string;
  tenant_id: string;
  created_at: Date;
  data_table: string;
  signal_info: any;
  size: number;
  filter_data: any;
  signals_info: any;
  lookalike_contribution: any;
  updated_at: Date;
}

export interface SegmentFilterCriteria {
  filters: any[];
  modelId?: string;
  tenantId: string;
}

export interface SegmentSaveData {
  segmentName: string;
  filterCriteria: any;
  userId: string;
  tenantId: string;
}

// Model types
export interface Model {
  id: string;
  model_name: string;
  user_id: string;
  tenant_id: string;
  source_table: string;
  query: string;
  columns: any;
  created_at: Date;
  updated_at: Date;
}

export interface ModelCreateRequest {
  model_name: string;
  source_table: string;
  query: string;
  columns: any;
}

export interface ModelUpdateRequest {
  id: string;
  query: string;
}

export interface ModelRelationship {
  id: string;
  from_model_id: string;
  to_model_id: string;
  relationship_type: string;
  join_condition: string;
  created_at: Date;
}

// Settings types
export interface UserSettings {
  id: string;
  user_id: string;
  organization_id: string;
  settings_data: any;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationUpdateRequest {
  organization_name: string;
  organization_domain: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: string;
}

// Chat types
export interface ChatSession {
  session_id: string;
  chat_name: string;
  chat_array: any;
  user_id: string;
  tenant_name: string;
  is_file_attached: boolean;
  file_table_name: string;
  is_enriched: boolean;
  enriched_table_name: string;
  schema_name: string;
  query: string;
  flag: string;
  async_out: any;
  created_date: Date;
  is_starred: boolean;
  files: any;
  reports: any;
  dashboard: any;
  report_list: any;
  file_list: any;
}

// Insights types
export interface InsightData {
  id: string;
  user_id: string;
  insight_type: string;
  data: any;
  created_at: Date;
}

// Champion Tracking types
export interface ChampionTrackingData {
  id: string;
  user_id: string;
  data: any;
  created_at: Date;
}

// Integration types
export interface Integration {
  user_id: string;
  integration_id: string;
  integrationname: string;
  status: string;
  refresh_token: string;
  createddate: Date;
  updateddate: Date;
  connection_id: string;
}

// Error types
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// File upload types
export interface FileUploadRequest {
  file: Express.Multer.File;
  userId: string;
  sessionId?: string;
}

// Email types
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  bcc?: string[];
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

// Database query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

// Express handler type
export type AsyncHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: any
) => Promise<void>;

// Middleware types
export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}
