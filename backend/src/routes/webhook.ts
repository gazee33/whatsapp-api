import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { processMessage } from '../services/ai-agent.js';
import { sendWhatsAppText, sendTypingIndicator } from '../services/whatsapp-sender.js';
import { getIO } from '../socket.js';
import { logError } from '../services/error-log.js';

const router = Router();

function verifyWebhookSignature(req: Request, appSecret: string): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    console.warn('[Webhook] No x-hub-signature-256 header — rejecting');
    return false;
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    console.error('[Webhook] rawBody not available — cannot verify signature');
    return false;
  }

  const hmac = crypto.createHmac('sha256', appSecret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function isOnboardingComplete(business: any): boolean {
  return !!(
    business.whatsappPhoneNumberId &&
    business.whatsappAccessToken
  );
}

// Meta webhook verification (GET)
// Each tenant's Meta app sends its own hub.verify_token
// We match against whatsappVerifyToken on their Business record
router.get('/', async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode !== 'subscribe' || !token) {
    return res.sendStatus(403);
  }

  const businesses = await prisma.business.findMany({
    where: { whatsappVerifyToken: { not: null } },
    select: { id: true, whatsappVerifyToken: true },
  });

  const matched = businesses.find(
    (b) => b.whatsappVerifyToken && safeEqual(b.whatsappVerifyToken, token)
  );

  if (matched) {
    console.log(`[Webhook] GET verified for business ${matched.id}`);
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] GET verification failed — no matching verify_token');
    res.sendStatus(403);
  }
});

// Handle incoming messages (POST)
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  console.log(`[Webhook] POST received at ${now}`);
  console.log(`[Webhook] Headers:`, JSON.stringify(req.headers));
  console.log(`[Webhook] Body keys:`, Object.keys(req.body));

  // Support x-api-key header for simulator requests (skips WhatsApp-specific logic)
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const isSimulator = !!apiKey;

  try {
    const { entry } = req.body;
    console.log(`[Webhook] entry[0]?.id: ${entry?.[0]?.id}`);
    console.log(`[Webhook] changes: ${JSON.stringify(entry?.[0]?.changes)}`.slice(0, 300));

    if (!entry || !entry[0]?.changes?.[0]?.value) {
      console.warn('[Webhook] Invalid payload structure');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const changes = entry[0].changes[0].value;
    console.log(`[Webhook] phone_number_id: ${changes.metadata?.phone_number_id}`);
    console.log(`[Webhook] messages count: ${changes.messages?.length}`);

    const messages = changes.messages;
    console.log(`[Webhook] message extracted, from: ${messages?.[0]?.from}, text: ${messages?.[0]?.text?.body}`.slice(0, 200));

    if (!messages || messages.length === 0) {
      console.log('[Webhook] No messages, returning 200');
      return res.sendStatus(200);
    }

    const message = messages[0];
    const phoneNumberId = changes.metadata?.phone_number_id;
    const from = message.from;
    const text = message.text?.body || '';

    // Extract contact name from the contacts array (not from message object)
    const contacts = changes.contacts || [];
    const contact = contacts.find((c: any) => c.wa_id === from);
    const name = contact?.profile?.name || 'Customer';

    if (!text) {
      return res.sendStatus(200);
    }

    // Find business by API key (simulator) or phone_number_id (real webhook)
    let business;
    let isDualhook = false;
    if (isSimulator) {
      business = await prisma.business.findUnique({
        where: { apiKey },
        include: { settings: true },
      });
    } else {
      if (!phoneNumberId) {
        return res.status(400).json({ error: 'Missing phone_number_id in payload' });
      }

      // Look up by phone_number_id: check Business first, then DualhookConnection
      business = await prisma.business.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId },
        include: { settings: true },
      });

      if (business) {
        // Check if this is a DualHook-managed connection
        const dhConn = await prisma.dualhookConnection.findUnique({
          where: { phoneNumberId },
        });
        if (dhConn && dhConn.status === 'active') {
          isDualhook = true;
          // Ensure access token is populated (may have been missed during onboarding)
          if (!business.whatsappAccessToken) {
            try {
              const { revealSecrets } = await import('../services/dualhook-client.js');
              const secrets = await revealSecrets(dhConn.connectionId);
              await prisma.business.update({
                where: { id: business.id },
                data: { whatsappAccessToken: secrets.secrets.access_token },
              });
              business.whatsappAccessToken = secrets.secrets.access_token;
            } catch {
              // continue with whatever we have
            }
          }
        }
      } else {
        // Fallback: check DualhookConnection for this phone number
        const conn = await prisma.dualhookConnection.findUnique({
          where: { phoneNumberId },
          include: { business: { include: { settings: true } } },
        });
        if (conn) {
          isDualhook = true;
          business = conn.business;
          if (!business.whatsappAccessToken && conn.status === 'active') {
            try {
              const { revealSecrets } = await import('../services/dualhook-client.js');
              const secrets = await revealSecrets(conn.connectionId);
              await prisma.business.update({
                where: { id: business.id },
                data: { whatsappAccessToken: secrets.secrets.access_token },
              });
              business.whatsappAccessToken = secrets.secrets.access_token;
            } catch {
              // continue with whatever we have
            }
          }
        }
      }

      console.log(`[Webhook] Business lookup by phone_number_id="${phoneNumberId}": ${business ? `found ${business.name} (${business.id})` : 'NOT FOUND'}${isDualhook ? ' [DualHook]' : ''}`);
    }

    if (!business) {
      console.warn('[Webhook] Business not found for this phone_number_id — returning 200 for Meta subscription compatibility');
      return res.status(200).json({ ok: true, note: 'Business not configured for this phone_number_id' });
    }

    // Verify signature using this tenant's app secret (skip for simulator and DualHook connections)
    if (!isSimulator && !isDualhook) {
      if (!business.whatsappAppSecret) {
        console.warn(`[Webhook] Business ${business.id} has no app secret configured — rejecting`);
        return res.status(403).json({ error: 'App secret not configured' });
      }
      if (!verifyWebhookSignature(req, business.whatsappAppSecret)) {
        console.warn(`[Webhook] Signature verification FAILED for business ${business.id}`);
        return res.status(403).json({ error: 'Invalid signature' });
      }
      console.log(`[Webhook] Signature verified OK for business ${business.id}`);
    } else if (isDualhook) {
      console.log(`[Webhook] Signature verification skipped (DualHook connection)`);
    }

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: {
        businessId_phone: {
          businessId: business.id,
          phone: from,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          phone: from,
          name: name,
        },
      });
      console.log(`[Webhook] New customer created: ${customer.id}`);
    } else {
      console.log(`[Webhook] Existing customer: ${customer.id}`);
    }

    const onboardingOK = isOnboardingComplete(business);
    console.log(`[Webhook] Onboarding complete: ${onboardingOK} (hasPhoneId=${!!business.whatsappPhoneNumberId}, hasToken=${!!business.whatsappAccessToken})`);

    // Send typing indicator to customer (only if onboarding is complete)
    if (onboardingOK) {
      await sendTypingIndicator(business, phoneNumberId, from, message.id);
    }

    // Process message with AI agent
    let reply: string;
    let sessionId: string | undefined;
    try {
      const lastMsg = await prisma.message.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
      });
      sessionId = lastMsg?.sessionId;

      console.log(`[Webhook] Calling AI agent for customer ${customer.id}...`);
      reply = await processMessage(business, customer, text);
      console.log(`[Webhook] AI reply: ${reply.substring(0, 100)}`);
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('rate limit');
      console.error(`[Webhook] AI agent error: ${error?.message}`);

      await logError({
        businessId: business.id,
        customerId: customer.id,
        sessionId,
        errorType: error?.constructor?.name || 'Error',
        errorMessage: error?.message || 'Unknown error',
        errorStack: error?.stack,
        context: {
          phoneNumberId,
          from,
          text,
          isRateLimit,
        },
      });

      if (isRateLimit) {
        reply = "I'm currently experiencing high demand. Please try again in a moment, or call us directly to place your order.";
      } else {
        reply = "I apologize, but I could not process your request at this time. Please try again.";
      }
    }

    // Send the reply back to WhatsApp (only if onboarding is complete)
    console.log(`[Webhook] Sending WhatsApp reply to ${from} (onboardingComplete=${onboardingOK})`);
    if (onboardingOK) {
      await sendWhatsAppText({
        business,
        phoneNumberId,
        to: from,
        body: reply,
      });
      console.log(`[Webhook] WhatsApp send completed for customer ${customer.id}`);
    } else {
      console.warn(`[Webhook] Reply NOT sent — onboarding incomplete`);
    }

    // Emit socket event for real-time updates
    const io = getIO();
    if (io) {
      io.to(`business:${business.id}`).emit('new-message', {
        customerId: customer.id,
        customerPhone: from,
        customerName: name,
        message: text,
        reply: reply,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ reply, onboardingComplete: onboardingOK });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
