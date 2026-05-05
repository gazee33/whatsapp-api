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
import type { RegisterInput, TokenPair, AuthUser } from '../types/iam.js';

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