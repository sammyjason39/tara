import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('Starting Authentication Setup...');
  
  // 1. Navigate to Register
  await page.goto('/auth/register');
  
  // Generate unique details
  const timestamp = Date.now();
  const firstName = 'Test';
  const lastName = 'Admin';
  const email = `admin-${timestamp}@testzenvix.com`;
  const password = 'Password123!';
  const companyName = `Test Enterprise ${timestamp}`;

  console.log(`Registering new user: ${email}`);

  // Step 1: Personal Details
  await page.locator('input').nth(0).fill(firstName);
  await page.locator('input').nth(1).fill(lastName);
  await page.locator('input[placeholder="name@company.com"]').fill(email);
  await page.locator('input[placeholder="Min 8 characters"]').fill(password);
  await page.click('button:has-text("Continue to Organization Setup")');

  // Step 2: Organization Setup
  console.log('Entering Organization Setup...');
  await expect(page.locator('input[placeholder="Acme Corporation"]')).toBeVisible({ timeout: 10000 });
  await page.locator('input[placeholder="Acme Corporation"]').fill(companyName);
  await page.locator('textarea[placeholder="Enter full physical address"]').fill('123 Innovation Drive, Tech City');
  
  // Select Industry (First select is usually Industry)
  await page.locator('select').first().selectOption({ label: 'Retail & Merchandising' });
  
  // Select Region (Second select is usually Region)
  await page.locator('select').nth(1).selectOption({ label: 'US United States' });

  // Final Initialize
  await page.click('button:has-text("Initialize Organization Environment")');

  // 2. Verify Redirection to Dashboard
  console.log('Waiting for Dashboard initialization...');
  await expect(page).toHaveURL(/.*core\/dashboard/, { timeout: 30000 });
  
  // 3. Save Session State
  await page.context().storageState({ path: authFile });
  console.log(`Auth setup complete. Session saved to ${authFile}`);
});
