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

  test('the collapsed sheet shows its heading uncut', async ({ page }) => {
    await page.goto('/?year=-44');
    await page.getByRole('button', { name: 'English', exact: true }).click();
    const heading = page.getByRole('heading', { level: 2, name: 'Around 44 BC' });
    await expect(heading).toBeVisible();
    const sheet = (await page.locator('.panel-area').boundingBox())!;
    const box = (await heading.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + sheet.height);
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

  test('the sheet can be collapsed after scrolling and returns to its heading', async ({ page }) => {
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
    await expect(panel.getByRole('heading', { name: 'Around 500 BC', exact: true })).toBeInViewport();
  });
});
