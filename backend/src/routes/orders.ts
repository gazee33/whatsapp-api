import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getOrdersByBusiness, getOrderById, updateStatus } from '../services/order.js';
const router = Router();

// GET /api/orders - List orders with optional status filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const status = req.query.status as string | undefined;
    
    const orders = await getOrdersByBusiness(businessId, status);
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get order detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    
    const order = await getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Verify order belongs to this business
    if (order.businessId !== businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { status } = req.body;

    // FIX Issue 2: Status validation before calling service
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // FIX Issue 3: Pass businessId - ownership verified in service
    const order = await updateStatus(id, status as string, businessId);

    res.json(order);
  } catch (error: any) {
    console.error('Update order status error:', error);
    if (error.message === 'Order not found or access denied') {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (error.message.startsWith('Invalid status:')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
