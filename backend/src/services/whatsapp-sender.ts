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

interface SendInteractiveListParams {
  business: Pick<Business, 'id' | 'whatsappAccessToken'>;
  phoneNumberId: string;
  to: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

interface SendInteractiveButtonParams {
  business: Pick<Business, 'id' | 'whatsappAccessToken'>;
  phoneNumberId: string;
  to: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: Array<{ id: string; title: string }>;
}

interface SendTemplateParams {
  business: Pick<Business, 'id' | 'whatsappAccessToken'>;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

interface TemplateComponent {
  type: 'header' | 'body' | 'footer' | 'buttons';
  format?: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: { id: string };
  video?: { id: string };
  document?: { id: string; filename?: string };
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string; timestamp?: number };
  }>;
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone_number';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  sub_type?: string;
  index?: string;
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

export async function sendWhatsAppText(params: SendReplyParams): Promise<{ messageId?: string } | void> {
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
    console.log(`[WhatsApp] Text message sent to ${to}, id: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('[WhatsApp] Failed to send text message:', (error as Error).message);
    await logError({
      businessId: business.id,
      customerId: undefined,
      errorType: 'WhatsAppSendError',
      errorMessage: (error as Error).message,
      context: { phoneNumberId, to, body: body.substring(0, 200) },
    });
  }
}

export async function sendWhatsAppInteractiveList(params: SendInteractiveListParams): Promise<{ messageId?: string } | void> {
  const { business, phoneNumberId, to, headerText, bodyText, footerText, buttonText, sections } = params;

  if (!business.whatsappAccessToken) {
    console.warn(`[WhatsApp] Business ${business.id} has no WhatsApp access token configured, skipping send`);
    return;
  }

  const interactive: Record<string, unknown> = {
    type: 'list',
    header: headerText ? { type: 'text', text: headerText } : undefined,
    body: { text: bodyText },
    footer: footerText ? { text: footerText } : undefined,
    action: {
      button: buttonText,
      sections,
    },
  };

  try {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${business.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    console.log(`[WhatsApp] Interactive list sent to ${to}, id: ${data.messages?.[0]?.id}`);
    return { messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[WhatsApp] Failed to send interactive list:', (error as Error).message);
    await logError({
      businessId: business.id,
      customerId: undefined,
      errorType: 'WhatsAppInteractiveSendError',
      errorMessage: (error as Error).message,
      context: { phoneNumberId, to, type: 'interactive_list' },
    });
  }
}

export async function sendWhatsAppInteractiveButton(params: SendInteractiveButtonParams): Promise<{ messageId?: string } | void> {
  const { business, phoneNumberId, to, headerText, bodyText, footerText, buttons } = params;

  if (!business.whatsappAccessToken) {
    console.warn(`[WhatsApp] Business ${business.id} has no WhatsApp access token configured, skipping send`);
    return;
  }

  const interactive: Record<string, unknown> = {
    type: 'button',
    header: headerText ? { type: 'text', text: headerText } : undefined,
    body: { text: bodyText },
    footer: footerText ? { text: footerText } : undefined,
    action: {
      buttons: buttons.map((btn) => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title,
        },
      })),
    },
  };

  try {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${business.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    console.log(`[WhatsApp] Interactive button sent to ${to}, id: ${data.messages?.[0]?.id}`);
    return { messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[WhatsApp] Failed to send interactive button:', (error as Error).message);
    await logError({
      businessId: business.id,
      customerId: undefined,
      errorType: 'WhatsAppInteractiveSendError',
      errorMessage: (error as Error).message,
      context: { phoneNumberId, to, type: 'interactive_button' },
    });
  }
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<{ messageId?: string } | void> {
  const { business, phoneNumberId, to, templateName, languageCode, components } = params;

  if (!business.whatsappAccessToken) {
    console.warn(`[WhatsApp] Business ${business.id} has no WhatsApp access token configured, skipping send`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${business.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components && { components }),
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json() as { messages?: Array<{ id: string }> };
    console.log(`[WhatsApp] Template message sent to ${to}, template: ${templateName}, id: ${data.messages?.[0]?.id}`);
    return { messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[WhatsApp] Failed to send template:', (error as Error).message);
    await logError({
      businessId: business.id,
      customerId: undefined,
      errorType: 'WhatsAppTemplateSendError',
      errorMessage: (error as Error).message,
      context: { phoneNumberId, to, templateName },
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