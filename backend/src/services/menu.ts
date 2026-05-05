import { prisma } from '../lib/prisma.js';

export async function getMenuByBusiness(businessId: string): Promise<any[]> {
  return prisma.menuItem.findMany({
    where: {
      category: {
        businessId,
      },
      available: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      category: {
        sortOrder: 'asc',
      },
    },
  });
}

export async function getCategoriesByBusiness(businessId: string): Promise<any[]> {
  return prisma.menuCategory.findMany({
    where: { businessId },
    orderBy: { sortOrder: 'asc' },
  });
}
