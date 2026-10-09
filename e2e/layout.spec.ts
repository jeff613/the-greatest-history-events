import { expect, test } from '@playwright/test';

test.describe('on a phone-sized viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the page fits the viewport width', async ({ page }) => {
    await page.goto('/?year=-44');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByTestId('strip-year')).toHaveText('44 BC');
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll).toBe(widths.inner);
    const about = (await page.getByRole('button', { name: 'About' }).boundingBox())!;
    expect(about.x).toBeGreaterThanOrEqual(0);
    expect(about.x + about.width).toBeLessThanOrEqual(widths.inner);
  });

  test('the drawer opens from the right without moving or covering the timeline', async ({ page }) => {
    await page.goto('/?year=-44');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    const panel = page.getByTestId('event-panel');
    await expect(panel).toBeHidden();
    const timeline = (await page.locator('.strip').boundingBox())!;
    const open = page.getByRole('button', { name: 'Expand events', exact: true });
    expect((await open.boundingBox())!.x).toBeGreaterThan(340);
    await open.click();
    await expect(panel).toBeVisible();
    await expect.poll(async () => Math.round((await panel.boundingBox())!.x + (await panel.boundingBox())!.width)).toBe(390);
    const box = (await panel.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(timeline.y);
    expect((await page.locator('.strip').boundingBox())!.y).toBe(timeline.y);
    await expect(panel.getByRole('heading', { name: 'Around 44 BC', exact: true })).toBeVisible();
  });

  test('About opens at its top even though it is taller than the screen', async ({ page }) => {
    await page.goto('/?year=-44');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'About' }).click();
    const dialog = page.getByRole('dialog', { name: 'About The Greatest History' });
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(dialog.getByRole('heading', { name: 'About The Greatest History' })).toBeInViewport();
  });

  test('the drawer can be collapsed after scrolling and reopens at its heading', async ({ page }) => {
    await page.goto('/?year=-500');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await page.getByRole('button', { name: 'Expand events', exact: true }).click();
    const panel = page.getByTestId('event-panel');
    await panel.evaluate((element) => { element.scrollTop = 300; });
    const collapse = page.getByRole('button', { name: 'Collapse events', exact: true });
    await expect(collapse).toBeInViewport();
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.click();
    await expect(page.getByRole('button', { name: 'Expand events', exact: true })).toHaveAttribute('aria-expanded', 'false');
    expect(await panel.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(panel).toBeHidden();
    await page.getByRole('button', { name: 'Expand events', exact: true }).click();
    await expect(panel.getByRole('heading', { name: 'Around 500 BC', exact: true })).toBeInViewport();
  });
});

for (const width of [320, 390]) {
  test(`mobile controls leave room for history at ${width}px in both languages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/?year=-509');
    await page.evaluate(() => document.fonts.ready);
    for (const language of ['zh', 'en']) {
      if (language === 'en') await page.getByRole('button', { name: 'English', exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      const filters = page.getByRole('button', { name: language === 'zh' ? /筛选/ : /Filters/ });
      const nav = page.locator('#timeline-filters');
      await expect(nav).toBeHidden();
      const lanes = (await page.locator('.strip-lanes').boundingBox())!;
      expect(lanes.height).toBeGreaterThan(120);
      const map = (await page.getByTestId('map').boundingBox())!;
      expect(map.height).toBeGreaterThan(220);
      await filters.click();
      await expect(nav).toBeVisible();
      const europe = nav.getByRole('button', { name: language === 'zh' ? '欧洲' : 'Europe', exact: true });
      await europe.click();
      await expect(europe).toHaveAttribute('aria-pressed', 'false');
      await europe.click();
      expect((await page.locator('.strip-lanes').boundingBox())!.height).toBe(lanes.height);
      await filters.click();
      await expect(page.locator('.map-context')).toHaveCount(0);
      await page.getByRole('group', { name: language === 'zh' ? '时间轴缩放' : 'Timeline zoom', exact: true }).getByRole('button', { name: language === 'zh' ? '放大' : 'Zoom in', exact: true }).click();
      const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, innerHeight }));
      expect(size.width).toBe(width);
      expect(size.height).toBe(size.innerHeight);
    }
  });
}

test('timeline controls share one row and collapse to filters at tablet widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  const nav = page.locator('#timeline-filters');
  const zoom = page.getByRole('group', { name: 'Timeline zoom', exact: true });
  const filter = page.getByRole('button', { name: /Filters/ });
  await expect(nav).toBeVisible();
  await expect(filter).toBeHidden();
  const navBox = (await nav.boundingBox())!;
  const zoomBox = (await zoom.boundingBox())!;
  expect(Math.abs(navBox.y + navBox.height / 2 - zoomBox.y - zoomBox.height / 2)).toBeLessThan(2);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(zoomBox.x);
  expect(await nav.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(nav).toBeHidden();
  await expect(filter).toBeVisible();
  await filter.click();
  await expect(nav).toBeVisible();
  await nav.getByRole('button', { name: 'Europe', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Europe', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('a selected card hides in the right drawer and reopens from its edge tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto('/?year=-44&item=caesar-assassination');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  const card = page.getByTestId('entry-card');
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Collapse events', exact: true }).click();
  await expect(card).toBeHidden();
  await page.getByRole('button', { name: 'Expand events', exact: true }).click();
  await expect(card).toBeVisible();
  await expect(card.getByRole('heading', { name: 'Julius Caesar assassinated', exact: true })).toBeVisible();
});
