import { expect, test } from '@playwright/test';

test('the atlas exposes snapshot age and supports physical geography', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByText('Border snapshot: 100 BC.', { exact: false })).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Historical borders', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Geography only', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Physical geography without political boundaries.')).toBeVisible();
  await page.getByRole('button', { name: 'Geography only', exact: true }).click();
  const band = await page.locator('[data-entry="han"] rect').boundingBox();
  expect(band!.height).toBeGreaterThanOrEqual(24);
  await page.screenshot({ path: '/private/tmp/history-atlas-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/private/tmp/history-atlas-mobile.png' });
});


test('an empire that falls between the source snapshots still has its own borders', async ({ page }) => {
  await page.goto('/?year=-210&zoom=20');
  await expect(page.getByText('Border snapshot: 210 BC.', { exact: false })).toBeVisible();
  const qin = page.locator('[data-entry="qin"]');
  await qin.scrollIntoViewIfNeeded();
  await qin.click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('strip-year')).toHaveText('221 BC');
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'qin');
  await expect(page.getByText('Highlighted territory: 210 BC', { exact: false })).toBeVisible();
});

test('China remains discoverable and selecting Han highlights its land', async ({ page }) => {
  await page.goto('/?year=-44&zoom=4');
  await expect(page.getByRole('button', { name: 'China & East Asia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const han = page.locator('[data-entry="han"]');
  await han.scrollIntoViewIfNeeded();
  await expect(han).toBeInViewport();
  await han.click();
  await expect(han).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'han');
  await expect(page.getByText('Highlighted territory: 200 BC', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Historical borders', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'han');
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(axis.x + axis.width / 2, axis.y + 8);
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-territory');
  await expect(han).toHaveAttribute('aria-pressed', 'false');
});
