import { prisma } from '../lib/prisma.js';
import { getWhatsAppCredentials } from '../services/whatsapp-helpers.js';
import { sendWhatsAppInteractiveList, sendWhatsAppText } from '../services/whatsapp-sender.js';

interface ToolParams {
  businessId: string;
  customerId: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

const MAX_INTERACTIVE_ROWS = 10;

export async function sendInteractiveList(params: ToolParams) {
  const { businessId, customerId, headerText, bodyText, footerText, buttonText, sections } = params;

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

  const totalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);

  if (totalRows > MAX_INTERACTIVE_ROWS) {
    const lines: string[] = [];
    if (headerText) lines.push(`*${headerText}*`);
    lines.push(bodyText);
    lines.push('');

    for (const section of sections) {
      lines.push(`_${section.title}_`);
      for (const row of section.rows) {
        const descSuffix = row.description ? ` — ${row.description}` : '';
        lines.push(`• ${row.title}${descSuffix}`);
      }
      lines.push('');
    }

    if (footerText) lines.push(footerText);

    const textBody = lines.join('\n').trim();

    const result = await sendWhatsAppText({
      business: customer.business,
      phoneNumberId: creds.phoneNumberId,
      to: customer.phone,
      body: textBody,
    });

    if (result?.messageId) {
      return {
        success: true,
        messageId: result.messageId,
        note: `Sent as text message (${totalRows} rows exceeds WhatsApp's ${MAX_INTERACTIVE_ROWS}-row interactive list limit)`,
      };
    }
    return { success: false, error: 'Failed to send text fallback message' };
  }

  const result = await sendWhatsAppInteractiveList({
    business: customer.business,
    phoneNumberId: creds.phoneNumberId,
    to: customer.phone,
    headerText,
    bodyText,
    footerText,
    buttonText,
    sections,
  });

  if (result?.messageId) {
    return { success: true, messageId: result.messageId };
  }
  return { success: false, error: 'Failed to send message' };
}