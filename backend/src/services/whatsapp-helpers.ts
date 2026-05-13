import { prisma } from '../lib/prisma.js';

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export async function getWhatsAppCredentials(businessId: string): Promise<WhatsAppCredentials | null> {
  const conn = await prisma.dualhookConnection.findFirst({
    where: { businessId, status: 'active' },
  });

  if (conn?.phoneNumberId) {
    try {
      const { revealSecrets } = await import('./dualhook-client.js');
      if (!conn.heartbeatStatus?.includes('OVERDUE')) {
        const secrets = await revealSecrets(conn.connectionId);
        return {
          phoneNumberId: conn.phoneNumberId,
          accessToken: secrets.secrets.access_token,
        };
      }
    } catch {
      // fallback
    }
  }

  const biz = await prisma.business.findUnique({ where: { id: businessId } });
  if (biz?.whatsappPhoneNumberId && biz?.whatsappAccessToken) {
    return {
      phoneNumberId: biz.whatsappPhoneNumberId,
      accessToken: biz.whatsappAccessToken,
    };
  }

  return null;
}