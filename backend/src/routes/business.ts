import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';
import {
  createOnboardingSession,
  listConnections,
  getConnection,
  disconnectConnection,
  confirmHeartbeat,
  getConnectionHealth,
  refreshConnectionHealth,
  updateWebhook,
  DualhookApiError,
} from '../services/dualhook-client.js';
import { config } from '../config.js';

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

// GET /api/business - Get current business info including DualHook connections
router.get('/', async (req: Request, res: Response) => {
  const business = (req as any).business;

  if (!business) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  const connections = await prisma.dualhookConnection.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'desc' },
  });

  const hasPhoneNumberId = !!business.whatsappPhoneNumberId;
  const hasAccessToken = !!business.whatsappAccessToken;
  const hasAppSecret = !!business.whatsappAppSecret;

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
      isComplete: hasPhoneNumberId && hasAccessToken,
    },
    dualhookConnections: connections.map((c) => ({
      id: c.id,
      connectionId: c.connectionId,
      wabaId: c.wabaId,
      phoneNumberId: c.phoneNumberId,
      displayPhoneNumber: c.displayPhoneNumber,
      verifiedName: c.verifiedName,
      status: c.status,
      connectionMode: c.connectionMode,
      heartbeatStatus: c.heartbeatStatus,
      heartbeatLastConfirmedAt: c.heartbeatLastConfirmedAt,
      heartbeatNextDueAt: c.heartbeatNextDueAt,
      webhookUrl: c.webhookUrl,
      createdAt: c.createdAt,
    })),
    createdAt: business.createdAt,
  });
});

// PUT /api/business/whatsapp - Update WhatsApp credentials (app secret + verify token only;
// phone number ID and access token are auto-managed by DualHook)
router.put('/whatsapp', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { whatsappAppSecret } = req.body;

    const updated = await prisma.business.update({
      where: { id: biz.id },
      data: {
        ...(whatsappAppSecret !== undefined && { whatsappAppSecret }),
      },
    });

    res.json({
      id: updated.id,
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
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const verifyToken = generateToken();

    await prisma.business.update({
      where: { id: biz.id },
      data: { whatsappVerifyToken: verifyToken },
    });

    res.json({ verifyToken });
  } catch (error) {
    console.error('Generate verify token error:', error);
    res.status(500).json({ error: 'Failed to generate verify token' });
  }
});

// ─── DualHook Onboarding ─────────────────────────────────────────────────────

// POST /api/business/whatsapp/onboarding - Create a DualHook onboarding session
router.post('/whatsapp/onboarding', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    if (!config.dualhookApiKey) {
      return res.status(503).json({ error: 'DualHook integration not configured' });
    }

    // Ensure a verify token exists
    let verifyToken = biz.whatsappVerifyToken;
    if (!verifyToken) {
      verifyToken = generateToken();
      await prisma.business.update({
        where: { id: biz.id },
        data: { whatsappVerifyToken: verifyToken },
      });
    }

    const webhookUrl = new URL(config.frontendUrl);
    webhookUrl.pathname = '/api/webhook';
    const webhookOverrideUrl = webhookUrl.toString();

    const session = await createOnboardingSession({
      tenantId: biz.id,
      tenantName: biz.name,
      successRedirectUrl: `${config.dualhookRedirectBase}/whatsapp?session_status=completed`,
      failureRedirectUrl: `${config.dualhookRedirectBase}/whatsapp?session_status=failed`,
      cancelRedirectUrl: `${config.dualhookRedirectBase}/whatsapp?session_status=cancelled`,
      webhookOverrideUrl,
      webhookVerifyToken: verifyToken,
      metadata: { businessId: biz.id, businessName: biz.name },
    });

    res.json(session);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      console.error('DualHook API error:', { status: error.status, code: error.code, message: error.message });
      return res.status(error.status).json({
        error: error.code,
        message: error.message,
      });
    }
    console.error('Create onboarding session error:', error);
    res.status(500).json({ error: 'Failed to create onboarding session' });
  }
});

// GET /api/business/whatsapp/connections - List DualHook connections
router.get('/whatsapp/connections', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const connections = await prisma.dualhookConnection.findMany({
      where: { businessId: biz.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ connections });
  } catch (error) {
    console.error('List connections error:', error);
    res.status(500).json({ error: 'Failed to list connections' });
  }
});

// GET /api/business/whatsapp/connections/:id/health
router.get('/whatsapp/connections/:id/health', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const businessId = biz.id as string;
    const connectionId = req.params.id as string;

    const connection = await prisma.dualhookConnection.findFirst({
      where: { id: connectionId, businessId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const health = await getConnectionHealth(connection.connectionId);
    res.json(health);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    console.error('Get health error:', error);
    res.status(500).json({ error: 'Failed to get health' });
  }
});

// POST /api/business/whatsapp/connections/:id/health/refresh
router.post('/whatsapp/connections/:id/health/refresh', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const businessId = biz.id as string;
    const connectionId = req.params.id as string;

    const connection = await prisma.dualhookConnection.findFirst({
      where: { id: connectionId, businessId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const result = await refreshConnectionHealth(connection.connectionId);
    res.json(result);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    console.error('Refresh health error:', error);
    res.status(500).json({ error: 'Failed to refresh health' });
  }
});

// POST /api/business/whatsapp/connections/:id/heartbeat/confirm
router.post('/whatsapp/connections/:id/heartbeat/confirm', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const businessId = biz.id as string;
    const connectionId = req.params.id as string;

    const connection = await prisma.dualhookConnection.findFirst({
      where: { id: connectionId, businessId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const result = await confirmHeartbeat(connection.connectionId);

    // Update local heartbeat state
    await prisma.dualhookConnection.update({
      where: { id: connection.id },
      data: {
        heartbeatStatus: result.heartbeatStatus,
        heartbeatLastConfirmedAt: new Date(result.heartbeatLastConfirmedAt),
        heartbeatNextDueAt: new Date(result.heartbeatNextDueAt),
      },
    });

    res.json(result);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    console.error('Confirm heartbeat error:', error);
    res.status(500).json({ error: 'Failed to confirm heartbeat' });
  }
});

// DELETE /api/business/whatsapp/connections/:id - Disconnect a WhatsApp connection
router.delete('/whatsapp/connections/:id', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const businessId = biz.id as string;
    const connectionId = req.params.id as string;

    const connection = await prisma.dualhookConnection.findFirst({
      where: { id: connectionId, businessId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const result = await disconnectConnection(connection.connectionId);

    await prisma.dualhookConnection.update({
      where: { id: connection.id },
      data: { status: 'disconnected' },
    });

    await prisma.business.update({
      where: { id: businessId },
      data: { whatsappAccessToken: null, whatsappPhoneNumberId: null },
    });

    res.json(result);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// PATCH /api/business/whatsapp/connections/:id/webhook - Update webhook URL (WABA-scoped fan-out)
router.patch('/whatsapp/connections/:id/webhook', async (req: Request, res: Response) => {
  try {
    const biz = (req as any).business;
    if (!biz) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    const businessId = biz.id as string;
    const connectionId = req.params.id as string;

    const { webhookUrl, webhookVerifyToken } = req.body;
    if (!webhookUrl || !webhookVerifyToken) {
      return res.status(400).json({ error: 'webhookUrl and webhookVerifyToken are required' });
    }

    const connection = await prisma.dualhookConnection.findFirst({
      where: { id: connectionId, businessId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const result = await updateWebhook(connection.connectionId, webhookUrl, webhookVerifyToken);

    // Update local cache for all affected connections
    for (const affectedId of (result.affectedConnectionIds as string[])) {
      await prisma.dualhookConnection.updateMany({
        where: { connectionId: affectedId, businessId },
        data: { webhookUrl, webhookVerifyToken },
      });
    }

    res.json(result);
  } catch (error) {
    if (error instanceof DualhookApiError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    console.error('Update webhook error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

export default router;
