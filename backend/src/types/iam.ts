// IAM-specific TypeScript types

export interface JwtPayload {
  userId: string;
  businessId: string | null;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  businessId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  businessId: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  roleIds?: string[];
}

export interface UpdateUserInput {
  name?: string;
  isActive?: boolean;
  attributes?: Record<string, unknown>;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export interface AuditLogInput {
  businessId: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Express Request extension
export interface AuthRequest extends Express.Request {
  business?: {
    id: string;
    name: string;
    apiKey: string;
    whatsappPhoneNumberId?: string;
    whatsappPhoneNumber?: string;
  };
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  businessId: string | null;
  email: string;
  name?: string;
  roles: string[];
  permissions: string[];
}

export interface PlatformAuthRequest extends Express.Request {
  platformUser: AuthUser;
}
