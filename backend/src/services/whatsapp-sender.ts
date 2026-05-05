import { logError } from './error-log.js';
import type { Business } from '@prisma/client';

interface SendTextParams {
  phoneNumberId: string;
  to: string;
  body: string;
  accessToken: string;
}

interface SendReplyParams {
  business: Pick<Business, 'id' | 'whatsappAccessToken'>;
  phoneNumberId: string;
  to: string;
  body: string;
}

async function sendText(params: SendTextParams): Promise<{ messageId?: string }> {
  const url = `https://graph.facebook.com/v22.0/${params.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'text',
      text: { body: params.body },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json() as { messages?: Array<{ id: string }> };
  return { messageId: data.messages?.[0]?.id };
}

export async function sendWhatsAppText(params: SendReplyParams): Promise<void> {
  const { business, phoneNumberId, to, body } = params;

  if (!business.whatsappAccessToken) {
    console.warn(`[WhatsApp] Business ${business.id} has no WhatsApp access token configured, skipping send`);
    return;
  }

  try {
    const result = await sendText({
      phoneNumberId,
      to,
      body,
      accessToken: business.whatsappAccessToken,
    });
    console.log(`[WhatsApp] Message sent to ${to}, id: ${result.messageId}`);
  } catch (error) {
    console.error('[WhatsApp] Failed to send message:', (error as Error).message);
    await logError({
      businessId: business.id,
      customerId: undefined as any,
      errorType: 'WhatsAppSendError',
      errorMessage: (error as Error).message,
      context: { phoneNumberId, to, body: body.substring(0, 200) },
    });
  }
}

export async function sendTypingIndicator(
  business: Pick<Business, 'id' | 'whatsappAccessToken'>,
  phoneNumberId: string,
  to: string,
  messageId: string
): Promise<void> {
  if (!business.whatsappAccessToken || !messageId) {
    return;
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${business.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: {
          type: 'text',
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[TypingIndicator] Failed to send:', response.status, error);
    }
  } catch (error) {
    console.warn('[TypingIndicator] Error:', (error as Error).message);
  }
}
