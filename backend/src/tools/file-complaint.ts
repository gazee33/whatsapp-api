import { prisma } from '../lib/prisma.js';
import { emitToBusinessRoom } from '../socket.js';

export interface FileComplaintParams {
  content: string;
}

export async function handleFileComplaint(
  businessId: string,
  customerId: string,
  params: FileComplaintParams
): Promise<string> {
  const { content } = params;

  if (!content || content.trim().length === 0) {
    return 'Please provide a description of your complaint.';
  }

  // Create complaint
  const complaint = await prisma.complaint.create({
    data: {
      businessId,
      customerId,
      content: content.trim(),
      status: 'open',
    },
  });

  // Get customer info for notification
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  // Emit Socket.io event
  emitToBusinessRoom(businessId, 'new-complaint', {
    complaintId: complaint.id,
    customerPhone: customer?.phone,
    content: complaint.content,
    createdAt: complaint.createdAt,
  });

  return `Thank you for your feedback. Your complaint #${complaint.id.slice(-6)} has been recorded and our team will review it shortly. We're sorry for any inconvenience and will work to improve your experience.`;
}
