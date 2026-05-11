import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE = 'http://alsultanonline.com/backend3/admin/index.php/rest/products/get';
const API_KEY = 'U92g9TtSJBKwzg92yBSq';
const IMAGE_BASE = 'http://alsultanonline.com/backend3/uploads/';
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Al-Baraka Restaurant';

interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  unit_price: string;
  is_available: string;
  default_photo?: { img_path?: string };
  category?: { id: string; name: string };
  customized_header?: ApiCustomizedHeader[];
  addon?: ApiAddon[];
}

interface ApiCustomizedHeader {
  id: string;
  name: string;
  customized_detail?: ApiCustomizedDetail[];
}

interface ApiCustomizedDetail {
  id: string;
  name: string;
  additional_price: string;
}

interface ApiAddon {
  id: string;
  name: string;
  price: string;
}

function isEmpty(obj: any): boolean {
  if (!obj) return true;
  if (Array.isArray(obj)) {
    return obj.length === 0 || obj.every((item: any) => isEmpty(item));
  }
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0 || obj.is_empty_object === '1';
  }
  return false;
}

function buildImageUrl(imgPath?: string): string | null {
  if (!imgPath) return null;
  return IMAGE_BASE + encodeURI(imgPath);
}

async function fetchProducts(limit = 20, offset = 0): Promise<ApiProduct[]> {
  const url = `${API_BASE}?limit=${limit}&offset=${offset}&api_key=${API_KEY}`;
  console.log(`Fetching: offset=${offset}, limit=${limit}`);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`API responded with ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function main() {
  const business = await prisma.business.findFirst({
    where: { name: BUSINESS_NAME },
  });

  if (!business) {
    console.error(`Business "${BUSINESS_NAME}" not found. Seed the database first.`);
    process.exit(1);
  }

  console.log(`Importing for business: ${business.name} (${business.id})`);

  // Fetch all products (paginated)
  const allProducts: ApiProduct[] = [];
  let offset = 0;
  const limit = 20;

  while (true) {
    const batch = await fetchProducts(limit, offset);
    if (batch.length === 0) break;
    allProducts.push(...batch);
    offset += limit;
    if (batch.length < limit) break;
  }

  console.log(`Fetched ${allProducts.length} products from API`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of allProducts) {
    try {
      // Skip unavailable products
      if (product.is_available !== '1') {
        skipped++;
        continue;
      }

      // Find or create category
      const catName = product.category?.name || 'Uncategorized';
      let category = await prisma.menuCategory.findFirst({
        where: { businessId: business.id, name: catName },
      });

      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            businessId: business.id,
            name: catName,
            sortOrder: 0,
          },
        });
      }

      const price = parseFloat(product.unit_price) || 0;
      const imageUrl = buildImageUrl(product.default_photo?.img_path);

      // Upsert menu item (match by name within category for this business)
      const existing = await prisma.menuItem.findFirst({
        where: {
          name: product.name,
          category: { businessId: business.id },
        },
      });

      let menuItem;
      if (existing) {
        menuItem = await prisma.menuItem.update({
          where: { id: existing.id },
          data: {
            description: product.description || existing.description,
            basePrice: price || null,
            image: imageUrl,
            available: true,
            categoryId: category.id,
          },
        });
        updated++;
      } else {
        menuItem = await prisma.menuItem.create({
          data: {
            name: product.name,
            description: product.description,
            basePrice: price || null,
            image: imageUrl,
            available: true,
            categoryId: category.id,
          },
        });
        created++;
      }

      // Import customized_header as flat options (find-or-create)
      const headers = product.customized_header?.filter(
        (h) => h.id && h.id !== '' && !isEmpty(h)
      ) || [];

      for (const header of headers) {
        const details = header.customized_detail?.filter(
          (d) => d.id && d.id !== '' && !isEmpty(d)
        ) || [];

        for (const detail of details) {
          if (!detail.name) continue;
          const price = parseFloat(detail.additional_price) || 0;

          const existing = await prisma.option.findFirst({
            where: { itemId: menuItem.id, name: detail.name },
          });

          if (existing) {
            if (existing.price !== price) {
              await prisma.option.update({ where: { id: existing.id }, data: { price } });
            }
          } else {
            await prisma.option.create({
              data: { itemId: menuItem.id, name: detail.name, price },
            });
          }
        }
      }

      // Import addons as flat options (find-or-create)
      const addons = product.addon?.filter(
        (a) => a.id && a.id !== '' && !isEmpty(a)
      ) || [];

      for (const addon of addons) {
        if (!addon.name) continue;
        const price = parseFloat(addon.price) || 0;

        const existing = await prisma.option.findFirst({
          where: { itemId: menuItem.id, name: addon.name },
        });

        if (existing) {
          if (existing.price !== price) {
            await prisma.option.update({ where: { id: existing.id }, data: { price } });
          }
        } else {
          await prisma.option.create({
            data: { itemId: menuItem.id, name: addon.name, price },
          });
        }
      }
    } catch (error: any) {
      console.error(`Error importing "${product.name}":`, error.message);
    }
  }

  console.log(`\nDone: ${created} created, ${updated} updated, ${skipped} skipped`);

  // Summary
  const itemCount = await prisma.menuItem.count({
    where: { category: { businessId: business.id } },
  });
  const optionCount = await prisma.option.count({
    where: { menuItem: { category: { businessId: business.id } } },
  });

  console.log(`\nDatabase state:`);
  console.log(`  Menu Items: ${itemCount}`);
  console.log(`  Options: ${optionCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
