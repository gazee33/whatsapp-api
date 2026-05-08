import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_URL = 'http://alsultanonline.com/backend3/admin/index.php/rest/products/get?limit=20&offset=0&api_key=U92g9TtSJBKwzg92yBSq';
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

  // 2. Fetch API data
  console.log(`Fetching ${API_URL}...`);
  let products: ApiProduct[];

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }

    products = (await response.json()) as ApiProduct[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch products: ${message}`);
  }

  console.log(`Fetched ${products.length} products from API`);

  // 3. Process each product
  let categoriesCreated = 0;
  let categoriesFound = 0;
  let itemsCreated = 0;
  let itemsFound = 0;
  let headersCreated = 0;
  let headersFound = 0;
  let detailsCreated = 0;
  let detailsFound = 0;

  for (const product of products) {
    const categoryName = product.category.name;
    const unitPrice = parseFloat(product.unit_price);
    const isAvailable = product.is_available === '1';
    const imagePath = product.default_photo?.img_path || null;

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
      itemsFound++;
    } else {
      menuItem = await prisma.menuItem.create({
        data: {
          name: product.name,
          nameAr: product.name,
          description: product.description || null,
          price: unitPrice,
          available: isAvailable,
          image: imagePath,
          categoryId: category.id,
        },
      });
      itemsCreated++;
    }

    // ── CustomizationHeaders & Details ────────────────────────────────────

    const headers = product.customized_header || [];

    for (const apiHeader of headers) {
      // Skip empty sentinel objects
      if (apiHeader.is_empty_object === '1') continue;

      let header = await prisma.customizationHeader.findFirst({
        where: { menuItemId: menuItem.id, name: apiHeader.name },
      });

      if (header) {
        headersFound++;
      } else {
        header = await prisma.customizationHeader.create({
          data: {
            menuItemId: menuItem.id,
            name: apiHeader.name,
            nameAr: apiHeader.name,
          },
        });
        headersCreated++;
      }

      const details = apiHeader.customized_detail || [];

      for (const apiDetail of details) {
        // Skip empty sentinel objects
        if (apiDetail.is_empty_object === '1') continue;

        const detailExists = await prisma.customizationDetail.findFirst({
          where: { headerId: header.id, name: apiDetail.name },
        });

        if (detailExists) {
          detailsFound++;
        } else {
          await prisma.customizationDetail.create({
            data: {
              headerId: header.id,
              name: apiDetail.name,
              nameAr: apiDetail.name,
              price: parseFloat(apiDetail.additional_price) || 0,
            },
          });
          detailsCreated++;
        }
      }
    }
  }

  // 4. Output summary
  const uniqueCategories = new Set(products.map((p) => p.category.name)).size;

  console.log('\n✅ Import complete!');
  console.log(`Imported ${products.length} products across ${uniqueCategories} categories`);
  console.log(`  Categories: ${categoriesCreated} created, ${categoriesFound} existing`);
  console.log(`  Menu items: ${itemsCreated} created, ${itemsFound} existing`);
  console.log(`  Customization headers: ${headersCreated} created, ${headersFound} existing`);
  console.log(`  Customization details: ${detailsCreated} created, ${detailsFound} existing`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
