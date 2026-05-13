import { Router, Request, Response } from 'express';
import { createTemplate, listTemplates, getTemplate, deleteTemplate } from '../services/template-manager.js';

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).business) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const templates = await listTemplates(business.id, status);
    res.json({ templates });
  } catch (error: any) {
    console.error('[Templates] List error:', error.message);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const templateId = req.params.id as string;
    const template = await getTemplate(business.id, templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('[Templates] Get error:', error.message);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const { name, category, language, components } = req.body as {
  name: string;
  category: string;
  language: string;
  components: any[];
};

    if (!name || !category || !language) {
      return res.status(400).json({ error: 'name, category, and language are required' });
    }

    if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)) {
      return res.status(400).json({ error: 'category must be MARKETING, UTILITY, or AUTHENTICATION' });
    }

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: 'At least one component (body) is required' });
    }

    const result = await createTemplate(business.id, {
      name,
      category: category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
      language,
      components,
    });
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Templates] Create error:', error.message);
    if (error.message.includes('Meta API error')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const templateId = req.params.id as string;
    await deleteTemplate(business.id, templateId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Templates] Delete error:', error.message);
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;