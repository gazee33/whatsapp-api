import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { handleAddToCart } from '../../src/tools/add-to-cart.js';
import { emptyCartState, saveCartState, getCartState } from '../../src/services/ai-engine/cart-state.js';
import type { CartState } from '../../src/services/ai-engine/cart-state.js';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});

describe('handleAddToCart', () => {
  let businessId: string;
  let customerId: string;
  let categoryId: string;
  let menuItemId: string;

  beforeAll(async () => {
    const business = await testPrisma.business.create({
      data: {
        name: 'Test Restaurant ATC',
        apiKey: 'test-atc-key',
        whatsappPhoneNumberId: 'test-atc-phone-id',
      },
    });
    businessId = business.id;

    const category = await testPrisma.menuCategory.create({
      data: {
        businessId,
        name: 'Main Dishes',
        nameAr: 'أطباق رئيسية',
        sortOrder: 0,
      },
    });
    categoryId = category.id;

    const menuItem = await testPrisma.menuItem.create({
      data: {
        categoryId,
        name: 'Shawarma Chicken',
        nameAr: 'شاورما دجاج',
        description: 'Chicken shawarma with garlic sauce',
        price: 25.00,
        available: true,
      },
    });
    menuItemId = menuItem.id;

    await testPrisma.option.create({
      data: {
        itemId: menuItem.id,
        name: 'Large',
        price: 5.00,
      },
    });
    await testPrisma.option.create({
      data: {
        itemId: menuItem.id,
        name: 'Medium',
        price: 0,
      },
    });
    await testPrisma.option.create({
      data: {
        itemId: menuItem.id,
        name: 'Small',
        price: 0,
      },
    });

    // Item without options for basic add tests
    await testPrisma.menuItem.create({
      data: {
        categoryId,
        name: 'French Fries',
        nameAr: 'بطاطس مقلية',
        description: 'Crispy golden fries',
        price: 10.00,
        available: true,
      },
    });

    const customer = await testPrisma.customer.create({
      data: {
        businessId,
        phone: '+966599999002',
        name: 'Test Customer ATC',
      },
    });
    customerId = customer.id;
  });

  afterEach(async () => {
    if (!customerId) return;
    await testPrisma.customer.update({
      where: { id: customerId },
      data: { cartState: null },
    });
  });

  afterAll(async () => {
    if (!customerId) return;
    await testPrisma.business.delete({ where: { id: businessId } }).catch(() => {});
    await testPrisma.$disconnect();
  });

  it('rejects invalid params (missing name)', async () => {
    const cart = emptyCartState();
    const result = await handleAddToCart(businessId, customerId, {} as any, cart);
    expect(result.success).toBe(false);
    expect(result.result).toContain('provide a valid item name');
  });

  it('rejects invalid params (zero quantity)', async () => {
    const cart = emptyCartState();
    const result = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 0 }, cart);
    expect(result.success).toBe(false);
    expect(result.result).toContain('provide a valid item name');
  });

  it('rejects item not found on menu', async () => {
    const cart = emptyCartState();
    const result = await handleAddToCart(businessId, customerId, { name: 'Nonexistent Item', quantity: 1 }, cart);
    expect(result.success).toBe(false);
    expect(result.result).toContain('Could not find');
  });

  it('adds an item to empty cart', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const result = await handleAddToCart(businessId, customerId, { name: 'French Fries', quantity: 2 }, cart);
    expect(result.success).toBe(true);
    expect(result.result).toContain('Added 2x French Fries');
    expect(result.cartState.items).toHaveLength(1);
    expect(result.cartState.items[0].name).toBe('French Fries');
    expect(result.cartState.items[0].quantity).toBe(2);
    expect(result.cartState.items[0].unitPrice).toBe(10);
    expect(result.cartState.mode).toBe('cart_review');
  });

  it('requires option when item has options', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const result = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 1 }, cart);
    expect(result.success).toBe(false);
    expect(result.result).toContain('options');
    expect(result.result).toContain('Large');
    expect(result.result).toContain('Medium');
    expect(result.result).toContain('Small');
  });

  it('adds item with valid option', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const result = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 1, optionName: 'Large' }, cart);
    expect(result.success).toBe(true);
    expect(result.result).toContain('Large');
    expect(result.result).toContain('Added');
    expect(result.cartState.items).toHaveLength(1);
    expect(result.cartState.items[0].optionName).toBe('Large');
    expect(result.cartState.items[0].optionPrice).toBe(5);
  });

  it('rejects invalid option name', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const result = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 1, optionName: 'Extra Large' }, cart);
    expect(result.success).toBe(false);
    expect(result.result).toContain('Extra Large');
    expect(result.result).toContain('Available');
  });

  it('merges duplicate items by incrementing quantity', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const first = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 1, optionName: 'Large' }, cart);
    expect(first.success).toBe(true);

    const second = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 2, optionName: 'Large' }, first.cartState);
    expect(second.success).toBe(true);
    expect(second.cartState.items).toHaveLength(1);
    expect(second.cartState.items[0].quantity).toBe(3);
    expect(second.result).toContain('3 total units');
  });

  it('persists cart to database', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'ar' };
    const result = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 3, optionName: 'Medium' }, cart);
    expect(result.success).toBe(true);

    const saved = await getCartState(customerId);
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].name).toBe('Shawarma Chicken');
    expect(saved.items[0].quantity).toBe(3);
    expect(saved.items[0].optionName).toBe('Medium');
  });

  it('adds separate entries for different options', async () => {
    const cart: CartState = { ...emptyCartState(), language: 'en' };
    const first = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 1, optionName: 'Large' }, cart);
    const second = await handleAddToCart(businessId, customerId, { name: 'Shawarma Chicken', quantity: 2, optionName: 'Small' }, first.cartState);
    expect(second.cartState.items).toHaveLength(2);
    expect(second.cartState.items[0].optionName).toBe('Large');
    expect(second.cartState.items[1].optionName).toBe('Small');
    expect(second.cartState.items[0].quantity).toBe(1);
    expect(second.cartState.items[1].quantity).toBe(2);
  });
});
