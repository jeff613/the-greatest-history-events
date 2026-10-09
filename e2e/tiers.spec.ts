import { expect, test } from '@playwright/test';

test('zoom reveals successive tiers while retaining highlights and period context', async ({ page }) => {
  await page.goto('/?year=1660');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const highlight = page.locator('[data-entry="peace-westphalia"]');
  const major = page.locator('[data-entry="leeuwenhoek-microbes"]');
  const detail = page.locator('[data-entry="royal-society-founded"]');
  const period = page.locator('[data-entry="scientific-revolution"]');
  await expect(highlight).toHaveCount(1);
  await expect(major).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(period).toHaveCount(1);
  for (let i = 0; i < 2; i++) await page.getByRole('group', { name: 'Timeline zoom' }).getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(highlight).toHaveCount(1);
  await expect(major).toHaveCount(1);
  await expect(detail).toHaveCount(0);
  for (let i = 0; i < 3; i++) await page.getByRole('group', { name: 'Timeline zoom' }).getByRole('button', { name: 'Zoom in', exact: true }).click();
  for (const entry of [highlight, major, detail, period]) await expect(entry).toHaveCount(1);
  for (let i = 0; i < 8; i++) await page.getByRole('group', { name: 'Timeline zoom' }).getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(major).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(highlight).toHaveCount(1);
});

test('a selected detailed event survives zooming out, but respects type and region filters', async ({ page }) => {
  await page.goto('/?year=1660&zoom=20&item=royal-society-founded');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const marker = page.locator('[data-entry="royal-society-founded"]');
  for (let i = 0; i < 8; i++) await page.getByRole('group', { name: 'Timeline zoom' }).getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(marker).toHaveCount(1);
  await expect(marker.locator('text')).toContainText('Royal Society founded');
  const types = page.getByRole('group', { name: 'Timeline types' });
  await types.getByRole('button', { name: 'Moments', exact: true }).click();
  await expect(marker).toHaveCount(0);
  await types.getByRole('button', { name: 'Moments', exact: true }).click();
  await expect(marker).toHaveCount(1);
  await page.getByRole('button', { name: 'Europe', exact: true }).click();
  await expect(marker).toHaveCount(0);
});

test('zoom reveals detailed events in Chinese on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?year=1660');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  const detail = page.locator('[data-entry="royal-society-founded"]');
  await expect(detail).toHaveCount(0);
  for (let i = 0; i < 5; i++) await page.getByRole('group', { name: '时间轴缩放' }).getByRole('button', { name: '放大', exact: true }).click();
  await expect(detail).toHaveCount(1);
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(widths[0]).toBe(widths[1]);
});
