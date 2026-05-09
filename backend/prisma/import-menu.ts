import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE = 'http://alsultanonline.com/backend3/admin/index.php/rest/products/get';
const API_KEY = 'U92g9TtSJBKwzg92yBSq';
const IMAGE_BASE = 'http://alsultanonline.com/backend3/uploads/';
const DEMO_API_KEY = 'demo-api-key-123';

// ─── Types for the API response ────────────────────────────────────────────────

interface ApiCustomizationDetail {
  id: string;
  name: string;
  additional_price: string;
  is_empty_object?: string;
}

interface ApiCustomizedHeader {
  id: string;
  name: string;
  is_empty_object?: string;
  customized_detail: ApiCustomizationDetail[];
}

interface ApiAddon {
  id: string;
  name: string;
  price: string;
  is_empty_object?: string;
}

interface ApiProduct {
  id: string;
  name: string;
  description?: string;
  unit_price: string;
  is_available: string;
  category: {
    id: string;
    name: string;
  };
  sub_category: {
    id: string;
    name: string;
  };
  default_photo?: {
    img_path?: string;
  };
  customized_header: ApiCustomizedHeader[];
  addon: ApiAddon[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── API Fetch ──────────────────────────────────────────────────────────────

async function fetchPage(limit: number, offset: number): Promise<ApiProduct[]> {
  const url = `${API_BASE}?limit=${limit}&offset=${offset}&api_key=${API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchAllProducts(): Promise<ApiProduct[]> {
  const allProducts: ApiProduct[] = [];
  const limit = 20;
  let offset = 0;

  while (true) {
    console.log(`Fetching: offset=${offset}, limit=${limit}...`);
    const batch = await fetchPage(limit, offset);

    if (batch.length === 0) break;

    allProducts.push(...batch);
    offset += limit;

    if (batch.length < limit) break;
  }

  return allProducts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting menu import...');

  // 1. Find the demo business
  const business = await prisma.business.findUnique({
    where: { apiKey: DEMO_API_KEY },
  });

  if (!business) {
    throw new Error(`Business with apiKey "${DEMO_API_KEY}" not found. Run the seed first: npx prisma db seed`);
  }

  console.log(`Business found: ${business.name} (id: ${business.id})`);

  // 2. Fetch all products (paginated)
  const products = await fetchAllProducts();
  console.log(`Fetched ${products.length} products from API`);

  // 3. Process each product
  let categoriesCreated = 0;
  let categoriesFound = 0;
  let itemsCreated = 0;
  let itemsFound = 0;
  let optionsCreated = 0;
  let optionsFound = 0;
  let skipped = 0;

  for (const product of products) {
    // Skip unavailable products
    if (product.is_available !== '1') {
      skipped++;
      continue;
    }

    const categoryName = product.category.name || 'Uncategorized';
    const unitPrice = parseFloat(product.unit_price) || 0;
    const imagePath = buildImageUrl(product.default_photo?.img_path);

    // ── Category: find or create ──────────────────────────────────────────

    let category = await prisma.menuCategory.findFirst({
      where: { businessId: business.id, name: categoryName },
    });

    if (category) {
      categoriesFound++;
    } else {
      category = await prisma.menuCategory.create({
        data: {
          businessId: business.id,
          name: categoryName,
          nameAr: categoryName,
          sortOrder: 0,
        },
      });
      categoriesCreated++;
    }

    // ── MenuItem: find or create ──────────────────────────────────────────

    let menuItem = await prisma.menuItem.findFirst({
      where: { categoryId: category.id, name: product.name },
    });

    if (menuItem) {
      // Update existing item (price, availability, etc.)
      menuItem = await prisma.menuItem.update({
        where: { id: menuItem.id },
        data: {
          description: product.description || null,
          price: unitPrice,
          image: imagePath,
          available: true,
        },
      });
      itemsFound++;
    } else {
      menuItem = await prisma.menuItem.create({
        data: {
          name: product.name,
          nameAr: product.name,
          description: product.description || null,
          price: unitPrice,
          available: true,
          image: imagePath,
          categoryId: category.id,
        },
      });
      itemsCreated++;
    }

    // ── Options: import customized_header details ─────────────────────────

    const headers = product.customized_header?.filter(
      (h) => h.id && h.id !== '' && !isEmpty(h)
    ) || [];

    for (const apiHeader of headers) {
      const details = apiHeader.customized_detail?.filter(
        (d) => d.id && d.id !== '' && !isEmpty(d)
      ) || [];

      for (const apiDetail of details) {
        if (!apiDetail.name) continue;

        const detailPrice = parseFloat(apiDetail.additional_price) || 0;

        const existingOption = await prisma.option.findFirst({
          where: { itemId: menuItem.id, name: apiDetail.name },
        });

        if (existingOption) {
          if (existingOption.price !== detailPrice) {
            await prisma.option.update({
              where: { id: existingOption.id },
              data: { price: detailPrice },
            });
          }
          optionsFound++;
        } else {
          await prisma.option.create({
            data: {
              itemId: menuItem.id,
              name: apiDetail.name,
              price: detailPrice,
            },
          });
          optionsCreated++;
        }
      }
    }

    // ── Options: import addons ────────────────────────────────────────────

    const addons = product.addon?.filter(
      (a) => a.id && a.id !== '' && !isEmpty(a)
    ) || [];

    for (const addon of addons) {
      if (!addon.name) continue;

      const addonPrice = parseFloat(addon.price) || 0;

      const existingOption = await prisma.option.findFirst({
        where: { itemId: menuItem.id, name: addon.name },
      });

      if (existingOption) {
        if (existingOption.price !== addonPrice) {
          await prisma.option.update({
            where: { id: existingOption.id },
            data: { price: addonPrice },
          });
        }
        optionsFound++;
      } else {
        await prisma.option.create({
          data: {
            itemId: menuItem.id,
            name: addon.name,
            price: addonPrice,
          },
        });
        optionsCreated++;
      }
    }
  }

  // 4. Output summary
  const uniqueCategories = new Set(
    products
      .filter((p) => p.is_available === '1')
      .map((p) => p.category.name)
  ).size;

  console.log('\n=== Import Complete ===');
  console.log(`Total products fetched: ${products.length}`);
  console.log(`Skipped (unavailable):   ${skipped}`);
  console.log(`Unique categories:       ${uniqueCategories}`);
  console.log(`  Categories: ${categoriesCreated} created, ${categoriesFound} existing`);
  console.log(`  Menu items: ${itemsCreated} created, ${itemsFound} updated`);
  console.log(`  Options:    ${optionsCreated} created, ${optionsFound} existing`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
