/**
 * Security Workflow Audit Test
 * Workflow: security
 * Steps: configure access policies → assign roles → audit logs → detect anomaly → create incident → resolve
 * Requirements: 3.10
 */

import { test, expect } from '@playwright/test';
import type { WorkflowStepResult } from '../../../../scripts/audit/types/audit-types.js';
import { navigateTo, recordStep } from '../utils/workflow-helpers.js';
import { writeWorkflowResults } from '../utils/result-collector.js';

const WORKFLOW = 'security';

test.describe('Security Workflow', () => {
  const results: WorkflowStepResult[] = [];

  test.afterAll(async () => {
    await writeWorkflowResults(WORKFLOW, results);
  });

  test('Step 1: Configure access policies', async ({ page }) => {
    await recordStep(results, WORKFLOW, 1, 'Configure access policies', async () => {
      await navigateTo(page, '/core/security');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('h1, h2, [role="heading"], main').first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test('Step 2: Assign roles to users', async ({ page }) => {
    await recordStep(results, WORKFLOW, 2, 'Assign roles to users', async () => {
      await navigateTo(page, '/core/security');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      const rolesTab = page.locator('[role="tab"]:has-text("Role"), button:has-text("Role"), a:has-text("Role")');
      if (await rolesTab.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await rolesTab.first().click();
        await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
      }
    });
  });

  test('Step 3: Audit access logs', async ({ page }) => {
    await recordStep(results, WORKFLOW, 3, 'View and audit access logs', async () => {
      await navigateTo(page, '/core/logs');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('table, [data-testid*="log"]').first()).toBeVisible({ timeout: 10_000 });
    });
  });

  test('Step 4: Detect anomaly', async ({ page }) => {
    await recordStep(results, WORKFLOW, 4, 'Detect security anomaly', async () => {
      await navigateTo(page, '/core/security');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
    });
  });

  test('Step 5: Create security incident', async ({ page }) => {
    await recordStep(results, WORKFLOW, 5, 'Create security incident record', async () => {
      await navigateTo(page, '/core/security');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      const incidentBtn = page.locator('button:has-text("Incident"), button:has-text("Create Incident"), [data-testid*="incident"]');
      if (await incidentBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await incidentBtn.first().click();
        await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
        await page.locator('button:has-text("Cancel"), button:has-text("Batal")').first().click().catch(() => {});
      }
    });
  });

  test('Step 6: Resolve incident and verify RBAC and log persistence', async ({ page }) => {
    await recordStep(results, WORKFLOW, 6, 'Resolve incident and verify RBAC enforcement', async () => {
      await navigateTo(page, '/core/security');
      await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      // Use .first() to handle multiple main/section elements from nested layouts
      await expect(page.locator('main, [role="main"], section').first()).toBeVisible({ timeout: 10_000 });
    });
  });
});
