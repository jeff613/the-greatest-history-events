import { expect, test } from '@playwright/test';

test('the atlas shows historical borders without an information overlay', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', 'world_bc100.geojson');
  await expect(page.locator('.map-context')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Historical borders', exact: true })).toHaveCount(0);
  const band = await page.locator('[data-entry="han"] rect').boundingBox();
  expect(band!.height).toBeGreaterThanOrEqual(24);
});


test('an empire that falls between the source snapshots still has its own borders', async ({ page }) => {
  await page.goto('/?year=-210&zoom=20');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('map')).toHaveAttribute('data-borders', /210/);
  const qin = page.locator('[data-entry="qin"]');
  await qin.scrollIntoViewIfNeeded();
  await qin.click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('strip-year')).toHaveText('221 BC');
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'qin');
});

test('China remains discoverable and selecting Han highlights its land', async ({ page }) => {
  await page.goto('/?year=-44&zoom=4');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('button', { name: 'China & East Asia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const han = page.locator('[data-entry="han"]');
  await han.scrollIntoViewIfNeeded();
  await expect(han).toBeInViewport();
  await han.click();
  await expect(han).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page.getByTestId('map')).toHaveAttribute('data-territory', 'han');
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(axis.x + axis.width / 2, axis.y + 8);
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-territory');
  await expect(han).toHaveAttribute('aria-pressed', 'false');
});
