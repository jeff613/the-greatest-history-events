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
});
