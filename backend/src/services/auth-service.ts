import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from '../lib/auth.js';
import { createAuditLog } from './audit.js';
import type { RegisterInput, BusinessRegisterInput, TokenPair, AuthUser } from '../types/iam.js';

interface UserWithoutPassword {
  id: string;
  businessId: string;
  email: string;
  name?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

interface RegisterResult {
  user: UserWithoutPassword;
  tokens: TokenPair;
}

interface LoginResult {
  user: UserWithoutPassword;
  tokens: TokenPair;
}

interface BusinessRegisterResult {
  user: UserWithoutPassword;
  tokens: TokenPair;
  business: {
    id: string;
    name: string;
    apiKey: string;
  };
}

function parseTokenTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid token TTL format: ${ttl}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return value * 60;
  }
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const { email, password, name, businessId } = input;

  const existingUser = await prisma.user.findUnique({
    where: {
      businessId_email: {
        businessId,
        email,
      },
    },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(password);

  const staffRole = await prisma.role.findFirst({
    where: {
      businessId,
      name: 'Staff',
    },
  });

  if (!staffRole) {
    throw new Error('Staff role not found');
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || null,
      businessId,
      roles: {
        create: {
          roleId: staffRole.id,
        },
      },
    },
  });

  const tokens = generateTokenPair({
    userId: user.id,
    businessId: user.businessId,
    email: user.email,
    roles: ['Staff'],
    permissions: [],
  });

  const expiresAt = new Date(Date.now() + parseTokenTtl(config.refreshTokenTtl) * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      businessId: user.businessId!,
      email: user.email,
      name: user.name || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    tokens,
  };
}

function generateApiKey(): string {
  return `biz-${crypto.randomUUID()}`;
}

const TENANT_ROLES = [
  {
    name: 'Admin',
    description: 'Full tenant administrator with all permissions',
    permissionFilter: (_code: string, category: string) => category !== 'platform',
  },
  {
    name: 'Manager',
    description: 'Business manager with most permissions except user/role management',
    permissionFilter: (code: string, category: string) =>
      category !== 'platform' &&
      !['users:create', 'users:update', 'users:delete', 'users:assign-roles',
        'roles:create', 'roles:update', 'roles:delete', 'audit:export'].includes(code),
  },
  {
    name: 'Staff',
    description: 'Basic staff access for menu, orders, and conversations',
    permissionFilter: (code: string, _category: string) =>
      ['menu:read', 'orders:read', 'orders:create', 'orders:update-status',
       'settings:read', 'conversations:read', 'conversations:send',
       'business:read', 'users:read', 'roles:read'].includes(code),
  },
] as const;

export async function registerBusiness(input: BusinessRegisterInput): Promise<BusinessRegisterResult> {
  const { businessName, email, password, name } = input;

  const passwordHash = await hashPassword(password);
  const apiKey = generateApiKey();

  const result = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const business = await tx.business.create({
      data: {
        name: businessName,
        apiKey,
      },
    });

    const allPermissions = await tx.permission.findMany();

    const adminRole = await tx.role.create({
      data: {
        businessId: business.id,
        name: TENANT_ROLES[0].name,
        description: TENANT_ROLES[0].description,
        isSystem: false,
      },
    });

    const managerRole = await tx.role.create({
      data: {
        businessId: business.id,
        name: TENANT_ROLES[1].name,
        description: TENANT_ROLES[1].description,
        isSystem: false,
      },
    });

    const staffRole = await tx.role.create({
      data: {
        businessId: business.id,
        name: TENANT_ROLES[2].name,
        description: TENANT_ROLES[2].description,
        isSystem: false,
      },
    });

    for (const perm of allPermissions) {
      const isAdmin = TENANT_ROLES[0].permissionFilter(perm.code, perm.category);
      const isManager = TENANT_ROLES[1].permissionFilter(perm.code, perm.category);
      const isStaff = TENANT_ROLES[2].permissionFilter(perm.code, perm.category);

      if (isAdmin) {
        await tx.rolePermission.create({ data: { roleId: adminRole.id, permissionId: perm.id } });
      }
      if (isManager) {
        await tx.rolePermission.create({ data: { roleId: managerRole.id, permissionId: perm.id } });
      }
      if (isStaff) {
        await tx.rolePermission.create({ data: { roleId: staffRole.id, permissionId: perm.id } });
      }
    }

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        businessId: business.id,
      },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    await tx.restaurantSettings.create({
      data: {
        businessId: business.id,
        name: businessName,
        openingTime: '09:00',
        closingTime: '23:00',
        welcomeMsg: '',
        currency: 'SAR',
      },
    });

    const adminPermissions = allPermissions
      .filter(p => TENANT_ROLES[0].permissionFilter(p.code, p.category))
      .map(p => p.code);

    const tokens = generateTokenPair({
      userId: user.id,
      businessId: business.id,
      email: user.email,
      roles: ['Admin'],
      permissions: adminPermissions,
    });

    const expiresAt = new Date(Date.now() + parseTokenTtl(config.refreshTokenTtl) * 1000);

    await tx.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
      },
    });

    return {
      business: {
        id: business.id,
        name: business.name,
        apiKey: business.apiKey,
      },
      user: {
        id: user.id,
        businessId: user.businessId!,
        email: user.email,
        name: user.name || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      tokens,
    };
  });

  return result;
}

export async function loginUser(
  email: string,
  password: string,
  businessId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: {
      businessId_email: {
        businessId,
        email,
      },
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('Account is locked');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const updates: Record<string, unknown> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= config.maxLoginAttempts) {
      updates.lockedUntil = new Date(
        Date.now() + config.lockoutDurationMinutes * 60 * 1000
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    await createAuditLog({
      businessId,
      userId: user.id,
      action: 'LOGIN_FAILED',
      details: { reason: 'Invalid password', attempts },
      ipAddress,
      userAgent,
    });

    throw new Error('Invalid credentials');
  }

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code)
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  const tokens = generateTokenPair({
    userId: user.id,
    businessId: user.businessId,
    email: user.email,
    roles,
    permissions,
  });

  const expiresAt = new Date(Date.now() + parseTokenTtl(config.refreshTokenTtl) * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      deviceInfo: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  await createAuditLog({
    businessId,
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    details: { email: user.email },
    ipAddress,
    userAgent,
  });

  return {
    user: {
      id: user.id,
      businessId: user.businessId!,
      email: user.email,
      name: user.name || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const decoded = verifyRefreshToken(refreshToken);
  const userId = decoded.sub;

  const session = await prisma.session.findFirst({
    where: {
      userId,
      refreshToken,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    throw new Error('Invalid or expired session');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('Account is locked');
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code)
  );

  const tokens = generateTokenPair({
    userId: user.id,
    businessId: user.businessId,
    email: user.email,
    roles,
    permissions,
  });

  const expiresAt = new Date(Date.now() + parseTokenTtl(config.refreshTokenTtl) * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt,
    },
  });

  return tokens;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const decoded = verifyRefreshToken(refreshToken);
  const userId = decoded.sub;

  const session = await prisma.session.findFirst({
    where: {
      userId,
      refreshToken,
      revokedAt: null,
    },
  });

  if (session) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  }
}

export async function getUserWithRoles(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.code)
  );

  return {
    id: user.id,
    businessId: user.businessId,
    email: user.email,
    name: user.name || undefined,
    roles,
    permissions,
  };
}