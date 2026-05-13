import { prisma } from '../lib/prisma.js';
import { getWhatsAppCredentials } from '../services/whatsapp-helpers.js';
import { sendWhatsAppInteractiveButton } from '../services/whatsapp-sender.js';

interface ToolParams {
  businessId: string;
  customerId: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: Array<{ id: string; title: string }>;
}

export async function sendInteractiveButton(params: ToolParams) {
  const { businessId, customerId, headerText, bodyText, footerText, buttons } = params;

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

  const result = await sendWhatsAppInteractiveButton({
    business: customer.business,
    phoneNumberId: creds.phoneNumberId,
    to: customer.phone,
    headerText,
    bodyText,
    footerText,
    buttons,
  });

  if (result?.messageId) {
    return { success: true, messageId: result.messageId };
  }
  return { success: false, error: 'Failed to send message' };
}