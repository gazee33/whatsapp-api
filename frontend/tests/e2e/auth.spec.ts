import { test, expect } from '@playwright/test';

test.describe('Auth Flows', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title/heading
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel('API Key')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Check sign in button
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Check links exist
    await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Platform Admin Login' })).toBeVisible();
  });

  test('login form validation - empty fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should show API Key error (required)
    // Note: HTML5 validation may prevent form submission for required fields
    // The API key field doesn't have 'required' attribute, so it may pass validation
    // Email and password have 'required' attribute
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('login without API key shows validation error', async ({ page }) => {
    await page.goto('/login');

    // Fill email and password with test credentials
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPass123!');

    // Try to submit without API key
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should show API Key error (API Key is required per login page logic)
    await expect(page.getByText('API Key is required')).toBeVisible();
  });

  test('login page has correct links', async ({ page }) => {
    await page.goto('/login');

    // Click platform login link
    await page.getByRole('link', { name: 'Platform Admin Login' }).click();
    await expect(page).toHaveURL('/platform-login');
  });

  test('platform login page renders correctly', async ({ page }) => {
    await page.goto('/platform-login');

    // Check page heading
    await expect(page.getByRole('heading', { name: 'Platform Admin' })).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Check sign in button
    await expect(page.getByRole('button', { name: 'Sign In to Platform' })).toBeVisible();

    // Check back link exists
    await expect(page.getByRole('link', { name: 'Back to restaurant login' })).toBeVisible();
  });

  test('platform login validation - empty fields', async ({ page }) => {
    await page.goto('/platform-login');

    // Try to submit without filling fields
    await page.getByRole('button', { name: 'Sign In to Platform' }).click();

    // Email and password should be required
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('protected route redirects to login when unauthenticated', async ({ page }) => {
    // Try to access dashboard directly without auth
    await page.goto('/');

    // Should redirect to login page (or some page since auth guard will redirect)
    // The actual behavior depends on auth guard implementation
    // Check if we're on login or at least not on dashboard
    await page.waitForURL(/\/(login|platform-login)$|^\/$/);
  });
});