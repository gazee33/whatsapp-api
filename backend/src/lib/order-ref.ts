import { prisma } from '../lib/prisma.js';

export async function generateOrderReferenceId(businessId: string): Promise<string> {
  const prefix = 'ORD';
  
  // Get the latest order for this business to determine the next sequence number
  const latestOrder = await prisma.order.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    select: { referenceId: true },
  });

  let nextNumber = 1;
  if (latestOrder?.referenceId) {
    // Extract number from "ORD-001234" format
    const numPart = latestOrder.referenceId.split('-')[1];
    if (numPart) {
      nextNumber = parseInt(numPart, 10) + 1;
    }
  }

  // Format as ORD-001234 (zero-padded 6 digits)
  const referenceId = `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
  
  return referenceId;
}