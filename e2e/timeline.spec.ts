import { expect, test } from '@playwright/test';

test('scrubbing the timeline changes the year and the URL', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const box = (await page.getByTestId('timeline-axis').boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(page.getByTestId('strip-year')).not.toHaveText('44 BC');
  await expect(page).toHaveURL(/year=(19\d\d|2000)/);
});

test('the playhead stays fully on screen at the last year', async ({ page }) => {
  await page.goto('/?year=2000');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const head = (await page.getByTestId('playhead').boundingBox())!;
  expect(head.x + head.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('timeline plus and minus zoom without changing the shared map year', async ({ page }) => {
  await page.goto('/?year=1950');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const zoom = page.getByRole('group', { name: 'Timeline zoom', exact: true });
  await expect(zoom.getByRole('button')).toHaveCount(2);
  await expect(zoom.getByRole('combobox')).toHaveCount(0);
  await zoom.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page).toHaveURL(/zoom=1.5/);
  await expect(page.getByTestId('strip-year')).toHaveText('1950');
  await zoom.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(page.locator('.strip-axis .tick-label').first()).toHaveText('2000 BC');
  const map = page.getByTestId('map');
  await map.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByTestId('strip-year')).not.toHaveText('1950');
  await map.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(map.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('clicking an era band jumps to its start', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.locator('[data-entry="han"] rect').click();
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect(page).toHaveURL(/year=-206/);
});

test('dragging the playhead along the axis changes the year', async ({ page }) => {
  await page.goto('/?year=-44');
  await page.getByRole('button', { name: 'English', exact: true }).click();
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
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  const band = page.locator('[data-entry="han"] rect');
  await band.scrollIntoViewIfNeeded();
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
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const band = page.locator('[data-entry="han"] rect');
  const axis = (await page.getByTestId('timeline-axis').boundingBox())!;
  expect((await band.boundingBox())!.x).toBeLessThanOrEqual(axis.x + 1);
  await band.click({ position: { x: 20, y: 4 } });
  await expect(page.getByTestId('strip-year')).toHaveText('206 BC');
  await expect.poll(async () => (await band.boundingBox())!.x).toBeGreaterThan(axis.x + 1);
});


test('wheel scrolling browses regions without zooming and buttons still zoom', async ({ page }) => {
  await page.goto('/?year=-44&zoom=4');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const lanes = page.locator('.strip-lanes');
  const box = (await lanes.boundingBox())!;
  const band = page.locator('[data-entry="roman-empire"] rect');
  const before = (await band.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 30);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => lanes.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect((await band.boundingBox())!.width).toBeCloseTo(before.width, 0);
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  await expect(page).toHaveURL(/zoom=4/);
  await page.getByRole('region', { name: 'Timeline', exact: true }).getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page).toHaveURL(/zoom=6/);
  await page.getByRole('region', { name: 'Timeline', exact: true }).getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(page).toHaveURL(/zoom=4/);
});

test('region toggles support comparisons and an empty selection', async ({ page }) => {
  await page.goto('/?year=-44&zoom=4');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const regions = page.getByRole('navigation', { name: 'Timeline regions' });
  const lanes = page.locator('.strip-lanes [data-region]');
  await expect(lanes).toHaveCount(8);
  for (const name of ['Mid. East', 'Steppe', 'S. Asia', 'SE Asia', 'Africa', 'Americas']) {
    const button = regions.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(lanes).toHaveCount(2);
  await expect(page.locator('.strip-lanes [data-region="europe"]')).toHaveCount(1);
  await expect(page.locator('.strip-lanes [data-region="east-asia"]')).toHaveCount(1);
  await expect(page.locator('[data-entry="han"]')).toHaveCount(1);
  await expect(page.locator('[data-entry="achaemenid"]')).toHaveCount(0);
  await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
  await expect(page).toHaveURL(/zoom=4/);
  await regions.getByRole('button', { name: 'Europe', exact: true }).click();
  const eastAsia = regions.getByRole('button', { name: 'China & East Asia', exact: true });
  await eastAsia.focus();
  await eastAsia.press('Space');
  await expect(lanes).toHaveCount(0);
  await expect(page.getByText('Select a region above to show its timeline.', { exact: false })).toBeVisible();
  await eastAsia.press('Space');
  await expect(eastAsia).toHaveAttribute('aria-pressed', 'true');
  await expect(lanes).toHaveCount(1);
  await expect(page.locator('[data-entry="han"]')).toHaveCount(1);
});


test('the Americas and Africa start selected and can be toggled independently', async ({ page }) => {
  await page.goto('/?year=1450&zoom=4');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const regions = page.getByRole('navigation', { name: 'Timeline regions' });
  const americas = regions.getByRole('button', { name: 'Americas', exact: true });
  const africa = regions.getByRole('button', { name: 'Africa', exact: true });
  await expect(americas).toHaveAttribute('aria-pressed', 'true');
  await expect(africa).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.strip-lanes [data-region]')).toHaveCount(8);
  await expect(page.locator('[data-entry="inca"]')).toHaveCount(1);
  await expect(page.locator('[data-entry="aztec"]')).toHaveCount(1);
  await expect(page.locator('[data-entry="mali"]')).toHaveCount(1);
  await expect(page.locator('[data-entry="ming"]')).toHaveCount(1);
  await americas.click();
  await expect(page.locator('[data-entry="inca"]')).toHaveCount(0);
  await expect(page.locator('[data-entry="mali"]')).toHaveCount(1);
  await africa.click();
  await expect(page.locator('[data-entry="mali"]')).toHaveCount(0);
  await americas.click();
  await africa.click();
  await expect(page.locator('.strip-lanes [data-region]')).toHaveCount(8);
  await expect(page.getByTestId('strip-year')).toHaveText('1450');
});

test('zoomed regions pack visible entries without reserving off-screen rows', async ({ page }) => {
  await page.goto('/?year=-300');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  for (const steps of [3, 3, -6]) {
    const zoom = page.getByRole('group', { name: 'Timeline zoom', exact: true });
    for (let i = 0; i < Math.abs(steps); i++) await zoom.getByRole('button', { name: steps > 0 ? 'Zoom in' : 'Zoom out', exact: true }).click();
    const europe = page.locator('[data-region="europe"]');
    const bars = europe.locator('.era > rect');
    expect(await bars.count()).toBeGreaterThan(0);
    const bottom = await bars.evaluateAll((rects) => Math.max(...rects.map((rect) =>
      Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')))));
    const nextRule = Number(await page.locator('[data-region="mena"] .lane-rule').getAttribute('y1'));
    expect(nextRule - bottom).toBeGreaterThan(0);
    expect(nextRule - bottom).toBeLessThanOrEqual(12);
  }
});
