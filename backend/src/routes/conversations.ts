import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();

// GET /api/conversations - List customers with last message
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    
    // Get all customers for this business with their last message
    const customers = await prisma.customer.findMany({
      where: { businessId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      }
    });
    
    // Sort by last message time
    const sortedCustomers = customers.sort((a, b) => {
      const aLastMsg = a.messages[0]?.createdAt;
      const bLastMsg = b.messages[0]?.createdAt;
      if (!aLastMsg) return 1;
      if (!bLastMsg) return -1;
      return new Date(bLastMsg).getTime() - new Date(aLastMsg).getTime();
    });
    
    res.json(sortedCustomers);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:phone - Get full conversation history
router.get('/:phone', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const phone = req.params.phone as string;
    
    // Find customer by phone
    const customer = await prisma.customer.findFirst({
      where: { businessId, phone }
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get all messages grouped by session
    const messages = await prisma.message.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'asc' }
    });
    
    // Group by session
    const sessions: Record<string, any[]> = {};
    for (const msg of messages) {
      if (!sessions[msg.sessionId]) {
        sessions[msg.sessionId] = [];
      }
      sessions[msg.sessionId].push(msg);
    }
    
    res.json({
      customer,
      sessions
    });
  } catch (error) {
    console.error('Get conversation history error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

export default router;
