import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { prisma } from '../lib/prisma.js';
import { auth } from '../middleware/auth.js';
import * as authService from '../services/auth-service.js';
import { validatePassword, getAuthCookieOptions, generateTokenPair, verifyPassword } from '../lib/auth.js';
import type { AuthRequest, RegisterInput } from '../types/iam.js';

const router = Router();

router.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing required fields: email, password' });
      return;
    }

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(400).json({ error: 'Business API key required' });
      return;
    }

    const business = await prisma.business.findUnique({ where: { apiKey } });
    if (!business) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const businessId = business.id;

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({ error: 'Invalid password', details: passwordValidation.errors });
      return;
    }

    const result = await authService.registerUser({ email, password, name, businessId });

    res.cookie('refreshToken', result.tokens.refreshToken, getAuthCookieOptions());

    res.status(201).json({
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        businessId: result.user.businessId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', authLimiter, async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing required fields: email, password' });
      return;
    }

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      res.status(400).json({ error: 'Business API key required' });
      return;
    }

    const business = await prisma.business.findUnique({ where: { apiKey } });
    if (!business) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const businessId = business.id;

    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.loginUser(email, password, businessId, ipAddress, userAgent);

    res.cookie('refreshToken', result.tokens.refreshToken, getAuthCookieOptions());

    res.json({
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        businessId: result.user.businessId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    const status = message === 'Invalid credentials' ? 401 : 400;
    res.status(status).json({ error: message });
  }
});

router.post('/platform-login', authLimiter, async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing required fields: email, password' });
      return;
    }

    // Platform users have businessId === null — look up without x-api-key
    const user = await prisma.user.findFirst({
      where: { email, businessId: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const roles = user.roles.map((ur: any) => ur.role.name);
    const permissions = user.roles.flatMap((ur: any) =>
      ur.role.permissions.map((rp: any) => rp.permission.code)
    );

    const tokens = generateTokenPair({
      userId: user.id,
      businessId: null,
      email: user.email,
      roles,
      permissions,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
        deviceInfo: req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });

    res.cookie('refreshToken', tokens.refreshToken, getAuthCookieOptions());

    res.json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessId: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Platform login failed';
    res.status(401).json({ error: message });
  }
});

router.post('/refresh', async (req: any, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token not found' });
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, getAuthCookieOptions());

    res.json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

router.post('/logout', async (req: any, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logoutUser(refreshToken);
    }

    res.clearCookie('refreshToken', getAuthCookieOptions());

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    res.status(500).json({ error: message });
  }
});

router.get('/me', auth, async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userWithRoles = await authService.getUserWithRoles(req.user.id);

    if (!userWithRoles) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(userWithRoles);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    res.status(500).json({ error: message });
  }
});

export default router;