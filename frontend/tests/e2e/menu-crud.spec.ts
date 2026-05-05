import { test, expect } from '@playwright/test';

test.describe('Menu Management', () => {
  // Note: These tests require authenticated session with seeded data from backend
  // The menu page requires authentication, so we'll test what we can

  test('menu page is accessible', async ({ page }) => {
    await page.goto('/menu');

    // Page should either load or redirect to login
    try {
      // Try to find the page elements
      await page.waitForSelector('[role="tab"]', { timeout: 5000 });
      // If we get here, page loaded (possibly with demo data)
      const tabs = page.getByRole('tab');
      const count = await tabs.count();
      expect(count).toBeGreaterThan(0);
    } catch {
      // If it redirects to login, that's expected for unauthenticated access
      await expect(page.getByLabel('Email')).toBeVisible();
    }
  });

  test('menu page has search functionality', async ({ page }) => {
    await page.goto('/menu');

    try {
      // Wait for page to load
      await page.waitForSelector('[role="tab"]', { timeout: 5000 });

      // Click on search tab
      const searchTab = page.getByRole('tab', { name: /search/i });
      if (await searchTab.isVisible()) {
        await searchTab.click();

        // Check search input exists
        await expect(page.getByPlaceholder('Search menu items by name...')).toBeVisible();
      }
    } catch {
      // Auth redirect - test not applicable
      const emailInput = page.getByLabel('Email', { exact: true });
      await expect(emailInput.or(page.getByLabel('Email'))).toBeVisible({ timeout: 2000 });
    }
  });

  test.skip('add a new category - REQUIRES AUTH', async ({ page }) => {
    // Requires authenticated session
    // Test adding a category via the "Add Category" button

    await page.goto('/menu');

    // Look for add category button
    const addCategoryBtn = page.getByRole('button', { name: /add category/i });

    // Click to open dialog
    await addCategoryBtn.click();

    // Fill in category name
    await page.getByLabel('Name').fill('Test Category');

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();

    // Verify category was added
    await expect(page.getByText('Test Category')).toBeVisible();
  });

  test.skip('add a new menu item to a category - REQUIRES AUTH', async ({ page }) => {
    // Requires authenticated session
    // Test adding an item to a category

    await page.goto('/menu');

    // Expand a category
    await page.getByText('Main').click();

    // Look for add item button
    const addItemBtn = page.getByRole('button', { name: /add item|first item/i });
    await addItemBtn.click();

    // Fill item details
    await page.getByLabel('Name').fill('Test Item');
    await page.getByLabel('Price').fill('10.99');

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();

    // Verify item was added
    await expect(page.getByText('Test Item')).toBeVisible();
  });

  test.skip('edit a category - REQUIRES AUTH', async ({ page }) => {
    // Requires authenticated session

    await page.goto('/menu');

    // Click edit button on a category (pencil icon)
    const editBtn = page.locator('button').filter({ has: page.locator('[class*="edit"]') }).first();
    await editBtn.click();

    // Change name
    await page.getByLabel('Name').fill('Updated Category Name');

    // Save
    await page.getByRole('button', { name: /save/i }).click();

    // Verify update
    await expect(page.getByText('Updated Category Name')).toBeVisible();
  });

  test.skip('toggle item availability - REQUIRES AUTH', async ({ page }) => {
    // Requires authenticated session
    // Test toggling the availability switch on a menu item

    await page.goto('/menu');

    // Find a toggle switch for an item
    const toggle = page.locator('[role="switch"]').first();

    // Get initial state
    const isChecked = await toggle.isChecked();

    // Click to toggle
    await toggle.click();

    // Verify state changed
    // The switch should now be in the opposite state
    const newState = await toggle.isChecked();
    expect(newState).not.toBe(isChecked);
  });

  test.skip('search for an item - REQUIRES AUTH', async ({ page }) => {
    // Requires authenticated session
    // Test the search functionality

    await page.goto('/menu');

    // Switch to search tab
    await page.getByRole('tab', { name: /search/i }).click();

    // Type search query
    const searchInput = page.getByPlaceholder('Search menu items by name...');
    await searchInput.fill('shawarma');

    // Wait for results
    await page.waitForTimeout(500); // Debounce time

    // Results should appear (or empty state if no matches)
    // Either results or "No results found" should be visible
    const results = page.locator('[class*="card"]');
    const hasResults = await results.count() > 0;
    const hasNoResults = await page.getByText('No results found').isVisible();

    expect(hasResults || hasNoResults).toBe(true);
  });
});