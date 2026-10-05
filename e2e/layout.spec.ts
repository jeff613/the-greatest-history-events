import { expect, test } from '@playwright/test';

test.describe('on a phone-sized viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the page fits the viewport width', async ({ page }) => {
    await page.goto('/?year=-44');
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
    const heading = page.getByRole('heading', { level: 2, name: 'Around 44 BC' });
    await expect(heading).toBeVisible();
    const sheet = (await page.locator('.panel-area').boundingBox())!;
    const box = (await heading.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(sheet.y + sheet.height);
  });

  test('About opens at its top even though it is taller than the screen', async ({ page }) => {
    await page.goto('/?year=-44');
    await page.getByRole('button', { name: 'About' }).click();
    const dialog = page.getByRole('dialog', { name: 'About The Greatest History' });
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(dialog.getByRole('heading', { name: 'About The Greatest History' })).toBeInViewport();
  });
});
