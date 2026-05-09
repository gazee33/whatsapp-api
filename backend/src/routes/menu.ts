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
            options: true,
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

// POST /api/menu/items/:id/options - Add option to menu item
router.post('/items/:id/options', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, price } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Option name is required' });
    }

    // Verify item belongs to this business
    const item = await prisma.menuItem.findFirst({
      where: { id, category: { businessId } },
    });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const option = await prisma.option.create({
      data: {
        itemId: id,
        name,
        price: parseFloat(price) || 0,
      },
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('Create option error:', error);
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// PUT /api/menu/options/:id - Update option
router.put('/options/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, price } = req.body;

    // Verify option belongs to business through the chain
    const option = await prisma.option.findFirst({
      where: {
        id,
        menuItem: {
          category: { businessId },
        },
      },
    });

    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    const updated = await prisma.option.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update option error:', error);
    res.status(500).json({ error: 'Failed to update option' });
  }
});

// DELETE /api/menu/options/:id - Delete option
router.delete('/options/:id', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;

    // Verify option belongs to business through the chain
    const option = await prisma.option.findFirst({
      where: {
        id,
        menuItem: {
          category: { businessId },
        },
      },
    });

    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    await prisma.option.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete option error:', error);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

export default router;
