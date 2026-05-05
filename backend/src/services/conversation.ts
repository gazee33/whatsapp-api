import { prisma as globalPrisma } from '../lib/prisma.js';
import type { PrismaClient } from '@prisma/client';

let prisma: PrismaClient = globalPrisma;

export function setPrisma(client: PrismaClient) {
  prisma = client;
}

export async function getHistory(
  customerId: string,
  sessionId: string,
  limit?: number
): Promise<any[]> {
  return prisma.message.findMany({
    where: { customerId, sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

export async function saveMessage(
  customerId: string,
  sessionId: string,
  role: string,
  content: string
): Promise<any> {
  return prisma.message.create({
    data: { customerId, sessionId, role, content },
  });
}

export async function getOrCreateSession(customerId: string): Promise<string> {
  // Find most recent message for this customer
  const last = await prisma.message.findFirst({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });

  // If last message > 30 min old, create new session
  if (
    !last ||
    new Date().getTime() - new Date(last.createdAt).getTime() >
      30 * 60 * 1000
  ) {
    return `session_${Date.now()}`;
  }
  
  // Reuse existing session ID from last message
  return last.sessionId;
}
