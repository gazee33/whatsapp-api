import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();

// GET /api/menu - List all categories with items
router.get('/', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    
    const categories = await prisma.menuCategory.findMany({
      where: { businessId },
      include: {
        items: {
          include: {
            customizationHeaders: {
              include: {
                details: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    res.json(categories);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /api/menu/search - Search menu items
router.get('/search', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const items = await prisma.menuItem.findMany({
      where: {
        category: { businessId },
        available: true,
        OR: [
          { name: { contains: query } },
          { nameAr: { contains: query } },
        ],
      },
      include: { category: true },
      take: 20,
    });
    
    res.json(items);
  } catch (error) {
    console.error('Search menu error:', error);
    res.status(500).json({ error: 'Failed to search menu' });
  }
});

// POST /api/menu/categories - Create category
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const { name, nameAr, sortOrder } = req.body;
    
    const category = await prisma.menuCategory.create({
      data: {
        businessId,
        name,
        nameAr,
        sortOrder: sortOrder || 0
      }
    });
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/menu/categories/:id - Update category
router.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, nameAr, sortOrder } = req.body;
    
    // Verify category belongs to this business
    const existing = await prisma.menuCategory.findFirst({
      where: { id, businessId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const category = await prisma.menuCategory.update({
      where: { id },
      data: { name, nameAr, sortOrder }
    });
    
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// POST /api/menu/items - Create menu item
router.post('/items', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const { name, nameAr, description, price, categoryId, available, image } = req.body;
    
    // Validate price
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Invalid price: must be a non-negative number' });
    }
    
    // Verify category belongs to this business
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId as string, businessId }
    });
    
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }
    
    const item = await prisma.menuItem.create({
      data: {
        name,
        nameAr,
        description,
        price: parseFloat(price),
        categoryId: categoryId as string,
        available: available !== undefined ? available : true,
        image: image || null,
      }
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT /api/menu/items/:id - Update menu item
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, nameAr, description, price, categoryId, available, image } = req.body;
    
    // Validate price if provided
    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ error: 'Invalid price: must be a non-negative number' });
    }
    
    // Verify item belongs to this business
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        category: { businessId }
      }
    });
    
if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    // Validate categoryId if provided
    if (categoryId) {
      const category = await prisma.menuCategory.findFirst({
        where: { id: categoryId as string, businessId }
      });
      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        nameAr,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        categoryId: categoryId as string | undefined,
        available,
        image,
      }
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/menu/items/:id - Delete menu item
router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    
    // Verify item belongs to this business
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        category: { businessId }
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    await prisma.menuItem.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// PATCH /api/menu/items/:id/toggle - Toggle item availability
router.patch('/items/:id/toggle', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    
    // Verify item belongs to this business
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        category: { businessId }
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const item = await prisma.menuItem.update({
      where: { id },
      data: { available: !existing.available }
    });
    
    res.json(item);
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: 'Failed to toggle item availability' });
  }
});

// POST /api/menu/items/:id/customization - Add customization header with details
router.post('/items/:id/customization', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, nameAr, details } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Header name is required' });
    }

    // Verify item belongs to this business
    const item = await prisma.menuItem.findFirst({
      where: { id, category: { businessId } },
    });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Create header with details in a transaction
    const header = await prisma.customizationHeader.create({
      data: {
        menuItemId: id,
        name,
        nameAr: nameAr || null,
        details: {
          create: Array.isArray(details) ? details.map((d: any) => ({
            name: d.name,
            nameAr: d.nameAr || null,
            price: parseFloat(d.price) || 0,
          })) : [],
        },
      },
      include: { details: true },
    });

    res.status(201).json(header);
  } catch (error) {
    console.error('Create customization error:', error);
    res.status(500).json({ error: 'Failed to create customization' });
  }
});

// PUT /api/menu/customization/:id - Update customization detail
router.put('/customization/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, nameAr, price } = req.body;

    // Verify detail belongs to business through the chain
    const detail = await prisma.customizationDetail.findFirst({
      where: {
        id,
        header: {
          menuItem: {
            category: { businessId },
          },
        },
      },
    });

    if (!detail) {
      return res.status(404).json({ error: 'Customization detail not found' });
    }

    const updated = await prisma.customizationDetail.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        nameAr: nameAr !== undefined ? nameAr : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update customization detail error:', error);
    res.status(500).json({ error: 'Failed to update customization detail' });
  }
});

// DELETE /api/menu/customization/:id - Delete customization detail
router.delete('/customization/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;

    // Verify detail belongs to business through the chain
    const detail = await prisma.customizationDetail.findFirst({
      where: {
        id,
        header: {
          menuItem: {
            category: { businessId },
          },
        },
      },
    });

    if (!detail) {
      return res.status(404).json({ error: 'Customization detail not found' });
    }

    await prisma.customizationDetail.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete customization detail error:', error);
    res.status(500).json({ error: 'Failed to delete customization detail' });
  }
});

export default router;
