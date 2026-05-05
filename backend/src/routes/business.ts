import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

// GET /api/business - Get current business info
router.get('/', (req: Request, res: Response) => {
  const business = (req as any).business;

  if (!business) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  const hasPhoneNumberId = !!business.whatsappPhoneNumberId;
  const hasAccessToken = !!business.whatsappAccessToken;
  const hasAppSecret = !!business.whatsappAppSecret;
  const hasVerifyToken = !!business.whatsappVerifyToken;

  res.json({
    id: business.id,
    name: business.name,
    whatsappPhoneNumber: business.whatsappPhoneNumber,
    whatsappPhoneNumberId: business.whatsappPhoneNumberId,
    whatsappVerifyToken: business.whatsappVerifyToken,
    whatsappAppSecret: business.whatsappAppSecret ? '••••••••' : null,
    hasAccessToken,
    onboarding: {
      phoneNumberId: hasPhoneNumberId,
      accessToken: hasAccessToken,
      appSecret: hasAppSecret,
      verifyToken: hasVerifyToken,
      isComplete: hasPhoneNumberId && hasAccessToken && hasAppSecret,
    },
    createdAt: business.createdAt,
  });
});

// PUT /api/business/whatsapp - Update WhatsApp credentials
router.put('/whatsapp', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    if (!business) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const {
      whatsappPhoneNumber,
      whatsappPhoneNumberId,
      whatsappAccessToken,
      whatsappAppSecret,
    } = req.body;

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...(whatsappPhoneNumber !== undefined && { whatsappPhoneNumber }),
        ...(whatsappPhoneNumberId !== undefined && { whatsappPhoneNumberId }),
        ...(whatsappAccessToken !== undefined && { whatsappAccessToken }),
        ...(whatsappAppSecret !== undefined && { whatsappAppSecret }),
      },
    });

    res.json({
      id: updated.id,
      whatsappPhoneNumber: updated.whatsappPhoneNumber,
      whatsappPhoneNumberId: updated.whatsappPhoneNumberId,
      whatsappVerifyToken: updated.whatsappVerifyToken,
      hasAccessToken: !!updated.whatsappAccessToken,
      hasAppSecret: !!updated.whatsappAppSecret,
    });
  } catch (error) {
    console.error('Update WhatsApp credentials error:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp credentials' });
  }
});

// POST /api/business/whatsapp/verify-token - Generate or rotate the verify token
router.post('/whatsapp/verify-token', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    if (!business) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const verifyToken = generateToken();

    await prisma.business.update({
      where: { id: business.id },
      data: { whatsappVerifyToken: verifyToken },
    });

    res.json({ verifyToken });
  } catch (error) {
    console.error('Generate verify token error:', error);
    res.status(500).json({ error: 'Failed to generate verify token' });
  }
});

export default router;
