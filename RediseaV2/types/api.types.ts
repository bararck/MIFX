// api.types.ts - Fixed version with correct type definitions

export interface PaginationMeta {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface ApiResponse<T = any> {
  errorCode?: string; // Fixed: should be optional property, not method
  validationErrors?: any[]; // Fixed: should be optional array, not any
  message: string;
  requestId?: string;
  data?: T;
  user?: any;
  meta?: PaginationMeta;
  items?: T[];
  success?: boolean;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T> {
  meta: PaginationMeta;
  items: T[];
}

// Service Response wrapper
export interface ServiceResponse<T = any> {
  status: number;
  body: T & { requestId?: string };
}

// Test Response wrapper - Fixed to match expected structure
export interface TestResponse<T = any> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

// Rank Type interfaces
export interface RankTypeRequest {
  rankTypeName: string;
  displayOrder: number;
}

export interface RankTypeResponse {
  id: string;
  rankTypeName: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Rank Classification interfaces
export interface RankClassificationRequest {
  rankClassificationName: string;
  displayOrder: number;
}

export interface RankClassificationResponse {
  id: string;
  rankClassificationName: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Rank interfaces
export interface RankRequest {
  rankTypeId: string;
  rankClassificationId: string;
  rankName: string;
  displayOrder: number;
}

export interface RankResponse {
  rankId: string;
  rankTypeId: string;
  rankClassificationId: string;
  rankName: string;
  rankTypeName: string;
  rankClassificationName: string;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Specific response types for rank endpoints
export interface RankTypesResponse extends ApiResponse<RankTypeResponse[]> {}
export interface RankClassificationsResponse extends ApiResponse<RankClassificationResponse[]> {}
export interface RanksResponse extends ApiResponse<RankResponse[]> {}
export interface RanksPaginatedResponse extends PaginatedApiResponse<RankResponse> {}

// Vessel Type interfaces
// Updated Vessel Type interfaces to match actual API
export interface VesselTypeRequest {
  vesselType: string;  // Changed from vesselTypeName to vesselType
  displayOrder: number;
  id?: string;  // Optional for create/update operations
}

export interface VesselTypeResponse {
  vesselType: string;
  id: string;
  vesselTypeName: string;  // Response still uses vesselTypeName
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Updated Vessel interfaces to match actual API
export interface VesselRequest {
  vesselId?: string;  // Optional for create operations, required for updates
  vesselTypeId: string;
  shipownerId: string;  // Added required shipownerId field
  vesselName: string;  // Fixed from VeselName
  includeCalculation: boolean;  // Added required boolean field
  displayOrder: number;
}

export interface VesselResponse {
  id: string;
  vesselId: string;
  vesselTypeId: string;
  shipownerId?: string;  // Added shipownerId in response
  vesselName: string;
  vesselTypeName: string;
  includeCalculation?: boolean;  // Added includeCalculation in response
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Keep existing response types
export interface VesselTypesResponse extends ApiResponse {
  data?: VesselTypeResponse[];
}

export interface VesselsResponse extends ApiResponse {
  data?: VesselResponse[];
}

export interface VesselPaginatedResponse extends PaginatedApiResponse<VesselResponse> {}

// Additional types for the actual API structure
export interface VesselTypeUpdateRequest {
  id?: string;
  vesselType: string;
  displayOrder: number;
}

export interface VesselUpdateRequest {
  vesselId?: string;
  vesselTypeId: string;
  shipownerId: string;
  vesselName: string;
  includeCalculation: boolean;
  displayOrder: number;
}

// API request wrapper types
export interface VesselTypeApiRequest {
  data: VesselTypeUpdateRequest[];
}

export interface VesselApiRequest {
  data: VesselUpdateRequest[];
}

// User interfaces
export interface UserData {
  name: string;
  email: string;
  password: string;
  companyId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
  isActive?: boolean;
}

// Auth Request interfaces
export interface LoginRequest {
  email: string;
  password: string;
  bypassCaptcha?: boolean;
  recaptchaToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
  bypassCaptcha?: boolean;
  recaptchaToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  passwordConfirmation: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  companyId: string | null;
}

// Auth Response interfaces - Fixed method definitions
export interface LoginResponse {
  message: string;
  user: User;
  accessToken?: string; // Fixed: should be property, not method
  refreshToken?: string; // Fixed: should be property, not method
  token?: {
    accessToken: string;
    refreshToken: string;
    expiredAt: string;
  };
  requestId?: string;
}

export interface RefreshTokenResponse {
  message: string;
  token: {
    expiredAt: string;
  };
  requestId?: string;
}

export interface ValidateTokenResponse {
  user: User;
  requestId?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  requestId?: string;
}

export interface ResetPasswordResponse {
  message: string;
  requestId?: string;
}

export interface SetCompanyResponse {
  message: string;
  user: User;
  requestId?: string;
}

// Company interfaces
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logo?: string;
  companyGroupId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logo?: string;
  companyGroupId?: string;
}

export interface UpdateCompanyRequest extends CreateCompanyRequest {
  id: string;
}

// Company Group interfaces
export interface CompanyGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyGroupRequest {
  name: string;
}

export interface UpdateCompanyGroupRequest {
  name: string;
}

// Company Response interfaces - Fixed to extend ApiResponse
export interface CompanyGroupResponse extends ApiResponse<CompanyGroup> {
  name: string;
}

export interface UpdateCompanyGroupResponse extends ApiResponse<CompanyGroup> {
  message: string;
  companyGroup: CompanyGroup;
}

export interface CreateCompanyResponse extends ApiResponse<Company> {
  message: string;
  company: Company;
}

export interface UpdateCompanyResponse extends ApiResponse<Company> {
  message: string;
  company: Company;
}

export interface GetCompaniesResponse extends PaginatedApiResponse<Company> {}

export interface DeleteCompanyResponse extends ApiResponse<any> {
  message: string;
}

export interface GetCompanyResponse extends ApiResponse<Company> {
  company: Company;
}

// Stakeholder interfaces
export interface Stakeholder {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  companyId?: string;
  type?: 'internal' | 'external' | 'partner' | 'client' | 'supplier';
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStakeholderRequest {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  companyId?: string;
  type?: 'internal' | 'external' | 'partner' | 'client' | 'supplier';
  description?: string;
}

export interface UpdateStakeholderRequest extends CreateStakeholderRequest {
  id: string;
}

export interface CreateStakeholderResponse extends ApiResponse<Stakeholder> {
  message: string;
  stakeholder: Stakeholder;
}

export interface UpdateStakeholderResponse extends ApiResponse<Stakeholder> {
  message: string;
  stakeholder: Stakeholder;
}

export interface GetStakeholdersResponse extends PaginatedApiResponse<Stakeholder> {}

export interface GetStakeholderResponse extends ApiResponse<Stakeholder> {
  stakeholder: Stakeholder;
}

export interface DeleteStakeholderResponse extends ApiResponse<any> {
  message: string;
}

export interface StakeholderResponse {
  status: number;
  body: {
    message?: string;
    stakeholder?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      position?: string;
      company?: string;
      type?: 'internal' | 'external';
      isActive?: boolean;
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

// Updated Crew Component Types to fix TypeScript errors

export interface CrewComponent {
  id?: string;
  tempId?: string;
  componentName: string;
  fieldType: string;
  items?: ComponentItem[] | null;
  defaultValue?: string | null;
  groupId?: string;
}

export interface ComponentItem {
  label: string;
  value: string;
}

export interface CrewComponentGroup {
  id?: string;
  tempId?: string;
  groupId?: string;
  name: string;
  type: 'Single Data' | 'Multiple Data';
  category: 'Profile' | 'Legal Identity' | 'Certificate' | 'Document' | 'Other';
  components?: CrewComponent[];
}

export interface CrewComponentRequest {
  groups?: {
    add?: CrewComponentGroup[];
    update?: CrewComponentGroup[];
    delete?: string[];
  };
  components?: {
    add?: CrewComponent[];
    update?: CrewComponent[];
    delete?: string[];
  };
}

// Updated CrewComponentResponse to include missing properties
export interface CrewComponentResponse {
  message: string;
  // Add optional error properties for error handling
  error?: string;
  errorCode?: string;
  validationErrors?: ValidationError[];
  requestId?: string;
  
  // Keep existing generatedIds but make it optional for flexibility
  generatedIds?: {
    groups?: {
      created?: Array<{ tempId: string; id: string }>;
      updated?: string[];
      deleted?: string[];
    };
    components?: {
      created?: Array<{ tempId: string; id: string }>;
      updated?: string[];
      deleted?: string[];
    };
  };
  
  // Add optional data property for GET endpoints
  data?: CrewComponentGroup[] | CrewComponent[] | any;
  
  // Add direct array properties for flexible response handling
  groups?: CrewComponentGroup[];
  components?: CrewComponent[];
  
  // Add pagination support for GET endpoints
  items?: CrewComponentGroup[] | CrewComponent[];
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export type CrewComponentsAllResponse = ApiResponse<CrewComponentGroup[]>;

// Update enum values to match your test usage
export enum CrewComponentCategory {
  PROFILE = 'Profile',  // Changed from 'PROFILE' to 'Profile'
  LEGAL_IDENTITY = 'Legal Identity',  // Changed to match actual API
  CERTIFICATE = 'Certificate',
  DOCUMENT = 'Document',
  OTHER = 'Other'
}

export type CrewTemplateComponent = {
  id?: string;
  componentId: string;
  isMandatory: boolean;
  isActive: boolean;
  displayOrder: number;
};

export type CrewTemplateGroup = {
  id?: string;
  groupId: string;
  isActive: boolean;
  displayOrder: number;
  components: CrewTemplateComponent[];
};

export type CrewTemplateRequest = {
  templateName: string;
  profile: CrewTemplateGroup[];
  legalIdentity: CrewTemplateGroup[];
  certificate: CrewTemplateGroup[];
  document: CrewTemplateGroup[];
  other: CrewTemplateGroup[];
};

export type CrewTemplateResponse = {
  id: string;
  templateName: string;
  profile: CrewTemplateGroup[];
  legalIdentity: CrewTemplateGroup[];
  certificate: CrewTemplateGroup[];
  document: CrewTemplateGroup[];
  other: CrewTemplateGroup[];
};

export interface CrewTemplateListCollectionResponse {
  message: string;
  requestId?: string;
  items: CrewTemplateResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Error response interfaces
export interface ValidationError {
  field: string;
  message: string;
  rule?: string;
}

export interface ErrorResponse {
  message: string;
  errorCode: string;
  validationErrors?: ValidationError[];
  requestId?: string;
}

// Keep your existing CreateUserResponse
export interface CreateUserResponse extends ApiResponse<User> {
  message: string;
  user: {
    id: string;
    companyId: string | null;
    name: string;
    email: string;
  };
}