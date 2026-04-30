import { test, expect } from '@playwright/test';

test.describe('Frontend Stability Audit', () => {
  test('Login and crawl modules for ReferenceErrors', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`[PAGE ERROR] ${err.message}`);
    });

    // 1. Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'hansel@zenvix.id');
    await page.fill('input[type="password"]', 'hansel8891');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/core/dashboard', { timeout: 15000 });
    console.log('Logged in successfully');

    const modules = [
      '/core/hr',
      '/core/finance',
      '/core/it',
      '/core/audit',
      '/core/workflow',
      '/core/procurement',
      '/core/inventory',
      '/core/marketing',
      '/core/sales',
      '/core/settings/integrations'
    ];

    for (const route of modules) {
      console.log(`Auditing route: ${route}`);
      try {
        await page.goto(`${route}`, { waitUntil: 'networkidle', timeout: 10000 });
        
        // Check if page is blank (e.g., no root element content or specific layout elements)
        const content = await page.content();
        if (content.length < 500) {
          errors.push(`[BLANK SCREEN] Route ${route} seems empty.`);
        }

        // Wait a bit for any lazy-loaded crashes
        await page.waitForTimeout(2000);
      } catch (e) {
        errors.push(`[NAVIGATION FAILED] Route ${route}: ${e.message}`);
      }
    }

    console.log('--- AUDIT RESULTS ---');
    if (errors.length === 0) {
      console.log('No errors detected.');
    } else {
      errors.forEach(err => console.error(err));
    }
  });
});
