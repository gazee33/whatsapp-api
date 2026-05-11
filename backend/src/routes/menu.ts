import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';
import { analyzeMenuImage } from '../services/menu-vision.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

// POST /api/menu/scan - Analyze menu image with AI vision
router.post('/scan', memoryUpload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const menu = await analyzeMenuImage(req.file.buffer, req.file.mimetype);
    res.json(menu);
  } catch (error) {
    console.error('Menu scan error:', error);
    res.status(500).json({ error: 'Failed to analyze menu image' });
  }
});

// POST /api/menu/bulk - Create full menu structure in one transaction
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories must be an array' });
    }

    let categoriesCreated = 0;
    let itemsCreated = 0;
    let optionsCreated = 0;

    for (const cat of categories) {
      if (!cat.name || !cat.name.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const cat of categories) {
        const category = await tx.menuCategory.create({
          data: {
            businessId,
            name: cat.name,
            nameAr: cat.nameAr,
          },
        });
        categoriesCreated++;

        if (Array.isArray(cat.items)) {
          for (const item of cat.items) {
            if (!item.name || !item.name.trim()) {
              throw new Error(`Item name required in category "${cat.name}"`);
            }
            const basePrice = item.basePrice != null ? Number(item.basePrice) : null;
            if (basePrice !== null && (isNaN(basePrice) || basePrice < 0)) {
              throw new Error(`Invalid price for item "${item.name}" in category "${cat.name}"`);
            }

            const hasOptions = Array.isArray(item.options) && item.options.length > 0;
            const menuItem = await tx.menuItem.create({
              data: {
                name: item.name,
                nameAr: item.nameAr,
                description: item.description,
                basePrice,
                hasOptions,
                categoryId: category.id,
              },
            });
            itemsCreated++;

            if (Array.isArray(item.options)) {
              for (const opt of item.options) {
                await tx.option.create({
                  data: {
                    name: opt.name || 'Option',
                    price: Number(opt.price) || 0,
                    itemId: menuItem.id,
                  },
                });
                optionsCreated++;
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      categoriesCreated,
      itemsCreated,
      optionsCreated,
    });
  } catch (error) {
    console.error('Menu bulk create error:', error);
    res.status(500).json({ error: 'Failed to create menu structure' });
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
router.post('/items', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const { name, nameAr, description, price, categoryId, available } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Validate price (optional — null means item is priced via options)
    const basePrice = price !== undefined && price !== '' && price !== null ? Number(price) : null;
    if (basePrice !== null && (isNaN(basePrice) || basePrice < 0)) {
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
        basePrice,
        hasOptions: false,
        categoryId: categoryId as string,
        available: available !== undefined ? available === 'true' || available === true : true,
        image: req.file ? '/uploads/' + req.file.filename : null,
      }
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT /api/menu/items/:id - Update menu item
router.put('/items/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as any).business.id;
    const id = req.params.id as string;
    const { name, nameAr, description, price, categoryId, available, clearImage } = req.body;
    
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (categoryId !== undefined && !categoryId.trim()) {
      return res.status(400).json({ error: 'Category cannot be empty' });
    }

    // Validate price if provided
    const basePrice = price !== undefined && price !== '' && price !== null ? Number(price) : null;
    if (basePrice !== null && (isNaN(basePrice) || basePrice < 0)) {
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
        basePrice: price !== undefined ? basePrice : undefined,
        categoryId: categoryId as string | undefined,
        available: available !== undefined ? available === 'true' || available === true : undefined,
        image: req.file
          ? '/uploads/' + req.file.filename
          : clearImage === 'true'
            ? null
            : undefined,
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

    await prisma.menuItem.update({
      where: { id },
      data: { hasOptions: true },
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

    const { itemId } = option;

    await prisma.option.delete({ where: { id } });

    const remaining = await prisma.option.count({ where: { itemId } });
    if (remaining === 0) {
      await prisma.menuItem.update({
        where: { id: itemId },
        data: { hasOptions: false },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete option error:', error);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

// Multer file upload error handler
router.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
