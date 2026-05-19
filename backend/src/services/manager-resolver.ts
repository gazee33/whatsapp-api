import { prisma } from '../lib/prisma.js';
import type { Manager } from '@prisma/client';

export async function getManagerByPhone(businessId: string, phone: string): Promise<Manager | null> {
  return prisma.manager.findUnique({
    where: { businessId_phone: { businessId, phone } },
  });
}

export async function isManagerPhone(businessId: string, phone: string): Promise<boolean> {
  const manager = await getManagerByPhone(businessId, phone);
  return manager !== null;
}
