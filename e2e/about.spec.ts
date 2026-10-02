import { expect, test } from '@playwright/test';

test('About explains the borders and credits the data sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'About' }).click();
  const dialog = page.getByRole('dialog', { name: 'About The Greatest History' });
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await expect(dialog).toContainText('approximate');
  await expect(dialog).toContainText('historical-basemaps');
  await expect(dialog).toContainText('GPL-3.0');
  await expect(dialog).toContainText('Natural Earth');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'About' })).toBeFocused();
});
