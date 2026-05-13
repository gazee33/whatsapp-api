import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { revealSecrets, getConnection } from '../services/dualhook-client.js';
import { getIO } from '../socket.js';

const router = Router();

// ─── Signature Verification ──────────────────────────────────────────────────

function verifySignature(rawBody: Buffer, signatureHeader: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', config.dualhookSigningSecret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);

  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Event Handling ──────────────────────────────────────────────────────────

async function handleOnboardingCompleted(data: Record<string, unknown>) {
  const tenantId = data.tenantId as string | undefined;
  const connectionId = data.connectionId as string | undefined;
  const wabaId = data.wabaId as string | undefined;
  const phoneNumberId = data.phoneNumberId as string | undefined;

  if (!tenantId || !connectionId || !phoneNumberId || !wabaId) {
    console.error('[DualhookEvent] Missing fields in onboarding.completed:', Object.keys(data));
    return;
  }

  const business = await prisma.business.findFirst({
    where: { id: tenantId },
  });

  if (!business) {
    console.error(`[DualhookEvent] Business not found for tenantId: ${tenantId}`);
    return;
  }

  // Verify the connection belongs to this tenant by calling DualHook API
  try {
    const connData = await getConnection(connectionId);
    if (connData.tenantId !== tenantId) {
      console.error(`[DualhookEvent] Connection ${connectionId} belongs to tenant ${connData.tenantId}, not ${tenantId}`);
      return;
    }
  } catch (error) {
    console.error(`[DualhookEvent] Failed to verify connection ${connectionId}:`, (error as Error).message);
    return;
  }

  // Fetch the access token from DualHook
  let accessToken: string | undefined;
  try {
    const secrets = await revealSecrets(connectionId);
    accessToken = secrets.secrets.access_token;
  } catch (error) {
    console.error(`[DualhookEvent] Failed to reveal secrets for ${connectionId}:`, (error as Error).message);
    return;
  }

  // Clear any disconnected connection holding the same phoneNumberId
  await prisma.dualhookConnection.updateMany({
    where: { phoneNumberId, status: 'disconnected' },
    data: { phoneNumberId: null },
  });

  // Upsert DualhookConnection
  await prisma.dualhookConnection.upsert({
    where: { connectionId },
    create: {
      businessId: business.id,
      connectionId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber as string,
      verifiedName: data.verifiedName as string,
      status: 'active',
      connectionMode: data.connectionMode as string,
      heartbeatStatus: data.heartbeatStatus as string,
      heartbeatLastConfirmedAt: data.heartbeatLastConfirmedAt ? new Date(data.heartbeatLastConfirmedAt as string) : null,
      heartbeatNextDueAt: data.heartbeatNextDueAt ? new Date(data.heartbeatNextDueAt as string) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
    update: {
      wabaId,
      phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber as string,
      verifiedName: data.verifiedName as string,
      status: 'active',
      connectionMode: data.connectionMode as string,
      heartbeatStatus: data.heartbeatStatus as string,
      heartbeatLastConfirmedAt: data.heartbeatLastConfirmedAt ? new Date(data.heartbeatLastConfirmedAt as string) : null,
      heartbeatNextDueAt: data.heartbeatNextDueAt ? new Date(data.heartbeatNextDueAt as string) : null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });

  // Auto-populate Business WhatsApp fields
  await prisma.business.update({
    where: { id: business.id },
    data: {
      whatsappPhoneNumberId: phoneNumberId,
      whatsappAccessToken: accessToken,
    },
  });

  const io = getIO();
  if (io) {
    io.to(`business:${business.id}`).emit('whatsapp-connected', {
      connectionId,
      phoneNumberId,
      displayPhoneNumber: data.displayPhoneNumber,
      verifiedName: data.verifiedName,
    });
  }

  console.log(`[DualhookEvent] Onboarding completed for business ${business.id}, connection ${connectionId}`);
}

async function handleConnectionDisconnected(data: Record<string, unknown>) {
  const connectionId = data.connectionId as string | undefined;
  if (!connectionId) return;

  const connection = await prisma.dualhookConnection.findUnique({
    where: { connectionId },
  });

  if (!connection) {
    console.warn(`[DualhookEvent] Connection not found: ${connectionId}`);
    return;
  }

  await prisma.dualhookConnection.update({
    where: { connectionId },
    data: { status: 'disconnected', phoneNumberId: null },
  });

  // Clear the access token so messages stop sending
  await prisma.business.update({
    where: { id: connection.businessId },
    data: { whatsappAccessToken: null, whatsappPhoneNumberId: null },
  });

  const io = getIO();
  if (io) {
    io.to(`business:${connection.businessId}`).emit('whatsapp-disconnected', {
      connectionId,
      reason: data.reason,
    });
  }

  console.log(`[DualhookEvent] Connection disconnected: ${connectionId}`);
}

async function handleHeartbeatEvent(
  event: string,
  data: Record<string, unknown>
) {
  const connectionId = data.connectionId as string | undefined;
  if (!connectionId) return;

  const heartbeatStatus = data.heartbeatStatus as string;
  const lastConfirmed = data.heartbeatLastConfirmedAt as string | undefined;
  const nextDue = data.heartbeatNextDueAt as string | undefined;

  await prisma.dualhookConnection.update({
    where: { connectionId },
    data: {
      heartbeatStatus,
      heartbeatLastConfirmedAt: lastConfirmed ? new Date(lastConfirmed) : null,
      heartbeatNextDueAt: nextDue ? new Date(nextDue) : null,
    },
  });

  const connection = await prisma.dualhookConnection.findUnique({
    where: { connectionId },
  });

  if (connection) {
    const io = getIO();
    if (io) {
      io.to(`business:${connection.businessId}`).emit('heartbeat-update', {
        connectionId,
        heartbeatStatus,
        heartbeatLastConfirmedAt: lastConfirmed,
        heartbeatNextDueAt: nextDue,
      });
    }
  }

  console.log(`[DualhookEvent] Heartbeat ${event} for ${connectionId}: ${heartbeatStatus}`);
}

async function handleTemplateStatusUpdate(data: Record<string, unknown>) {
  const wabaId = data.wabaId as string | undefined;
  const templateId = data.templateId as string | undefined;
  const templateName = data.templateName as string | undefined;
  const event = data.event as string | undefined;

  if (!wabaId || !templateName) {
    console.warn('[DualhookEvent] Missing wabaId or templateName in template status update');
    return;
  }

  const statusMap: Record<string, string> = {
    'template_submitted': 'PENDING',
    'template_approved': 'APPROVED',
    'template_rejected': 'REJECTED',
    'template_disabled': 'DISABLED',
    'template_flagged': 'FLAGGED',
    'template_in_appeal': 'IN_APPEAL',
  };

  const newStatus = event ? (statusMap[event] || 'PENDING') : 'PENDING';

  if (templateId) {
    await prisma.whatsAppTemplate.updateMany({
      where: { metaTemplateId: templateId },
      data: { status: newStatus },
    });
  } else if (templateName) {
    const conn = await prisma.dualhookConnection.findFirst({
      where: { wabaId },
    });
    if (conn) {
      await prisma.whatsAppTemplate.updateMany({
        where: { businessId: conn.businessId, name: templateName },
        data: { status: newStatus },
      });
    }
  }

  console.log(`[DualhookEvent] Template status update: ${templateName} -> ${newStatus}`);
}

async function handleTemplateQualityUpdate(data: Record<string, unknown>) {
  const templateName = data.templateName as string | undefined;
  const qualityScore = data.qualityScore as string | undefined;
  console.log(`[DualhookEvent] Template quality update: ${templateName}, score: ${qualityScore}`);
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  if (!config.dualhookSigningSecret) {
    console.error('[DualhookEvent] No signing secret configured — rejecting all events');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const signature = req.headers['x-dualhook-signature'] as string;
  if (!signature) {
    console.warn('[DualhookEvent] Missing X-Dualhook-Signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    console.warn('[DualhookEvent] No raw body available for signature verification');
    return res.status(400).json({ error: 'Raw body required' });
  }

  if (!verifySignature(rawBody, signature)) {
    console.warn('[DualhookEvent] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Respond 200 quickly — DualHook retries on non-2xx
  res.sendStatus(200);

  // Process asynchronously
  const event = req.body.event as string;
  const data = req.body.data as Record<string, unknown> | undefined;

  if (!event || !data) {
    console.warn('[DualhookEvent] Missing event or data in payload');
    return;
  }

  console.log(`[DualhookEvent] Received event: ${event}, id: ${req.body.id}`);

  try {
    switch (event) {
      case 'onboarding.completed':
        await handleOnboardingCompleted(data);
        break;
      case 'onboarding.started':
        console.log(`[DualhookEvent] Onboarding started for session: ${data.sessionId}`);
        break;
      case 'onboarding.failed':
        console.log(`[DualhookEvent] Onboarding failed for session: ${data.sessionId}, reason: ${data.reason}`);
        break;
      case 'connection.disconnected':
        await handleConnectionDisconnected(data);
        break;
      case 'connection.heartbeat.due_soon':
      case 'connection.heartbeat.overdue':
      case 'connection.heartbeat.confirmed':
        await handleHeartbeatEvent(event, data);
        break;
      case 'message_template_status_update':
        await handleTemplateStatusUpdate(data);
        break;
      case 'message_template_quality_update':
        await handleTemplateQualityUpdate(data);
        break;
      default:
        console.log(`[DualhookEvent] Unhandled event type: ${event}`);
    }
  } catch (error) {
    console.error(`[DualhookEvent] Error processing event ${event}:`, (error as Error).message);
  }
});

export default router;
