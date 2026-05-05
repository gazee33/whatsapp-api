import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config.js';
import type { JwtPayload, TokenPair } from '../types/iam.js';

// ─── Configuration ───────────────────────────────────────────────────────────

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const JWT_SECRET = config.jwtSecret;
const BCRYPT_ROUNDS = config.bcryptRounds;

function parseTokenTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid token TTL format: ${ttl}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: return value * 60;
  }
}

// ─── Password Hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT Token Generation ────────────────────────────────────────────────────

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: config.accessTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: config.refreshTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
    expiresIn: parseTokenTtl(config.accessTokenTtl),
  };
}

// ─── JWT Token Verification ──────────────────────────────────────────────────

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string; type: string } {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { sub: string; type: string };
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

// ─── Password Validation ─────────────────────────────────────────────────────

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Cookie Configuration ────────────────────────────────────────────────────

export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: parseTokenTtl(config.refreshTokenTtl) * 1000,
  };
}

export function getAccessTokenCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: parseTokenTtl(config.accessTokenTtl) * 1000,
  };
}
