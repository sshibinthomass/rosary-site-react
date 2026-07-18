import { expect, test } from '@playwright/test';

test('guest completes the integrated check-first loop and keeps a photo offline', async ({ page, context }, testInfo) => {
  await page.goto('/care');
  const guestButton = page.getByRole('button', { name: "Not now, I'll browse as a guest" });
  if (await guestButton.isVisible()) await guestButton.click();

  await expect(page.getByRole('heading', { name: 'Rosary Plant House', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Plant Care sections' })).toBeVisible();
  await page.getByRole('link', { name: 'Add plant' }).click();
  await page.getByRole('textbox', { name: 'Place name' }).fill('Living room');
  await page.getByRole('textbox', { name: 'City' }).fill('Bengaluru');
  await page.getByRole('combobox', { name: 'Climate' }).selectOption('south');
  await page.getByRole('button', { name: 'Save growing place' }).click();
  await expect(page.getByRole('status')).toContainText('Living room is ready');

  await page.getByRole('textbox', { name: 'Search plants' }).fill('Aloe vera');
  const aloeRow = page.locator('.care-catalogue-row').filter({ has: page.getByRole('heading', { name: 'Aloe Vera', exact: true }) });
  await aloeRow.getByRole('button', { name: 'Add Aloe Vera' }).click();
  await expect(page.getByRole('heading', { name: 'Aloe Vera', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Open care desk' }).click();
  await expect(page.getByRole('button', { name: 'Soil is still moist' })).toBeVisible();
  await page.getByRole('button', { name: 'Soil is still moist' }).click();
  await expect(page.getByRole('status')).toContainText('Check scheduled');
  await page.reload();
  await expect(page.getByText(/next check/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soil is still moist' })).toHaveCount(0);

  const imagePath = testInfo.outputPath('plant-progress.png');
  await page.screenshot({ path: imagePath });
  await page.getByRole('link', { name: 'Journal' }).click();
  await page.getByRole('textbox', { name: 'Observation' }).fill('New leaf opening');
  await page.locator('#plant-photo').setInputFiles(imagePath);
  await page.getByRole('button', { name: 'Save photo' }).click();
  await expect(page.getByRole('status')).toContainText('saved privately');
  await expect(page.getByRole('heading', { name: 'New leaf opening' })).toBeVisible();

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'New leaf opening' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New leaf opening' })).toBeVisible();
  await context.setOffline(false);
});
