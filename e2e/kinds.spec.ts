import { expect, test } from '@playwright/test';

test('shape toggles independently filter states, periods and moments', async ({ page }) => {
  await page.goto('/?year=-500');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const types = page.getByRole('group', { name: 'Timeline types' });
  const states = page.locator('.era:not(.era-period)');
  const periods = page.locator('.era-period, .marker-period');
  const moments = page.locator('.marker:not(.marker-period)');
  for (const [name, entries] of [['States', states], ['Periods', periods], ['Moments', moments]] as const) {
    expect(await entries.count()).toBeGreaterThan(0);
    await types.getByRole('button', { name, exact: true }).click();
    await expect(types.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(entries).toHaveCount(0);
  }
  await expect(page.getByText('Select a type above to show states, periods or moments.')).toBeVisible();
  await types.getByRole('button', { name: 'Moments', exact: true }).click();
  expect(await moments.count()).toBeGreaterThan(0);
  await expect(states).toHaveCount(0);
  await expect(periods).toHaveCount(0);
  await types.getByRole('button', { name: 'Periods', exact: true }).click();
  expect(await periods.count()).toBeGreaterThan(0);
  await types.getByRole('button', { name: 'States', exact: true }).click();
  expect(await states.count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: '中文', exact: true }).click();
  for (const name of ['政权', '时期', '事件']) {
    await expect(page.getByRole('group', { name: '时间轴类型' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
});
