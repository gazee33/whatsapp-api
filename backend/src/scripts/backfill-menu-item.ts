import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.menuItem.findMany({
    include: { _count: { select: { options: true } } },
  });

  for (const item of items) {
    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        basePrice: item.basePrice,
        hasOptions: item._count.options > 0,
      },
    });
  }

  console.log(`Backfilled ${items.length} menu items`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
