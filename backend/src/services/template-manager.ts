import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { revealSecrets } from './dualhook-client.js';

const META_GRAPH_VERSION = 'v22.0';

interface WabaCredentials {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
}

async function getWabaCredentials(businessId: string): Promise<WabaCredentials | null> {
  const conn = await prisma.dualhookConnection.findFirst({
    where: { businessId, status: 'active' },
  });

  if (conn?.wabaId && conn?.phoneNumberId) {
    if (!conn.heartbeatStatus?.includes('OVERDUE')) {
      try {
        const secrets = await revealSecrets(conn.connectionId);
        return {
          wabaId: conn.wabaId,
          phoneNumberId: conn.phoneNumberId,
          accessToken: secrets.secrets.access_token,
        };
      } catch {
        // fallback to business token
      }
    }
  }

  const biz = await prisma.business.findUnique({ where: { id: businessId } });
  if (biz?.whatsappPhoneNumberId && biz?.whatsappAccessToken) {
    return {
      wabaId: biz.whatsappPhoneNumberId,
      phoneNumberId: biz.whatsappPhoneNumberId,
      accessToken: biz.whatsappAccessToken,
    };
  }

  return null;
}

export interface CreateTemplateInput {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponentInput[];
}

export interface TemplateComponentInput {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: Record<string, unknown>;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

function buildComponents(input: CreateTemplateInput) {
  const components: any[] = [];

  for (const comp of input.components) {
    const c: any = { type: comp.type };

    if (comp.type === 'HEADER') {
      c.format = comp.format || 'TEXT';
      if (comp.format === 'TEXT' && comp.text) {
        c.text = comp.text;
        if (comp.example?.header_text) {
          c.example = { header_text: Array.isArray(comp.example.header_text) ? comp.example.header_text : [comp.example.header_text] };
        }
      }
    } else if (comp.type === 'BODY') {
      c.text = comp.text || '';
      if (comp.example?.body_text) {
        const bt = comp.example.body_text;
        c.example = {
          body_text: Array.isArray(bt) ? bt : [bt],
        };
      }
    } else if (comp.type === 'FOOTER') {
      c.text = comp.text || '';
    } else if (comp.type === 'BUTTONS') {
      c.buttons = (comp.buttons || []).map((b: any) => ({
        type: b.type,
        text: b.text,
        ...(b.url && { url: b.url }),
        ...(b.phone_number && { phone_number: b.phone_number }),
      }));
    }

    components.push(c);
  }

  return components;
}

export async function createTemplate(businessId: string, input: CreateTemplateInput): Promise<{ id: string; name: string; status: string }> {
  const creds = await getWabaCredentials(businessId);
  if (!creds) throw new Error('No WhatsApp credentials found for this business');

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.wabaId}/message_templates`;

  const body = {
    name: input.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    category: input.category,
    language: input.language,
    allow_category_change: true,
    components: buildComponents(input),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(`Meta API error ${response.status}: ${JSON.stringify(err.error || err)}`);
  }

  const data = await response.json() as any;

  const template = await prisma.whatsAppTemplate.create({
    data: {
      businessId,
      metaTemplateId: data.id?.toString(),
      name: input.name,
      category: input.category,
      language: input.language,
      status: 'PENDING',
      components: JSON.stringify(input.components),
    },
  });

  return { id: template.id, name: template.name, status: template.status };
}

export async function listTemplates(businessId: string, status?: string) {
  const localTemplates = await prisma.whatsAppTemplate.findMany({
    where: { businessId, ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  });

  const creds = await getWabaCredentials(businessId);
  if (!creds) return localTemplates;

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.wabaId}/message_templates?limit=50${status ? `&status=${status}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
    });

    if (response.ok) {
      const data = await response.json() as any;
      const metaTemplates = data.data || [];

      for (const mt of metaTemplates) {
        await prisma.whatsAppTemplate.upsert({
          where: { businessId_name: { businessId, name: mt.name } },
          update: {
            metaTemplateId: mt.id,
            status: mt.status,
          },
          create: {
            businessId,
            metaTemplateId: mt.id,
            name: mt.name,
            category: mt.category,
            language: mt.language || 'en_US',
            status: mt.status || 'PENDING',
            components: JSON.stringify(mt.components || []),
          },
        });
      }

      return await prisma.whatsAppTemplate.findMany({
        where: { businessId, ...(status && { status }) },
        orderBy: { createdAt: 'desc' },
      });
    }
  } catch (error) {
    console.warn('[TemplateManager] Failed to sync with Meta:', (error as Error).message);
  }

  return localTemplates;
}

export async function getTemplate(businessId: string, templateId: string) {
  return prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, businessId },
  });
}

export async function deleteTemplate(businessId: string, templateId: string) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: { id: templateId, businessId },
  });

  if (!template) throw new Error('Template not found');

  if (template.metaTemplateId) {
    const creds = await getWabaCredentials(businessId);
    if (creds) {
      try {
        const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${creds.wabaId}/message_templates/${template.metaTemplateId}`;
        await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        });
      } catch (error) {
        console.warn('[TemplateManager] Failed to delete from Meta:', (error as Error).message);
      }
    }
  }

  return prisma.whatsAppTemplate.delete({ where: { id: templateId } });
}