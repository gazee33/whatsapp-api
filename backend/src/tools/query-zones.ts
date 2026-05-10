import { prisma } from '../lib/prisma.js';

export interface QueryZonesParams {
  query?: string;
}

export async function handleQueryZones(
  businessId: string,
  params: QueryZonesParams
): Promise<string> {
  const { query } = params;

  const zones = await prisma.deliveryZone.findMany({
    where: {
      businessId,
      isActive: true,
      ...(query
        ? {
            name: { contains: query },
          }
        : {}),
    },
    orderBy: { deliveryFee: 'asc' },
  });

  if (zones.length === 0) {
    return 'No delivery zones available.';
  }

  const lines = ['Available delivery zones:', ''];
  for (const zone of zones) {
    const minOrderStr = zone.minimumOrder
      ? ` (min order: ${zone.minimumOrder.toFixed(2)})`
      : '';
    lines.push(
      `- ${zone.name}: ${zone.deliveryFee.toFixed(2)} delivery fee${minOrderStr}`
    );
    if (zone.description) {
      lines.push(`  ${zone.description}`);
    }
  }

  return lines.join('\n');
}
