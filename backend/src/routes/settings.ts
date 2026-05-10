import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();

// GET /api/settings - Get or create default settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    
    let settings = await prisma.restaurantSettings.findUnique({
      where: { businessId }
    });
    
    if (!settings) {
      // Create default settings
      settings = await prisma.restaurantSettings.create({
        data: {
          businessId,
          name: (req as any).business.name,
          openingTime: '09:00',
          closingTime: '23:00',
          welcomeMsg: 'Welcome! How can I help you today?',
          aiRules: '',
          currency: 'SAR'
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const {
      name, openingTime, closingTime, welcomeMsg, aiRules, currency,
      address, latitude, longitude, phoneNumber,
      deliveryEnabled, dineInEnabled, pickupEnabled,
      estimatedPrepTimeMinutes, paymentMethods, isTemporarilyClosed, defaultLanguage,
    } = req.body;
    
    const settings = await prisma.restaurantSettings.upsert({
      where: { businessId },
      update: {
        name, openingTime, closingTime, welcomeMsg, aiRules, currency,
        address, latitude, longitude, phoneNumber,
        deliveryEnabled, dineInEnabled, pickupEnabled,
        estimatedPrepTimeMinutes: estimatedPrepTimeMinutes != null ? Number(estimatedPrepTimeMinutes) : undefined,
        paymentMethods,
        isTemporarilyClosed,
        defaultLanguage,
      },
      create: {
        businessId,
        name: name || (req as any).business.name,
        openingTime: openingTime || '09:00',
        closingTime: closingTime || '23:00',
        welcomeMsg: welcomeMsg || 'Welcome! How can I help you today?',
        aiRules: aiRules || '',
        currency: currency || 'SAR',
        address, latitude, longitude, phoneNumber,
        deliveryEnabled: deliveryEnabled ?? false,
        dineInEnabled: dineInEnabled ?? true,
        pickupEnabled: pickupEnabled ?? true,
        estimatedPrepTimeMinutes: estimatedPrepTimeMinutes != null ? Number(estimatedPrepTimeMinutes) : undefined,
        paymentMethods: paymentMethods || '["cash","card"]',
        isTemporarilyClosed: isTemporarilyClosed ?? false,
        defaultLanguage: defaultLanguage || 'en',
      }
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
