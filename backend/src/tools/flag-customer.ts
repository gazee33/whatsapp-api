import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';

export interface FlagCustomerParams {
  reason: string;
}

export async function handleFlagCustomer(
  businessId: string,
  customerId: string,
  params: FlagCustomerParams,
): Promise<{ success: boolean; result: string }> {
  const { reason } = params;

  if (!reason || reason.trim().length === 0) {
    return { success: false, result: 'Please provide a reason for flagging this customer.' };
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { flaggedForSupport: true },
  });

  emitToBusinessRoom(businessId, 'customer-flagged', {
    customerId: customer.id,
    customerPhone: customer.phone,
    customerName: customer.name,
    reason: reason.trim(),
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    result: `This customer has been flagged for human support. Reason: ${reason.trim()}. A support agent will follow up shortly via WhatsApp.`,
  };
}
