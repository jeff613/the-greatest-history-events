import { expect, test } from '@playwright/test';

test('scrubbing the timeline changes the year and the URL', async ({ page }) => {
  await page.goto('/?year=-44');
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByTestId('strip-year')).not.toHaveText('44 BC');
  await expect(page).toHaveURL(/year=(19\d\d|2000)/);
});

test('clicking an era band jumps to its start', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.locator('[data-era="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page).toHaveURL(/year=-206/);
});

test('dragging the playhead along the axis changes the year', async ({ page }) => {
  await page.goto('/?year=-44');
  const head = (await page.getByTestId('playhead').boundingBox())!;
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.move(head.x + head.width / 2, axis.y + axis.height / 2);
  await page.mouse.down();
  await page.mouse.move(head.x + head.width / 2 + 300, axis.y + axis.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId('strip-year')).not.toHaveText('44 BC');
  await expect(page).toHaveURL(/year=\d+/);
});

test('dragging across the bands pans the view without changing the year', async ({ page }) => {
  await page.goto('/?year=-44&zoom=4');
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const band = page.locator('[data-era="han"] rect');
  const before = (await band.boundingBox())!;
  const lanes = (await page.locator('.strip-lanes').boundingBox())!;
  const startX = lanes.x + lanes.width * 0.75;
  const y = before.y + before.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - 200, y, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await band.boundingBox())!.x).toBeLessThan(before.x - 100);
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
});

test('clicking an era that starts off-screen brings its start into view', async ({ page }) => {
  await page.goto('/?year=100&zoom=40');
  const band = page.locator('[data-era="han"] rect');
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  expect((await band.boundingBox())!.x).toBeLessThanOrEqual(axis.x + 1);
  await band.click({ position: { x: 20, y: 4 } });
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect.poll(async () => (await band.boundingBox())!.x).toBeGreaterThan(axis.x + 1);
});
