import { expect, test } from '@playwright/test';

test('zoom reveals successive tiers while retaining highlights and period context', async ({ page }) => {
  await page.goto('/?year=1660');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const highlight = page.locator('[data-entry="peace-westphalia"]');
  const major = page.locator('[data-entry="leeuwenhoek-microbes"]');
  const detail = page.locator('[data-entry="royal-society-founded"]');
  const period = page.locator('[data-entry="scientific-revolution"]');
  const status = page.getByTestId('timeline-detail');
  await expect(status).toHaveText('Moments: Highlights · Zoom in for more');
  await expect(highlight).toHaveCount(1);
  await expect(major).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(period).toHaveCount(1);
  await page.getByRole('button', { name: '500 years', exact: true }).click();
  await expect(status).toHaveText('Moments: Highlights + major events · Zoom in for more');
  await expect(highlight).toHaveCount(1);
  await expect(major).toHaveCount(1);
  await expect(detail).toHaveCount(0);
  await page.getByRole('button', { name: '100 years', exact: true }).click();
  await expect(status).toHaveText('Moments: All tiers');
  for (const entry of [highlight, major, detail, period]) await expect(entry).toHaveCount(1);
  await page.getByRole('button', { name: 'All years', exact: true }).click();
  await expect(major).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(highlight).toHaveCount(1);
});

test('a selected detailed event survives zooming out, but respects type and region filters', async ({ page }) => {
  await page.goto('/?year=1660&zoom=20&item=royal-society-founded');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const marker = page.locator('[data-entry="royal-society-founded"]');
  await page.getByRole('button', { name: 'All years', exact: true }).click();
  await expect(marker).toHaveCount(1);
  await expect(marker.locator('text')).toContainText('Royal Society founded');
  const types = page.getByRole('group', { name: 'Timeline types' });
  await types.getByRole('button', { name: 'Moments', exact: true }).click();
  await expect(marker).toHaveCount(0);
  await expect(page.getByTestId('timeline-detail')).toHaveText('Moments hidden');
  await types.getByRole('button', { name: 'Moments', exact: true }).click();
  await expect(marker).toHaveCount(1);
  await page.getByRole('button', { name: 'Europe', exact: true }).click();
  await expect(marker).toHaveCount(0);
});

test('tier guidance works in Chinese on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?year=1660');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByTestId('timeline-detail')).toHaveText('事件：重要转折 · 放大查看更多');
  await page.getByRole('button', { name: '100年', exact: true }).click();
  await expect(page.getByTestId('timeline-detail')).toHaveText('事件：全部层级');
  const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(widths[0]).toBe(widths[1]);
});
