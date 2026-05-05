import { Router, Request, Response } from 'express';
import { getErrorLogs, getErrorLogsByCustomer, clearErrorLogs } from '../services/error-log.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/errors', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const business = await prisma.business.findUnique({
      where: { apiKey },
    });

    if (!business) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const customerId = req.query.customerId as string | undefined;

    let errors;
    if (customerId) {
      errors = await getErrorLogsByCustomer(business.id, customerId, limit);
    } else {
      errors = await getErrorLogs(business.id, limit);
    }

    return res.json({ errors });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/errors', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const business = await prisma.business.findUnique({
      where: { apiKey },
    });

    if (!business) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    await clearErrorLogs(business.id);
    return res.json({ success: true, message: 'Error logs cleared' });
  } catch (error: any) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;