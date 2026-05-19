import { prisma as globalPrisma } from '../lib/prisma.js';
import type { PrismaClient } from '@prisma/client';

let prisma: PrismaClient = globalPrisma;

export function setPrisma(client: PrismaClient) {
  prisma = client;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function getManagerHistory(
  managerId: string,
  sessionId: string,
  limit?: number
): Promise<{ role: string; content: string }[]> {
  return prisma.managerMessage.findMany({
    where: { managerId, sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { role: true, content: true },
  });
}

export async function saveManagerMessage(
  managerId: string,
  sessionId: string,
  role: string,
  content: string
): Promise<void> {
  await prisma.managerMessage.create({
    data: { managerId, sessionId, role, content },
  });
}

export async function getOrCreateManagerSession(
  managerId: string
): Promise<{ sessionId: string; isNew: boolean }> {
  const last = await prisma.managerMessage.findFirst({
    where: { managerId },
    orderBy: { createdAt: 'desc' },
    select: { sessionId: true, createdAt: true },
  });

  const expired =
    !last ||
    Date.now() - new Date(last.createdAt).getTime() > SESSION_TIMEOUT_MS;

  if (expired) {
    return { sessionId: `manager_${Date.now()}`, isNew: true };
  }

  return { sessionId: last.sessionId, isNew: false };
}
