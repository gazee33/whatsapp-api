import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';

// Use test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

// Reset database before each test
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.option.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.message.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.menuCategory.deleteMany(),
    prisma.restaurantSettings.deleteMany(),
    prisma.business.deleteMany(),
  ]);
}

// Create test business - use upsert to handle existing data
export async function createTestBusiness(data?: Partial<{
  name: string;
  whatsappPhoneNumberId: string;
  apiKey: string;
}>): Promise<any> {
  const apiKey = data?.apiKey || `test-api-key-${Date.now()}`;
  
  // Try to find first, then create or update
  const existing = await prisma.business.findFirst({
    where: { apiKey },
  });
  
  if (existing) {
    return existing;
  }
  
  return prisma.business.create({
    data: {
      name: data?.name || 'Test Restaurant',
      whatsappPhoneNumberId: data?.whatsappPhoneNumberId || 'test-phone-id',
      apiKey,
    },
  });
}

// Create test customer - use upsert to handle existing data
export async function createTestCustomer(
  businessId: string,
  data?: Partial<{ phone: string; name: string }>
): Promise<any> {
  const phone = data?.phone || '+966501234567';
  
  const existing = await prisma.customer.findFirst({
    where: { businessId, phone },
  });
  
  if (existing) {
    return existing;
  }
  
  return prisma.customer.create({
    data: {
      businessId,
      phone,
      name: data?.name || 'Test Customer',
    },
  });
}

// Create test menu category
export async function createTestCategory(
  businessId: string,
  data?: Partial<{ name: string; nameAr: string; sortOrder: number }>
): Promise<any> {
  return prisma.menuCategory.create({
    data: {
      businessId,
      name: data?.name || 'Main Dishes',
      nameAr: data?.nameAr || 'أطباق رئيسية',
      sortOrder: data?.sortOrder || 0,
    },
  });
}

// Create test menu item
export async function createTestMenuItem(
  categoryId: string,
  data?: Partial<{
    name: string;
    nameAr: string;
    description: string;
    basePrice: number;
    available: boolean;
    image: string;
  }>
): Promise<any> {
  return prisma.menuItem.create({
    data: {
      categoryId,
      name: data?.name || 'Shawarma Chicken',
      nameAr: data?.nameAr || 'شاورما دجاج',
      description: data?.description || 'Delicious chicken shawarma',
      basePrice: data?.basePrice ?? 0,
      available: data?.available ?? true,
      image: data?.image || null,
    },
  });
}

// Create test option
export async function createTestOption(
  menuItemId: string,
  data?: Partial<{ name: string; price: number }>
): Promise<any> {
  return prisma.option.create({
    data: {
      itemId: menuItemId,
      name: data?.name || 'Large',
      price: data?.price || 0,
    },
  });
}

// Create test order
export async function createTestOrder(
  businessId: string,
  customerId: string,
  data?: Partial<{
    status: string;
    totalPrice: number;
    notes: string;
  }>
): Promise<any> {
  return prisma.order.create({
    data: {
      businessId,
      customerId,
      status: data?.status || 'pending',
      totalPrice: data?.totalPrice || 50.00,
      notes: data?.notes || '',
    },
  });
}

// Create test order item
export async function createTestOrderItem(
  orderId: string,
  menuItemId: string,
  data?: Partial<{ quantity: number; notes: string; optionId: string }>
): Promise<any> {
  return prisma.orderItem.create({
    data: {
      orderId,
      menuItemId,
      quantity: data?.quantity || 1,
      notes: data?.notes || '',
      optionId: data?.optionId || null,
    },
  });
}

// Create test settings
export async function createTestSettings(
  businessId: string,
  data?: Partial<{
    name: string;
    currency: string;
    openingTime: string;
    closingTime: string;
    welcomeMsg: string;
    aiRules: string;
  }>
): Promise<any> {
  return prisma.restaurantSettings.create({
    data: {
      businessId,
      name: data?.name || 'Test Restaurant',
      currency: data?.currency || 'SAR',
      openingTime: data?.openingTime || '09:00',
      closingTime: data?.closingTime || '23:00',
      welcomeMsg: data?.welcomeMsg || 'Welcome! How can I help you today?',
      aiRules: data?.aiRules || '',
    },
  });
}

// Get fully populated test fixture with menu items
export async function createTestFixture() {
  const business = await createTestBusiness();
  const customer = await createTestCustomer(business.id);
  
  // Create categories
  const appetizers = await createTestCategory(business.id, { name: 'Appetizers', nameAr: 'مقبلات', sortOrder: 0 });
  const mainDishes = await createTestCategory(business.id, { name: 'Main Dishes', nameAr: 'أطباق رئيسية', sortOrder: 1 });
  const drinks = await createTestCategory(business.id, { name: 'Drinks', nameAr: 'مشروبات', sortOrder: 2 });
  
  // Create menu items
  const shawarmaChicken = await createTestMenuItem(mainDishes.id, {
    name: 'Shawarma Chicken',
    nameAr: 'شاورما دجاج',
    description: 'Chicken shawarma with garlic sauce',
    basePrice: 25.00,
  });
  
  const shawarmaMeat = await createTestMenuItem(mainDishes.id, {
    name: 'Shawarma Meat',
    nameAr: 'شاورما لحم',
    description: 'Beef shawarma with tahini',
    basePrice: 30.00,
  });
  
  const fries = await createTestMenuItem(appetizers.id, {
    name: 'French Fries',
    nameAr: 'بطاطس مقلية',
    description: 'Crispy golden fries',
    basePrice: 10.00,
  });
  
  const cola = await createTestMenuItem(drinks.id, {
    name: 'Coca Cola',
    nameAr: 'كوكا كولا',
    description: 'Refreshing cola beverage',
    basePrice: 5.00,
  });

  // Create options for shawarma chicken
  const largeOption = await createTestOption(shawarmaChicken.id, {
    name: 'Large',
    price: 5.00,
  });
  const mediumOption = await createTestOption(shawarmaChicken.id, {
    name: 'Medium',
    price: 0,
  });
  const smallOption = await createTestOption(shawarmaChicken.id, {
    name: 'Small',
    price: 0,
  });
  
  // Create settings
  const settings = await createTestSettings(business.id);
  
  return {
    business,
    customer,
    categories: { appetizers, mainDishes, drinks },
    menuItems: { shawarmaChicken, shawarmaMeat, fries, cola },
    options: { largeOption, mediumOption, smallOption },
    settings,
  };
}

export { prisma };