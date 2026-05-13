import { prisma } from '../lib/prisma.js';
import { getWhatsAppCredentials } from '../services/whatsapp-helpers.js';
import { sendWhatsAppTemplate } from '../services/whatsapp-sender.js';

interface ToolParams {
  businessId: string;
  customerId: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: 'header' | 'body' | 'footer' | 'buttons';
    parameters?: Array<{ type: 'text'; text: string }>;
  }>;
}

export async function sendTemplateMessage(params: ToolParams) {
  const { businessId, customerId, templateName, languageCode = 'en_US', components } = params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    include: { business: true },
  });

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  const creds = await getWhatsAppCredentials(businessId);
  if (!creds) {
    return { success: false, error: 'WhatsApp not configured for this business' };
  }

  const result = await sendWhatsAppTemplate({
    business: customer.business,
    phoneNumberId: creds.phoneNumberId,
    to: customer.phone,
    templateName,
    languageCode,
    components,
  });

  if (result?.messageId) {
    return { success: true, messageId: result.messageId };
  }
  return { success: false, error: 'Failed to send template message' };
}